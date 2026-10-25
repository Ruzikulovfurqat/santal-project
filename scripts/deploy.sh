#!/usr/bin/env bash
# Серверда янги версияни ишга тушириш (CI/CD шуни чақиради; қўлда ҳам ишлатса бўлади):
#   1) база заҳираси (backups/predeploy-*.dump, охирги 10 таси сақланади)
#   2) image'ни йиғиб, контейнерларни янгилаш — миграциялар ишга тушишда ўзи қўлланади
#   3) соғлигини кутиш; бўлмаса — лог чиқариб, хато билан тугайди
# .env, baza/ ва certs/ га тегилмайди.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "ХАТО: $(pwd)/.env топилмади — серверда .env.example'дан нусха олиб тўлдиринг." >&2
    exit 1
fi
mkdir -p backups baza/uploads

if [ -n "$(docker compose ps --status running -q db 2>/dev/null)" ]; then
    dump="backups/predeploy-$(date +%Y%m%d-%H%M%S).dump"
    echo "==> База заҳираси: $dump"
    docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$dump"
    ls -1t backups/predeploy-*.dump | tail -n +11 | xargs -r rm --
fi

echo "==> Янги версия ишга туширилмоқда"
if ! docker compose up -d --build --remove-orphans --wait --wait-timeout 180; then
    echo "ХАТО: контейнерлар соғлом ҳолатга келмади. Охирги лог:" >&2
    docker compose ps >&2
    docker compose logs --tail=150 app >&2
    exit 1
fi

docker image prune -f >/dev/null
docker compose ps
echo "==> Тайёр: $(docker compose exec -T app python -c 'import pgstore; print(len(pgstore.col_list("items")), "items")' 2>/dev/null || true)"
