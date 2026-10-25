# -*- coding: utf-8 -*-
"""
PostgreSQL'даги ҳужжатлар омбори — дастур (app.py) ва бот (bot/baza.py)
иккаласи ҳам шу модул орқали БИТТА базага уланади.

Ҳар бир ёзув (буюртма, омбор, касса...) app.docs жадвалида битта қатор:
коллекция номи + id + JSONB маълумот. seq — қўшилиш тартиби (рўйхатлар
аввалгидек шу тартибда қайтади).

Уланиш созламалари .env'дан: DATABASE_URL ёки POSTGRES_HOST, POSTGRES_PORT,
POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD.
"""
import atexit
import json
import os
import threading
import time
import uuid

import psycopg
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

import envconf

envconf.load()

MIGRATIONS_DIR = os.path.join(envconf.ROOT_DIR, "migrations")

# Миграциялар ва эски маълумотни кўчириш бир вақтда икки марта бажарилмаслиги учун
SCHEMA_LOCK_ID = 864201

_pool = None
_pool_lock = threading.Lock()


def conninfo():
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    env = lambda k, d: os.environ.get(k, "").strip() or d  # noqa: E731
    return make_conninfo(host=env("POSTGRES_HOST", "127.0.0.1"), port=env("POSTGRES_PORT", "5432"),
                         dbname=env("POSTGRES_DB", "santal"), user=env("POSTGRES_USER", "santal"),
                         password=env("POSTGRES_PASSWORD", ""))


def migrate():
    """migrations/ папкасидаги ҳали қўлланмаган .sql файлларни номи тартибида
    қўллайди. Ҳаммаси БИТТА транзакцияда: биронтасида хато бўлса, ҳеч бири
    қўлланмайди ва дастур ишга тушмайди. Қўлланганлари public.schema_migrations'да."""
    files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
    applied = []
    with psycopg.connect(conninfo()) as conn:
        conn.execute("SELECT pg_advisory_xact_lock(%s)", (SCHEMA_LOCK_ID,))
        conn.execute("CREATE TABLE IF NOT EXISTS public.schema_migrations ("
                     "version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())")
        done = {r[0] for r in conn.execute("SELECT version FROM public.schema_migrations")}
        for name in files:
            if name in done:
                continue
            with open(os.path.join(MIGRATIONS_DIR, name), "r", encoding="utf-8") as f:
                conn.execute(f.read())
            conn.execute("INSERT INTO public.schema_migrations (version) VALUES (%s)", (name,))
            applied.append(name)
    for name in applied:
        print("Миграция қўлланди:", name, flush=True)
    return applied


def make_pool(max_size=10, **kwargs):
    """Пул очади ва база тайёр бўлишини 60 сониягача кутади."""
    pool = ConnectionPool(conninfo(), min_size=1, max_size=max_size, kwargs=kwargs,
                          check=ConnectionPool.check_connection, open=True)
    pool.wait(timeout=60)
    atexit.register(pool.close)
    return pool


def _get_pool():
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = make_pool()
        return _pool


def _exec(sql, params=(), fetch=None):
    with _get_pool().connection() as conn:
        cur = conn.execute(sql, params)
        if fetch == "one":
            return cur.fetchone()
        if fetch == "all":
            return cur.fetchall()
        return None


def col_list(name):
    return [r[0] for r in _exec("SELECT data FROM app.docs WHERE collection=%s ORDER BY seq",
                                (name,), "all")]


def col_add(name, fields, conn=None):
    """conn берилса, ўша (очиқ) транзакция ичида ёзилади."""
    doc_id = uuid.uuid4().hex[:14]
    doc = dict(fields or {})
    doc["id"] = doc_id
    sql, params = "INSERT INTO app.docs (collection, id, data) VALUES (%s, %s, %s)", (name, doc_id, Jsonb(doc))
    if conn is not None:
        conn.execute(sql, params)
    else:
        _exec(sql, params)
    return doc_id


def doc_get(name, doc_id):
    row = _exec("SELECT data FROM app.docs WHERE collection=%s AND id=%s", (name, doc_id), "one")
    return row[0] if row else None


def doc_merge(name, doc_id, fields):
    """Мавжуд бўлса берилган майдонлар устига ёзилади (мерж), бўлмаса шу id
    билан янги ҳужжат яратилади — иловадаги update() ва set() шуни кутади."""
    doc = dict(fields or {})
    doc["id"] = doc_id
    _exec("INSERT INTO app.docs (collection, id, data) VALUES (%s, %s, %s) "
          "ON CONFLICT (collection, id) DO UPDATE SET data = app.docs.data || EXCLUDED.data",
          (name, doc_id, Jsonb(doc)))
    return True


doc_update = doc_merge
doc_set = doc_merge


def doc_delete(name, doc_id):
    _exec("DELETE FROM app.docs WHERE collection=%s AND id=%s", (name, doc_id))
    return True


def doc_acquire(name, doc_id, holder, ttl_ms):
    now_ms = time.time() * 1000.0
    row = _exec("INSERT INTO app.locks (key, holder, expires) VALUES (%s, %s, %s) "
                "ON CONFLICT (key) DO UPDATE SET holder = EXCLUDED.holder, expires = EXCLUDED.expires "
                "WHERE app.locks.expires <= %s OR app.locks.holder = EXCLUDED.holder "
                "RETURNING key",
                (name + "/" + doc_id, holder, now_ms + (ttl_ms or 20000), now_ms), "one")
    return row is not None


def all_collections():
    out = {}
    for name, data in _exec("SELECT collection, data FROM app.docs ORDER BY collection, seq", (), "all"):
        out.setdefault(name, []).append(data)
    return out


def import_json(path):
    """Эски data.json'ни базага кўчиради — фақат база ҳали бўш бўлса.
    Кўчирилган ёзувлар сонини қайтаради (кўчирилмаса 0). Файлга тегилмайди."""
    if not os.path.isfile(path):
        return 0
    with _get_pool().connection() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(%s)", (SCHEMA_LOCK_ID,))
        if conn.execute("SELECT EXISTS (SELECT 1 FROM app.docs)").fetchone()[0]:
            return 0
        with open(path, "r", encoding="utf-8") as f:
            store = json.load(f)
        rows = [(name, str(d.get("id")), Jsonb(d))
                for name, docs in (store.get("_collections") or {}).items()
                for d in docs if d.get("id")]
        locks = [(k, v.get("holder") or "", v.get("expires") or 0)
                 for k, v in (store.get("_locks") or {}).items()]
        with conn.cursor() as cur:
            cur.executemany("INSERT INTO app.docs (collection, id, data) VALUES (%s, %s, %s) "
                            "ON CONFLICT DO NOTHING", rows)
            cur.executemany("INSERT INTO app.locks (key, holder, expires) VALUES (%s, %s, %s) "
                            "ON CONFLICT DO NOTHING", locks)
        return len(rows)
