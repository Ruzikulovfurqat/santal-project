#!/usr/bin/env bash
# Серверда ягона буйруқ: ўрнатиш ҳам, янгилаш ҳам шу (README → «Сервер»).
#
# Бўш ёки эски сервер — README → «Сервер»даги бир қаторли буйруқ (GitLab токенини сўрайди,
#   /opt/santal/.env.deploy'га ёзади ва шу скриптни API орқали олиб ишга туширади).
# Кейин қўлда янгилаш:  sudo /opt/santal/santal.sh
# CI deploy job'и (gitlab-runner номидан): $SANTAL_DIR/santal.sh <commit-sha>
#
# root:   git/curl/docker/gitlab-runner'ни ўрнатади (йўқ бўлса), runner'ларни рўйхатдан
#         ўтказади, кодни GitLab'дан олади ва scripts/deploy.sh'ни ишга туширади.
# runner: фақат кодни олади ва scripts/deploy.sh.
# Токен фақат .env.deploy'да туради: git'га env орқали берилади, .git/config ва argv'га тушмайди.

GITLAB_URL=https://gitlab.com
DEFAULT_PROJECT=Ruzikulovfurqat/sandal

say()  { printf 'santal: %s\n' "$*"; }
warn() { printf 'santal: ОГОҲЛАНТИРИШ: %s\n' "$*" >&2; }
die()  { printf 'santal: ХАТО: %s\n' "$*" >&2; exit 1; }

is_root() { [ "$EUID" -eq 0 ]; }

