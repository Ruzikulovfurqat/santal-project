# santal-project

Ишлаб чиқариш бошқарув маркази (FastAPI: `app.py` + `frontend/`) ва диллерлар Телеграм боти (`bot/`, aiogram: webhook ёки polling) — битта серверда, битта жараёнда, битта PostgreSQL базасида ишлайди.

## Ишга тушириш (Docker)

```sh
cp .env.example .env   # POSTGRES_PASSWORD ва BOT_TOKEN'ни тўлдиринг
make up                # PostgreSQL 18 + дастур + бот
```

Дастур: `http://<сервер-IP>:8642`. Барча созламалар `.env` дан ўқилади.

- `APP_PASSWORD` берилса — саҳифа ва API фақат логин (`APP_USER`, стандарт `admin`) ва пароль билан очилади (браузер бир марта сўрайди). **Сервер интернетдан кўринса, албатта тўлдиринг** — акс ҳолда API (мижозлар, касса...) ҳаммага очиқ. `APP_BIND` — порт қайси IP'да очилади (масалан, фақат VPN).
- `BOT_TOKEN` бўш бўлса — фақат дастур ишлайди.
- Бот дастур билан битта жараёнда ишлайди. Бир токен билан бир вақтда фақат битта нусха ишлай олади (Docker'даги ва `make run` даги нусха бирга ишласа, Telegram `Conflict` хатосини беради).
- `WEBHOOK_URL` бўш бўлса — **polling** (очиқ порт, домен ёки SSL шарт эмас).
- `WEBHOOK_URL=https://...` бўлса — **webhook**: Telegram `<WEBHOOK_URL>/bot/webhook` га юборади. Webhook алоҳида портда (`WEBHOOK_PUBLIC_PORT`, контейнер ичида 8443) ишлайди. `APP_PASSWORD` берилган бўлса, шу портда (яъни `WEBHOOK_URL` доменида) дастурнинг ўзи ҳам логин/пароль билан очилади; паролсиз у ерда **фақат** webhook. Домен орқали ишлатилганда серверда `APP_BIND=127.0.0.1` қилинг — 8642 (шифрланмаган HTTP) интернетга очиқ қолмайди. `https://` бўлмаса ёки `setWebhook` хато берса, бот ўзи polling'га ўтади.

| Буйруқ | Нима қилади |
|---|---|
| `make up` / `down` | ишга тушириш / тўхтатиш (база `santal_pgdata` volume'да сақланади) |
| `make logs` / `ps` | логлар / ҳолат |
| `make restart` | дастур контейнерини қайта ишга тушириш |
| `make psql` | PostgreSQL консоли |
| `make migration name=...` | янги миграция файли (`migrations/NNN_name.sql`) |
| `make backup` | база дампи + акт файллари → `backups/` |
| `make backup-r2` | база дампи + акт файллари → Cloudflare R2 (серверда ҳар куни 03:00 ўзи) |
| `make deploy` | серверда: заҳира + янги версия + соғлиқ текшируви |
| `make test` / `make lint` | тестлар / ruff |
| `make html` | `frontend/` дан ягона `dist/app.html` йиғиш |
| `make db` + `make run` | Docker'сиз ишлаб чиқиш: фақат Postgres контейнерда, дастур + бот venv'да |

## CI/CD (GitLab)

Репо: https://gitlab.com/Ruzikulovfurqat/sandal. `.gitlab-ci.yml` — ҳар push ва MR'да, **фақат ўз серверимиздаги runner'ларда** (GitLab compute minutes сарфланмайди):

1. **lint** — `ruff check`, frontend йиғилиши, `shellcheck`;
2. **test** — PostgreSQL 18 сервисида `pytest`: `data.json` тўлиқ кўчиши, API, қулф, юклаш, экспорт, бот транзакциялари (бир вақтда қабул қилиш, рақамлар такрорланмаслиги);
3. **deploy** — фақат `main`'га push'да: серверда `santal.sh <commit>` — кодни GitLab'дан олади, кейин `scripts/deploy.sh`: база заҳираси (`backups/predeploy-*.dump`), янги image, миграциялар, `healthy` бўлишини кутиш, бўлмаса олдинги версияга қайтиш.

CI/CD variable'лар, SSH калитлари керак эмас. Локал: `make lint`, `make test` (вақтинчалик база яратиб, охирида ўчиради — асосий маълумотга тегмайди; аввал `make db` ёки `make up`).

## Сервер

Ҳаммаси шу репонинг ўзида: серверда у `/opt/santal`'га git checkout қилинади, алоҳида deployment репо йўқ.

**1. GitLab токени** (битта, серверда сақланади): gitlab.com → Edit profile → Access tokens → Personal access token, scope'лар: `read_repository`, `read_api`, `create_runner` (лойиҳада Maintainer бўлиш керак).

**2. Серверда битта буйруқ** (Ubuntu/Debian, root; токенни сўрайди):

```sh
sudo bash -c 'set -eo pipefail; read -rsp "GitLab token: " t </dev/tty; echo; install -d /opt/santal; (umask 077; printf "GITLAB_TOKEN=%s\n" "$t" > /opt/santal/.env.deploy); printf "PRIVATE-TOKEN: %s\n" "$t" | curl -fsSL -H @- "https://gitlab.com/api/v4/projects/Ruzikulovfurqat%2Fsandal/repository/files/santal.sh/raw?ref=main" | bash'
```

`santal.sh` нима қилади (қайта ишга туширса бўлади — бор нарсани қайта қилмайди):

- git, curl, docker, gitlab-runner йўқ бўлса ўрнатади;
- кодни `main`'дан `/opt/santal`'га олади. Токен фақат `.env.deploy`'да (600) туради, `.git/config`'га ёзилмайди;
- `.env` бўлмаса `.env.example`'дан яратади (тасодифий `POSTGRES_PASSWORD` ва `APP_PASSWORD`, логин экранга чиқади);
- шу токен билан иккита runner яратиб, рўйхатдан ўтказади: `santal` (lint/test, Docker'да, production'га кириш ҳуқуқисиз) ва `santal-deploy` (shell, фақат protected branch'лар);
- `.env`'да `S3_BUCKET_BACKUP` бўлса, R2'га кунлик заҳирани ёқади (пастда «R2 заҳира»);
- `scripts/deploy.sh`.

`.env`, `baza/` (юкланган файллар, `data.json`), `certs/`, `backups/` га **тегилмайди**. `baza/` git'да бор бўлса ҳам серверда checkout қилинмайди, фақат йўқ файллар бир марта қўшилади.

| Вазифа | Буйруқ |
|---|---|
| deploy | `main`'га push — автоматик |
| қўлда янгилаш / `.env` ўзгаргандан кейин | `sudo /opt/santal/santal.sh` |
| бошқа branch'дан | `/opt/santal/.env.deploy`'га `DEPLOY_BRANCH=...`, кейин `sudo /opt/santal/santal.sh` |
| токенни алмаштириш | `/opt/santal/.env.deploy`'даги `GITLAB_TOKEN` |

Эски (rsync билан deploy қилинган) сервер ҳам шу буйруқ билан ўтади: `.env` ва `baza/` жойида қолади. Агар у `/opt/santal`'да бўлмаса, аввал `sudo mv <эски-папка> /opt/santal`.

## MCP (Claude Code)

`.mcp.json` иккита сервер беради (`scripts/mcp.sh` орқали): **gitlab** (issue, MR, pipeline, job логлари) ва **postgres** (база; стандарт ҳолатда фақат ўқиш).

```sh
cp .env.mcp.example .env.mcp   # GITLAB_TOKEN (scope: api) ва POSTGRES_MCP_URL
```

`MCP_SSH` бўш бўлса — локал база (`make db` / `make up`); `MCP_SSH=user@server` берилса — сервердаги база SSH туннел орқали (туннел MCP билан бирга очилиб-ёпилади). `npx` (Node) ва `uvx` (uv) керак.

## Миграциялар

Ҳар ишга тушишда `migrations/` папкасидаги ҳали қўлланмаган `.sql` файллар номи тартибида автоматик қўлланади (қўлланганлари `public.schema_migrations` жадвалида). Ҳаммаси битта транзакцияда: биронтасида хато бўлса, ҳеч бири қўлланмайди ва дастур ишга тушмайди. Қўлланган файлни ўзгартирманг — янги файл қўшинг.

## Frontend

`frontend/` — браузерга бориладиган саҳифа, бўлимларга ажратилган:

- `index.html` — саҳифа қобиғи; `{{include:styles.css}}`, `{{base64:assets/logo.png}}`, `{{js}}` белгилари ўрнига файллар қўйилади.
- `styles.css`, `assets/logo.png`
- `js/NNN-bo'lim.js` — дастур JS'и бўлимлар бўйича (омбор, касса, ходимлар ...). Ҳаммаси номи тартибида **битта** `<script>` ичида уланади ва битта умумий `(function(){ ... })()` ни ташкил қилади (`000-iife-start.js` очади, `990-iife-end.js` ёпади) — шунинг учун бўлимлар бир-бирининг функция ва ўзгарувчиларини аввалгидек кўради. Янги бўлим учун мос рақамли файл қўшинг (масалан `255-yangi.js`).

Сервер (`frontend_build.py`) файллар ўзгарса, саҳифани автоматик қайта йиғади.

## Маълумотлар

- `app` схемаси — дастур ёзувлари (`app.docs`: коллекция + id + JSONB), `bot` схемаси — ботнинг ўз жадваллари.
- Акт файллари (сканлар) — `baza/uploads/`.
- Эски `baza/data.json` ва `bot/bot.db` (SQLite) биринчи ишга тушишда, база бўш бўлса, PostgreSQL'га автоматик кўчирилади.
- Ботдаги маҳсулот категориялари дастурнинг «Категориялар» бўлимидан олинади.

Батафсил: `O'QING.txt`.

### R2 заҳира

Ҳар куни **03:00** да (сервер вақти — `timedatectl`; керак бўлса `timedatectl set-timezone Asia/Tashkent`) `scripts/backup-r2.sh` база дампини (`db/db-*.sql.gz`) ва `baza/uploads`'ни (`uploads/uploads-*.tar.gz`) `.env`'даги `S3_BUCKET_BACKUP` bucket'ига юклайди, серверда вақтинчалик файл қолмайди. Калитлар — `.env`'даги `S3_*` (`.env.example`'га қаранг), aws CLI Docker image'да ишлайди, серверга ўрнатилмайди.

- cron: `gitlab-runner`'нинг crontab'и (`santal.sh` ҳар deploy'да ёзади, `sudo` шарт эмас), лог: `/opt/santal/backups/r2-backup.log`;
- қўлда: `cd /opt/santal && make backup-r2`;
- эски нусхалар: Cloudflare → R2 → bucket → Settings → **Object lifecycle rules** → 30 кундан кейин ўчириш (бепул 10 GB тўлмаслиги учун, бир марта қўлда);
- тиклаш (аввал синов базасида):

```sh
cd /opt/santal
docker run --rm -e AWS_ACCESS_KEY_ID=... -e AWS_SECRET_ACCESS_KEY=... -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli:2.38.6 s3 cp s3://<bucket>/db/db-YYYYmmdd-HHMMSS.sql.gz - --endpoint-url <S3_API_URL> \
  | gunzip | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```
