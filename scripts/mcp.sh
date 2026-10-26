#!/usr/bin/env bash
# Claude Code MCP серверлари — .mcp.json шуни чақиради. Созламалар: .env.mcp
# (cp .env.mcp.example .env.mcp; git'га тушмайди).
#   gitlab   — GitLab API: issue, MR, pipeline, job логлари (Ruzikulovfurqat/sandal)
#   postgres — база: MCP_SSH бўш бўлса локал (make db / make up), берилса — сервердаги
#              база SSH туннел орқали (туннел MCP билан бирга очилиб-ёпилади)
set -euo pipefail
cd "$(dirname "$0")/.."

die() { printf 'mcp: ХАТО: %s\n' "$*" >&2; exit 1; }

[ -f .env.mcp ] || die ".env.mcp йўқ — cp .env.mcp.example .env.mcp ва тўлдиринг"
set -a
# shellcheck source=/dev/null
. ./.env.mcp
set +a

case "${1:-}" in
gitlab)
    export GITLAB_PERSONAL_ACCESS_TOKEN="${GITLAB_TOKEN:?.env.mcp да GITLAB_TOKEN бўш}"
    export GITLAB_API_URL="${GITLAB_API_URL:-https://gitlab.com/api/v4}"
    export GITLAB_PERMISSION_MODE="${GITLAB_PERMISSION_MODE:-modify}"  # readonly | modify (delete/move'сиз)
    exec npx -y @zereight/mcp-gitlab@2.2.2
    ;;
postgres)
    url=${POSTGRES_MCP_URL:?.env.mcp да POSTGRES_MCP_URL бўш}
    if [ -n "${MCP_SSH:-}" ]; then
        case "$url" in *@127.0.0.1:15432/*) ;; *) die "MCP_SSH билан POSTGRES_MCP_URL 127.0.0.1:15432 га қараши керак" ;; esac
        # Сервердаги база фақат 127.0.0.1:5432'да (docker-compose.yml) — шунга туннел
        ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes \
            -L 127.0.0.1:15432:127.0.0.1:5432 "$MCP_SSH" </dev/null >&2 &
        tunnel=$!
        for _ in $(seq 50); do
            (: </dev/tcp/127.0.0.1/15432) 2>/dev/null && break
            kill -0 "$tunnel" 2>/dev/null || die "SSH туннел очилмади ($MCP_SSH)"
            sleep 0.2
        done
        uvx --overrides scripts/mcp-pg-overrides.txt --with 'mcp<2' postgres-mcp==0.3.0 --access-mode="${POSTGRES_MCP_ACCESS:-restricted}" "$url" <&0 &
        server=$!
        trap 'kill "$server" "$tunnel" 2>/dev/null || true' EXIT INT TERM HUP
        wait "$server"
    else
        exec uvx --overrides scripts/mcp-pg-overrides.txt --with 'mcp<2' postgres-mcp==0.3.0 --access-mode="${POSTGRES_MCP_ACCESS:-restricted}" "$url"
    fi
    ;;
*) die "ишлатиш: scripts/mcp.sh gitlab|postgres" ;;
esac