env_get() { # env_get <key> <file>; битта қават қўштирноқ ва CR олиб ташланади
    local v
    [ -f "$2" ] || return 0
    v=$(sed -n "s/^$1=//p" "$2" | tail -n 1 | tr -d '\r')
    v=${v#[\"\']}
    printf '%s' "${v%[\"\']}"
}

git_auth() { # git_auth <git args...>; токен env'дан ўқилади, ҳеч қаерга ёзилмайди
    # shellcheck disable=SC2016
    SANTAL_GIT_TOKEN=$TOKEN git -C "$ROOT" -c credential.helper= \
        -c 'credential.helper=!f() { test "$1" = get && printf "username=oauth2\npassword=%s\n" "$SANTAL_GIT_TOKEN"; }; f' \
        "$@" </dev/null
}

api() { # api <METHOD> <path> [curl args...]; токен stdin орқали (argv'да кўринмайди)
    local method=$1 path=$2
    shift 2
    printf 'PRIVATE-TOKEN: %s\n' "$TOKEN" |
        curl -fsS -X "$method" -H @- "$GITLAB_URL/api/v4$path" "$@"
}

ensure_prereqs() {
    local pkgs=() tmp
    command -v apt-get >/dev/null || die "фақат Debian/Ubuntu қўллаб-қувватланади (apt-get йўқ)"
    command -v git >/dev/null || pkgs+=(git)
    command -v curl >/dev/null || pkgs+=(curl)
    command -v flock >/dev/null || pkgs+=(util-linux)
    command -v cron >/dev/null || pkgs+=(cron)  # R2 заҳираси (/etc/cron.d/santal-backup)
    if [ ${#pkgs[@]} -gt 0 ]; then
        say "ўрнатилмоқда: ${pkgs[*]}"
        apt-get update -qq </dev/null
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${pkgs[@]}" </dev/null
    fi
    if ! command -v docker >/dev/null; then
        say "docker ўрнатилмоқда (get.docker.com)"
        tmp=$(mktemp)
        curl -fsSL https://get.docker.com -o "$tmp"
        sh "$tmp" </dev/null
        rm -f "$tmp"
    fi
    docker compose version >/dev/null 2>&1 || die "docker compose plugin йўқ"
    git config --system --get-all safe.directory 2>/dev/null | grep -qxF "$ROOT" ||
        git config --system --add safe.directory "$ROOT"
}

sync_repo() { # sync_repo <ref> <args...>; origin/$BRANCH'ни олиб, <ref> (ёки бошини) checkout қилади
    local ref=$1 before after
    shift
    if [ ! -d "$ROOT/.git" ]; then
        git init -q "$ROOT"
        git -C "$ROOT" remote add origin "$GITLAB_URL/$PROJECT.git"
        # baza/ (юкланган файллар, data.json) — серверда жонли маълумот: git унга ҳеч қачон
        # тегмайди, фақат йўқ файллар пастда бир марта қўшилади (эски rsync --ignore-existing каби)
        git -C "$ROOT" config core.sparseCheckout true
        git -C "$ROOT" config sparse.expectFilesOutsideOfPatterns true
        printf '/*\n!/baza/\n' > "$ROOT/.git/info/sparse-checkout"
    fi
    git -C "$ROOT" remote set-url origin "$GITLAB_URL/$PROJECT.git"
    before=$(git -C "$ROOT" rev-parse -q --verify HEAD || true)
    git_auth fetch -q origin "$BRANCH"
    ref=${ref:-origin/$BRANCH}
    git -C "$ROOT" merge-base --is-ancestor "$ref" "origin/$BRANCH" 2>/dev/null ||
        die "$ref — origin/$BRANCH тарихида йўқ"
    git -C "$ROOT" checkout -q -f -B "$BRANCH" "$ref"
    git -C "$ROOT" archive HEAD baza | tar -x -C "$ROOT" --skip-old-files
    after=$(git -C "$ROOT" rev-parse HEAD)
    say "код: $BRANCH ${after:0:8} ($(git -C "$ROOT" log -1 --format=%s))"
    # Скриптнинг ўзи янгиланган бўлса — янги нусхаси билан давом этамиз
    if [ "${SANTAL_REEXEC:-}" != 1 ] && { [ "$0" != "$ROOT/santal.sh" ] || [ "$before" != "$after" ]; }; then
        SANTAL_REEXEC=1 SANTAL_LOCKED=1 exec "$ROOT/santal.sh" "$@"
    fi
}

ensure_env() { # бўш серверда .env'ни .env.example'дан яратади, пароллар тасодифий
    local pg pw
    [ -f "$ROOT/.env" ] && return 0
    pg=$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
    pw=$(od -An -N9 -tx1 /dev/urandom | tr -d ' \n')
    install -m 600 "$ROOT/.env.example" "$ROOT/.env"
    sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$pg/; s/^APP_PASSWORD=.*/APP_PASSWORD=$pw/" "$ROOT/.env"
    say ".env яратилди. Кириш: admin / $pw (ўзгартириш ва BOT_TOKEN — $ROOT/.env, кейин яна шу буйруқ)"
}

ensure_backup_cron() { # ҳар куни 03:00 (сервер вақти) — scripts/backup-r2.sh; .env'да R2 бўлмаса ўчирилади
    local cron=/etc/cron.d/santal-backup
    if [ -z "$(env_get S3_BUCKET_BACKUP "$ROOT/.env")" ]; then
        rm -f "$cron"
        warn ".env'да S3_BUCKET_BACKUP бўш — R2'га кунлик заҳира ўчиқ"
        return 0
    fi
    printf '%s\n' \
        'SHELL=/bin/bash' \
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' \
        "0 3 * * * root bash $ROOT/scripts/backup-r2.sh >> /var/log/santal-backup.log 2>&1" \
        > "$cron.tmp"
    chmod 644 "$cron.tmp"
    mv -f "$cron.tmp" "$cron"
    printf '%s\n' '/var/log/santal-backup.log {' '    monthly' '    rotate 6' '    compress' \
        '    missingok' '    notifempty' '}' > /etc/logrotate.d/santal-backup
}

register_runner() { # register_runner <name> <tag> <access_level> <gitlab-runner register args...>
    local name=$1 tag=$2 access=$3 cfg=/etc/gitlab-runner/config.toml project_id token
    shift 3
    grep -qF "name = \"$name\"" "$cfg" 2>/dev/null && return 0
    project_id=$(api GET "/projects/${PROJECT//\//%2F}" | grep -o '^{"id":[0-9]*' | grep -o '[0-9]*$') ||
        die "GitLab API: $PROJECT лойиҳаси топилмади (токен scope: read_repository, read_api, create_runner; роль Maintainer)"
    token=$(api POST /user/runners --data runner_type=project_type --data "project_id=$project_id" \
        --data "description=$name" --data "tag_list=$tag" --data run_untagged=false --data "access_level=$access" |
        sed -n 's/.*"token":"\([^"]*\)".*/\1/p') || die "runner $name яратилмади (токенда create_runner ҳуқуқи борми?)"
    [ -n "$token" ] || die "runner $name: GitLab токен қайтармади"
    say "runner $name (tag: $tag) рўйхатдан ўтказилмоқда"
    CI_SERVER_TOKEN=$token gitlab-runner register --non-interactive --url "$GITLAB_URL" --name "$name" "$@" </dev/null >/dev/null
    grep -qF "name = \"$name\"" "$cfg" || die "runner $name рўйхатдан ўтмади"
}

setup_runner() {
    local tmp
    if ! command -v gitlab-runner >/dev/null; then
        say "gitlab-runner ўрнатилмоқда"
        tmp=$(mktemp)
        curl -fsSL https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh -o "$tmp"
        bash "$tmp" </dev/null >/dev/null
        rm -f "$tmp"
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq gitlab-runner </dev/null
    fi
    if [ -n "$(docker ps -aq -f name='^gitlab-runner$')" ]; then
        warn "эски 'gitlab-runner' контейнери бор — иккита runner бўлмаслиги учун: docker rm -f gitlab-runner"
    fi
    usermod -aG docker gitlab-runner
    rm -f /home/gitlab-runner/.bash_logout  # Ubuntu'да shell job'ларни "prepare environment" да йиқитади
    # lint/test: алоҳида контейнерда, Docker socket ва production'га кириш ҳуқуқисиз
    register_runner santal-ci santal not_protected --executor docker \
        --docker-image python:3.14-slim --docker-pull-policy if-not-present \
        --docker-cpus 0.75 --docker-memory 1g --docker-service-cpus 0.5 --docker-service-memory 384m \
        --docker-volumes /cache
    # deploy: шу серверда gitlab-runner номидан (docker гуруҳи = root'га тенг) — фақат protected branch'лар
    register_runner santal-deploy santal-deploy ref_protected --executor shell --env "SANTAL_DIR=$ROOT"
    if ! grep -qx 'concurrent = 1' /etc/gitlab-runner/config.toml; then
        sed -i 's/^concurrent = .*/concurrent = 1/' /etc/gitlab-runner/config.toml  # сервер production билан умумий
        gitlab-runner restart >/dev/null
    fi
}

chown_tree() { # CI deploy (gitlab-runner) кодни янгилай олиши учун
    chown -R gitlab-runner:gitlab-runner "$ROOT" || true
}

main() {
    set -Eeuo pipefail
    umask 022
    export GIT_TERMINAL_PROMPT=0
    ROOT=${SANTAL_DIR:-/opt/santal}
    DEPLOY_ENV=$ROOT/.env.deploy
    [ -f "$DEPLOY_ENV" ] || die "$DEPLOY_ENV йўқ — README → «Сервер»даги буйруқни ишлатинг"
    TOKEN=$(env_get GITLAB_TOKEN "$DEPLOY_ENV")
    [ -n "$TOKEN" ] || die "$DEPLOY_ENV да GITLAB_TOKEN бўш"
    PROJECT=$(env_get GITLAB_PROJECT "$DEPLOY_ENV")
    PROJECT=${PROJECT:-$DEFAULT_PROJECT}
    BRANCH=$(env_get DEPLOY_BRANCH "$DEPLOY_ENV")
    BRANCH=${BRANCH:-main}
    [[ "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ && "$BRANCH" != -* && "$BRANCH" != *..* ]] || die "DEPLOY_BRANCH нотўғри"

    if is_root; then
        chmod 600 "$DEPLOY_ENV"
        # Ubuntu'даги needrestart apt'дан кейин /dev/tty'да сўраб, яширин осилиб қолади
        export DEBIAN_FRONTEND=noninteractive NEEDRESTART_SUSPEND=1 NEEDRESTART_MODE=a
        ensure_prereqs
    else
        { [ -w "$ROOT" ] && docker info >/dev/null 2>&1; } || die "шундай ишлатинг: sudo $ROOT/santal.sh"
    fi

    if [ "${SANTAL_LOCKED:-}" != 1 ]; then
        exec 9>>"$ROOT/.deploy.lock"
        flock -w 600 9 || die "бошқа deploy ишлаяпти ($ROOT/.deploy.lock)"
    fi
    sync_repo "${1:-}" "$@"
    cd "$ROOT"

    if is_root; then
        ensure_env
        ensure_backup_cron
        setup_runner
        trap chown_tree EXIT
        chown_tree
    fi
    bash scripts/deploy.sh
}

main "$@"
