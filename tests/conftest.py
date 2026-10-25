# -*- coding: utf-8 -*-
"""
Тестлар учун умумий созламалар.

Ҳар бир тест сессияси PostgreSQL'да ВАҚТИНЧАЛИК база яратади, дастурни шу
базага улаб алоҳида портда ишга туширади ва охирида базани ўчиради — асосий
маълумотларга тегилмайди. Уланиш созламалари .env (ёки CI муҳити)дан.
"""
import os
import socket
import subprocess
import sys
import time
import urllib.request
import uuid

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import envconf  # noqa: E402

envconf.load()

import psycopg  # noqa: E402
from psycopg import sql  # noqa: E402

import pgstore  # noqa: E402

TEST_DB = "santal_test_" + uuid.uuid4().hex[:8]
FAKE_TOKEN = "123456:TESTtokenTESTtokenTESTtokenTESTtok"


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def test_db():
    admin = pgstore.conninfo()
    with psycopg.connect(admin, autocommit=True) as conn:
        conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(TEST_DB)))
    # Шу жараёндаги pgstore/бот ҳам вақтинчалик базага уланади
    os.environ["POSTGRES_DB"] = TEST_DB
    os.environ.pop("DATABASE_URL", None)
    yield TEST_DB
    with psycopg.connect(admin, autocommit=True) as conn:
        conn.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(TEST_DB)))


def _run_app(test_db, **extra_env):
    """Дастур (app.py) — вақтинчалик базада, бўш портда, ботсиз. (жараён, манзил)."""
    port = _free_port()
    env = dict(os.environ, POSTGRES_DB=test_db, PORT=str(port), HOST="127.0.0.1",
               BOT_TOKEN="", WEBHOOK_URL="", APP_PASSWORD="", PYTHONUNBUFFERED="1")
    env.update(extra_env)
    proc = subprocess.Popen([sys.executable, os.path.join(ROOT, "app.py")], cwd=ROOT, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    base = "http://127.0.0.1:%d" % port
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    deadline = time.time() + 90
    while True:
        if proc.poll() is not None:
            pytest.fail("app.py ишга тушмади:\n" + proc.stdout.read())
        try:
            opener.open(base + "/healthz", timeout=2).close()
            return proc, base
        except Exception:
            if time.time() > deadline:
                proc.kill()
                pytest.fail("app.py /healthz'га жавоб бермади:\n" + proc.stdout.read())
            time.sleep(0.5)


def _stop(proc):
    proc.terminate()
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture(scope="session")
def server(test_db):
    proc, base = _run_app(test_db)
    yield base
    _stop(proc)


@pytest.fixture(scope="session")
def auth_server(server, test_db):
    """Пароли ёқилган дастур (APP_USER/APP_PASSWORD)."""
    proc, base = _run_app(test_db, APP_USER="ci", APP_PASSWORD="ci-secret")
    yield base
    _stop(proc)


@pytest.fixture(scope="session")
def botmod(server):
    """bot/bot.py модули — вақтинчалик базада, сохта токен билан (Telegram'га уланмайди)."""
    os.environ["BOT_TOKEN"] = FAKE_TOKEN
    sys.path.insert(0, os.path.join(ROOT, "bot"))
    import bot
    return bot
