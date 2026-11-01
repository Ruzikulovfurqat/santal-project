PYTHON  ?= python3
VENV    := .venv
PY      := $(VENV)/bin/python
COMPOSE := docker compose
SSH     ?= santal
TUNNEL_PORT ?= 15432

.DEFAULT_GOAL := help
.PHONY: help up down restart build ps logs psql migrate migration backup backup-r2 tunnel deploy html lock db install dev test lint run clean

help: ## Буйруқлар рўйхати
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'

.env:
	cp .env.example .env
	@echo ".env яратилди — POSTGRES_PASSWORD ва BOT_TOKEN'ни тўлдиринг"

# ---------------------------------------------------------------- Docker (сервер)
up: .env ## PostgreSQL + дастур + ботни Docker'да ишга тушириш
	$(COMPOSE) up -d --build
	@$(COMPOSE) ps

down: ## Контейнерларни тўхтатиш (база volume'да сақланиб қолади)
	$(COMPOSE) down

restart: ## Дастур контейнерини қайта ишга тушириш
	$(COMPOSE) restart app

build: ## Image'ни қайта йиғиш
	$(COMPOSE) build

ps: ## Контейнерлар ҳолати
	$(COMPOSE) ps

logs: ## Логларни кузатиш
	$(COMPOSE) logs -f --tail=100

migrate: ## Миграцияларни қўлда қўллаш (одатда ишга тушишда ўзи қўлланади)
	$(COMPOSE) exec app python -c "import pgstore; pgstore.migrate()"

migration: ## Янги миграция файли: make migration name=add_something
	@test -n "$(name)" || { echo "Номини беринг: make migration name=..."; exit 1; }
	@n=$$(ls migrations/*.sql 2>/dev/null | sed -E 's|.*/([0-9]+)_.*|\1|' | sort -n | tail -1); \
	f=migrations/$$(printf '%03d' $$((10#$${n:-0} + 1)))_$(name).sql; \
	echo "-- $(name)" > $$f; echo "Яратилди: $$f"

psql: ## PostgreSQL консоли
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" "$$POSTGRES_DB"'

backup: ## База дампи + акт файллари -> backups/
	@mkdir -p backups
	$(COMPOSE) exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" -Fc "$$POSTGRES_DB"' > backups/db-$$(date +%Y%m%d-%H%M%S).dump
	tar czf backups/uploads-$$(date +%Y%m%d-%H%M%S).tar.gz baza/uploads
	@ls -1t backups | head -2

backup-r2: ## База дампи + акт файллари -> Cloudflare R2 (.env: S3_*; серверда ҳар куни 03:00)
	bash scripts/backup-r2.sh

tunnel: ## Сервердаги базага SSH туннел: 127.0.0.1:15432 (MCP postgres учун; Ctrl+C — ёпиш)
	@echo "Туннел: 127.0.0.1:$(TUNNEL_PORT) -> $(SSH):5432 (ёпиш: Ctrl+C)"
	ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
		-L 127.0.0.1:$(TUNNEL_PORT):127.0.0.1:5432 $(SSH)

deploy: ## Серверда: заҳира + янги версия + соғлиқ текшируви (CI/CD ҳам шуни чақиради)
	bash scripts/deploy.sh

lock: ## requirements.txt'дан аниқ версиялар (requirements.lock) — Python 3.14'да
	docker run --rm -v "$(CURDIR):/w" -w /w python:3.14-slim sh -c \
		'pip install -q --root-user-action=ignore -r requirements.txt && \
		 { head -2 requirements.lock; pip freeze; } > /tmp/lock && mv /tmp/lock requirements.lock'

html: ## frontend/ дан ягона dist/app.html йиғиш
	$(PYTHON) frontend_build.py dist/app.html

# ---------------------------------------------------------------- Docker'сиз (ишлаб чиқиш)
db: .env ## Фақат PostgreSQL контейнерини ишга тушириш (make run учун)
	$(COMPOSE) up -d --wait db

$(VENV)/.installed: requirements.txt bot/requirements.txt
	$(PYTHON) -m venv $(VENV)
	$(PY) -m pip install -q --upgrade pip
	$(PY) -m pip install -q -r requirements.txt
	@touch $@

install: $(VENV)/.installed ## Виртуал муҳит ва кутубхоналарни ўрнатиш

$(VENV)/.dev-installed: $(VENV)/.installed requirements-dev.txt
	$(PY) -m pip install -q -r requirements-dev.txt
	@touch $@

dev: $(VENV)/.dev-installed ## Тест ва lint воситаларини ўрнатиш

test: dev .env ## Тестлар (вақтинчалик базада; PostgreSQL ишлаётган бўлиши керак: make db)
	$(PY) -m pytest -q tests

lint: dev ## Ruff текшируви
	$(VENV)/bin/ruff check .

run: install .env ## Дастур + бот, олд планда (PostgreSQL ишлаётган бўлиши керак)
	$(PY) app.py

clean: ## venv ва кэшларни ўчириш (база ва baza/ га тегмайди)
	rm -rf $(VENV) dist __pycache__ bot/__pycache__
