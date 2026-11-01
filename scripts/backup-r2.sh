#!/usr/bin/env bash
# База дампи (.sql.gz) + акт файллари (baza/uploads) -> Cloudflare R2 (S3_BUCKET_BACKUP).
# Серверда ҳар куни 03:00 да cron ишга туширади (santal.sh -> gitlab-runner crontab'и);
# қўлда: make backup-r2. Калитлар .env'дан олинади, aws CLI — Docker image'да.
# Эски нусхаларни R2'нинг lifecycle rule'и ўчиради (README → «R2 заҳира»).
set -Eeuo pipefail
cd "$(dirname "$0")/.."

AWS_IMAGE=amazon/aws-cli:2.38.6
TMP_DIR=backups/r2-tmp

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { log "ХАТО: $*" >&2; exit 1; }
trap 'log "ХАТО: $LINENO-қаторда тўхтади" >&2' ERR

env_get() { # env_get <key>; битта қават қўштирноқ ва CR олиб ташланади (santal.sh'дагидек)
    local v
    v=$(sed -n "s/^$1=//p" .env | tail -n 1 | tr -d '\r')
    v=${v#[\"\']}
    printf '%s' "${v%[\"\']}"
}

[ -f .env ] || die "$(pwd)/.env топилмади"
AWS_ACCESS_KEY_ID=$(env_get S3_ACCOUNT_ID)  # R2 API token'нинг Access Key ID'си
AWS_SECRET_ACCESS_KEY=$(env_get S3_SECRET_KEY)
S3_API_URL=$(env_get S3_API_URL)
S3_BUCKET_BACKUP=$(env_get S3_BUCKET_BACKUP)
for k in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY S3_API_URL S3_BUCKET_BACKUP; do
    [ -n "${!k}" ] || die ".env'да R2 калити бўш ($k)"
done
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

mkdir -p backups
exec 9>>backups/.r2.lock
flock -n 9 || die "бошқа R2 заҳираси ишлаяпти (backups/.r2.lock)"

[ -n "$(docker compose ps --status running -q db 2>/dev/null)" ] || die "db контейнери ишламаяпти"

install -d -m 700 "$TMP_DIR"
trap 'rm -f "$TMP_DIR"/*' EXIT

upload() { # upload <файл> <R2'даги папка>
    docker run --rm -v "$(pwd)/$TMP_DIR:/data:ro" \
        -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
        -e AWS_DEFAULT_REGION=auto \
        -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
        -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
        "$AWS_IMAGE" s3 cp "/data/$1" "s3://$S3_BUCKET_BACKUP/$2/$1" \
        --endpoint-url "$S3_API_URL" --only-show-errors </dev/null
    log "R2'га юкланди: s3://$S3_BUCKET_BACKUP/$2/$1"
}

stamp=$(date +%Y%m%d-%H%M%S)
log "=== R2 заҳираси бошланди ==="

db_file=db-$stamp.sql.gz
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$TMP_DIR/$db_file"
gzip -t "$TMP_DIR/$db_file"
log "База дампи: $db_file ($(du -h "$TMP_DIR/$db_file" | cut -f1))"
upload "$db_file" db

if [ -d baza/uploads ]; then
    up_file=uploads-$stamp.tar.gz
    tar czf "$TMP_DIR/$up_file" baza/uploads
    log "Акт файллари: $up_file ($(du -h "$TMP_DIR/$up_file" | cut -f1))"
    upload "$up_file" uploads
else
    log "baza/uploads йўқ — ўтказиб юборилди"
fi

log "=== Тайёр ==="
