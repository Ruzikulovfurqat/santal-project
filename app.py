#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ишлаб чиқариш бошқарув маркази — локал тармоқ (LAN) сервери.

Маълумотлар PostgreSQL'да сақланади (pgstore.py), созламалар .env'дан
ўқилади. Керакли кутубхоналар: requirements.txt.

Веб-сервер — FastAPI (uvicorn). Телеграм бот шу жараённинг ўзида: WEBHOOK_URL
берилса — webhook (алоҳида WEBHOOK_PORT'да), бўлмаса — polling. Ишга туширишда базага
migrations/ папкасидаги барча миграциялар автоматик қўлланади.

ИШГА ТУШИРИШ:
    make up          — Docker'да: PostgreSQL + дастур + бот
    make run         — Docker'сиз (PostgreSQL алоҳида ишлаётган бўлиши керак)

Сервер ишга тушгач терминалда икки хил манзил кўрсатилади:
  - http://127.0.0.1:8642        — фақат шу компьютердан очиш учун
  - http://<бу-компьютернинг-IP>:8642 — бир хил Wi-Fi/LAN тармоғидаги
    БОШҚА компьютерлардан очиш учун (масалан http://192.168.1.25:8642)

Барча компьютерлар БИР ХИЛ маълумотлар базасини (PostgreSQL) кўради ва
бирга ишлайди — ким киритган бўлса, бошқалар ҳам дарҳол (2 сониягача) кўради.

Админ ҳуқуқи тизимнинг ўзида (Админ PIN, стандарт: 0000) бошқарилади — уни
биладиган ҳар қандай компьютер "Админ" тугмаси орқали шу ҳуқуққа эга бўлади.
PIN'ни "Омборлар → Бошқарув" бўлимидан ўзгартириш мумкин.

МАЪЛУМОТЛАР: ёзувлар PostgreSQL'да, акт файллари (сканлар) "baza/uploads"
папкасида. Эски версиядаги baza/data.json биринчи ишга тушишда (база бўш
бўлса) PostgreSQL'га автоматик кўчирилади — файлнинг ўзига тегилмайди.
"""
import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import socket
import sys
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from typing import Annotated

import uvicorn
from aiogram.types import Update
from fastapi import FastAPI, Request
from fastapi import Path as FPath
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

import envconf
import frontend_build
import pgstore

# HOST, PORT ва бошқа созламалар .env файлидан ўқилади (намуна: .env.example)
envconf.load()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = frontend_build.INDEX_PATH  # саҳифа frontend/ папкасидаги файллардан йиғилади

# Акт файллари (uploads) ва эски data.json дастур кодидан АЛОҲИДА "baza"
# папкасида — тизимни янгилаш (кодни алмаштириш) уларга тегмайди.
DATA_DIR = os.path.join(BASE_DIR, "baza")
DATA_PATH = os.path.join(DATA_DIR, "data.json")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
HOST = os.environ.get("HOST", "").strip() or "0.0.0.0"
PORT = int(os.environ.get("PORT", "").strip() or "8642")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Эски версияларда data.json ва uploads/ шу файллар билан бир жойда
# (BASE_DIR) сақланарди. Шу маълумотни йўқотиб қўймаслик учун, агар "baza"
# папкаси ҳали бўш бўлса-ю, эски жойда маълумот топилса — уни автоматик
# равишда "baza" папкасига кўчирамиз (нусхаламай, кўчириб — эски жойда
# такрор қолиб, чалкашлик туғдирмаслиги учун).
_legacy_data_path = os.path.join(BASE_DIR, "data.json")
_legacy_uploads_dir = os.path.join(BASE_DIR, "uploads")
if not os.path.exists(DATA_PATH) and os.path.exists(_legacy_data_path):
    import shutil
    shutil.move(_legacy_data_path, DATA_PATH)
    print("Эски data.json 'baza' папкасига кўчирилди (маълумот йўқотилмади).")
if os.path.isdir(_legacy_uploads_dir) and os.path.abspath(_legacy_uploads_dir) != os.path.abspath(UPLOADS_DIR):
    import shutil
    for _fn in os.listdir(_legacy_uploads_dir):
        _src = os.path.join(_legacy_uploads_dir, _fn)
        _dst = os.path.join(UPLOADS_DIR, _fn)
        if os.path.isfile(_src) and not os.path.exists(_dst):
            shutil.move(_src, _dst)
    try:
        if not os.listdir(_legacy_uploads_dir):
            os.rmdir(_legacy_uploads_dir)
    except OSError:
        pass

from pgstore import (col_add, col_list, doc_acquire, doc_delete, doc_get,  # noqa: E402
                     doc_set, doc_update)


# ====================== базани MySQL дамп сифатида экспорт қилиш ======================
# Админ панелдаги "Базани юклаб олиш" тугмаси учун (2026-10-01 сўрови):
# фойдаланувчи дастурни серверга ўзи жойлаштиргач, ичидаги барча киритилган
# маълумотни (буюртмалар, касса, ходимлар — барча коллекциялар) ҳар доим
# MySQL форматида .sql файл сифатида юклаб олиши ва керак бўлганда ушбу
# файлни тузатиш/қўшимча киритиш учун бериши мумкин бўлсин. Ҳар бир
# коллекция алоҳида жадвалга айлантирилади; устунлар — шу коллекциядаги
# барча ёзувларда учрайдиган майдонлар бирлашмаси (аввал кўринган тартибда,
# "id" ҳамиша биринчи). Қиймат тури ҳар хил бўлиши мумкинлиги сабабли
# (матн, сон, рўйхат, объект) барча устунлар LONGTEXT қилиб олинади —
# рўйхат/объект қийматлар JSON матни сифатида сақланади. Бу — фақат
# ЭКСПОРТ (ўқиш учун), ҳеч қандай маълумотни ўзгартирмайди ёки ўчирмайди.
def _sql_ident(name):
    return "`" + str(name).replace("`", "``") + "`"


def _sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        text = "true" if value else "false"
    elif isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False)
    elif isinstance(value, (int, float)):
        text = repr(value)
    else:
        text = str(value)
    text = text.replace("\\", "\\\\").replace("'", "\\'")
    return "'" + text + "'"


def build_mysql_dump():
    collections = pgstore.all_collections()
    names = sorted(collections.keys())
    lines = []
    lines.append("-- Ишлаб чиқариш бошқарув маркази -- тўлиқ база (MySQL дамп)")
    lines.append("-- Яратилган: " + time.strftime("%Y-%m-%d %H:%M:%S"))
    lines.append("-- Жами жадваллар (коллекциялар): %d" % len(names))
    lines.append("SET NAMES utf8mb4;")
    lines.append("SET FOREIGN_KEY_CHECKS=0;")
    lines.append("")
    for name in names:
        docs = collections.get(name) or []
        lines.append("-- " + ("-" * 70))
        lines.append("-- Жадвал: " + name + " (" + str(len(docs)) + " та ёзув)")
        lines.append("-- " + ("-" * 70))
        lines.append("DROP TABLE IF EXISTS " + _sql_ident(name) + ";")
        cols = []
        seen = set()
        for d in docs:
            for k in d.keys():
                if k not in seen:
                    seen.add(k)
                    cols.append(k)
        if "id" in cols:
            cols.remove("id")
        cols = ["id"] + cols
        col_defs = []
        for c in cols:
            if c == "id":
                col_defs.append(_sql_ident(c) + " VARCHAR(64) NOT NULL")
            else:
                col_defs.append(_sql_ident(c) + " LONGTEXT")
        create_sql = "CREATE TABLE " + _sql_ident(name) + " (\n  " + ",\n  ".join(col_defs) + \
            ",\n  PRIMARY KEY (" + _sql_ident("id") + ")\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
        lines.append(create_sql)
        if docs:
            col_list_sql = ", ".join(_sql_ident(c) for c in cols)
            for d in docs:
                vals = ", ".join(_sql_literal(d.get(c)) for c in cols)
                lines.append("INSERT INTO " + _sql_ident(name) + " (" + col_list_sql + ") VALUES (" + vals + ");")
        lines.append("")
    lines.append("SET FOREIGN_KEY_CHECKS=1;")
    return "\n".join(lines)


def _load_shim():
    return SHIM_SCRIPT


_HTML_CACHE = {"mtime": None, "html": None}


def get_html():
    mtime = frontend_build.mtime()
    if _HTML_CACHE["mtime"] == mtime and _HTML_CACHE["html"] is not None:
        return _HTML_CACHE["html"]
    raw = frontend_build.assemble()
    anchor = "<script>\n(function(){"
    if anchor in raw:
        merged = raw.replace(anchor, _load_shim() + "\n" + anchor, 1)
    else:
        # Заҳира йўл: топилмаса, </body> олдидан қўшамиз.
        merged = raw.replace("</body>", _load_shim() + "\n</body>", 1)
        if merged == raw:
            merged = raw + _load_shim()
    _HTML_CACHE["mtime"] = mtime
    _HTML_CACHE["html"] = merged
    return merged


SHIM_SCRIPT = """<script>
(function(){
  "use strict";
  function req(method, path, body){
    var opts = {method:method, headers:{}};
    if(body!==undefined){ opts.headers["Content-Type"]="application/json"; opts.body=JSON.stringify(body); }
    return fetch(path, opts).then(function(r){
      return r.text().then(function(t){
        var parsed = null;
        if(t){ try{ parsed = JSON.parse(t); }catch(e){ parsed = null; } }
        if(!r.ok){ throw new Error("HTTP "+r.status+": "+(parsed&&parsed.error?parsed.error:t)); }
        return parsed;
      });
    });
  }
  function toDocsArr(arr){
    return (arr||[]).map(function(d){ return {id:d.id, data:function(){ return d; }}; });
  }
  function docHandle(collName, id){
    var base = "/api/col/"+encodeURIComponent(collName)+"/"+encodeURIComponent(id);
    return {
      id:id,
      get:function(){
        return req("GET", base).then(function(res){
          return { exists: !!(res && res.exists), id:id, data: function(){ return (res && res.doc) || {}; } };
        });
      },
      update:function(patch){ return req("PATCH", base, patch); },
      set:function(data){ return req("PUT", base, data); },
      delete:function(){ return req("DELETE", base); },
      acquire:function(opts){ return req("POST", base+"/acquire", opts||{}); }
    };
  }
  var listeners = {};
  var pollTimer = null;
  function poll(){
    Object.keys(listeners).forEach(function(collName){
      var subs = listeners[collName];
      if(!subs || !subs.length) return;
      req("GET","/api/col/"+encodeURIComponent(collName)).then(function(arr){
        var json = JSON.stringify(arr);
        subs.slice().forEach(function(sub){
          if(sub.lastJson===json) return;
          sub.lastJson = json;
          sub.cb({docs: toDocsArr(arr)});
        });
      }).catch(function(e){
        subs.slice().forEach(function(sub){ if(sub.errCb) sub.errCb(e); });
      });
    });
  }
  function ensurePoller(){ if(!pollTimer) pollTimer = setInterval(poll, 2000); }
  function collHandle(collName){
    return {
      add:function(data){
        return req("POST","/api/col/"+encodeURIComponent(collName), data).then(function(res){ return {id:res.id}; });
      },
      doc:function(id){ return docHandle(collName, id); },
      get:function(){
        return req("GET","/api/col/"+encodeURIComponent(collName)).then(function(arr){ return {docs: toDocsArr(arr)}; });
      },
      orderBy:function(){ return this; },
      onSnapshot:function(cb, errCb){
        var sub = {cb:cb, errCb:errCb, lastJson:null};
        listeners[collName] = listeners[collName] || [];
        listeners[collName].push(sub);
        ensurePoller();
        req("GET","/api/col/"+encodeURIComponent(collName)).then(function(arr){
          sub.lastJson = JSON.stringify(arr);
          cb({docs: toDocsArr(arr)});
        }).catch(function(e){ if(errCb) errCb(e); });
        return function unsubscribe(){
          var arr2 = listeners[collName];
          if(!arr2) return;
          var idx = arr2.indexOf(sub);
          if(idx>-1) arr2.splice(idx,1);
        };
      }
    };
  }
  var localDb = { collection:function(name){ return collHandle(name); } };
  var localAssets = {
    upload:function(file){
      return new Promise(function(resolve, reject){
        var reader = new FileReader();
        reader.onerror = function(){ reject(new Error("Файлни ўқиб бўлмади")); };
        reader.onload = function(){
          var dataUrl = String(reader.result||"");
          var base64 = dataUrl.split(",")[1] || "";
          req("POST","/api/upload", {filename:file.name, mime:file.type||"application/octet-stream", dataBase64:base64})
            .then(resolve).catch(reject);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  window.claude = window.claude || {};
  window.claude.use = function(name){
    if(name==="db") return Promise.resolve(localDb);
    if(name==="assets") return Promise.resolve(localAssets);
    return Promise.resolve(null);
  };
})();
</script>"""


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


# ====================== Телеграм бот ======================
# Бот шу жараённинг ўзида ишлайди.
#   WEBHOOK_URL берилса — webhook: Telegram янгиланишларни <WEBHOOK_URL>/bot/webhook'га
#   юборади. Бу манзил АЛОҲИДА портда (WEBHOOK_PORT) хизмат қилади ва у ерда
#   ФАҚАТ webhook бор — дастурнинг ўзи (саҳифа, API) интернетга чиқмайди.
#   WEBHOOK_URL бўш (ёки нотўғри) бўлса — polling.
# Эслатма: бир токен билан бир вақтда фақат БИТТА нусха ишлай олади.
BOT_TOKEN = os.environ.get("BOT_TOKEN", "").strip()
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "").strip().rstrip("/")
WEBHOOK_PATH = "/bot/webhook"
WEBHOOK_PORT = int(os.environ.get("WEBHOOK_PORT", "").strip() or "8443")
WEBHOOK_SECRET = (os.environ.get("WEBHOOK_SECRET", "").strip()
                  or hashlib.sha256(("webhook:" + BOT_TOKEN).encode("utf-8")).hexdigest())
# Ихтиёрий: webhook портида TLS (масалан Cloudflare Origin сертификати)
WEBHOOK_SSL_CERT = os.environ.get("WEBHOOK_SSL_CERT", "").strip()
WEBHOOK_SSL_KEY = os.environ.get("WEBHOOK_SSL_KEY", "").strip()

BOT = {"bot": None, "dp": None, "server": None, "server_task": None}
_tasks = set()


def _task_done(task):
    _tasks.discard(task)
    if not task.cancelled() and task.exception():
        logging.error("Бот вазифаси хато билан тўхтади", exc_info=task.exception())


def _spawn(coro):
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_task_done)


class _WebhookServer(uvicorn.Server):
    """Иккинчи (webhook) сервер сигналларни ушламайди — уни асосий сервер
    lifespan'и бошқаради (Ctrl+C/SIGTERM асосий серверга келади)."""

    @contextmanager
    def capture_signals(self):
        yield


async def _polling(bot, dp):
    # Олдин webhook ўрнатилган бўлса, polling ишламайди — уни ўчирамиз
    try:
        await bot.delete_webhook()
    except Exception:
        logging.exception("delete_webhook")
    await dp.start_polling(bot, handle_signals=False)


async def _webhook_start(bot, dp):
    if not WEBHOOK_URL.startswith("https://"):
        print("ОГОҲЛАНТИРИШ: WEBHOOK_URL https:// билан бошланиши керак (%s) — бот polling режимида"
              % WEBHOOK_URL, flush=True)
        return False
    ssl = {}
    if WEBHOOK_SSL_CERT and WEBHOOK_SSL_KEY:
        ssl = {"ssl_certfile": os.path.join(BASE_DIR, WEBHOOK_SSL_CERT),
               "ssl_keyfile": os.path.join(BASE_DIR, WEBHOOK_SSL_KEY)}
    server = _WebhookServer(uvicorn.Config(webhook_app, host="0.0.0.0", port=WEBHOOK_PORT,
                                           lifespan="off", proxy_headers=True, forwarded_allow_ips="*", **ssl))
    BOT.update(server=server, server_task=asyncio.create_task(server.serve()))
    try:
        await bot.set_webhook(WEBHOOK_URL + WEBHOOK_PATH, secret_token=WEBHOOK_SECRET,
                              allowed_updates=dp.resolve_used_update_types())
    except Exception:
        logging.exception("set_webhook ўрнатилмади — бот polling режимига ўтади")
        await _webhook_stop()
        return False
    print("Бот webhook режимида: %s%s (порт %d%s)"
          % (WEBHOOK_URL, WEBHOOK_PATH, WEBHOOK_PORT, ", TLS" if ssl else ""), flush=True)
    return True


async def _webhook_stop():
    if BOT["server"] is not None:
        BOT["server"].should_exit = True
        await BOT["server_task"]
        BOT.update(server=None, server_task=None)


async def bot_start():
    if not BOT_TOKEN:
        print("ОГОҲЛАНТИРИШ: BOT_TOKEN .env'да йўқ — бот ишга туширилмайди", flush=True)
        return
    sys.path.insert(0, os.path.join(BASE_DIR, "bot"))
    import bot as tgbot

    bot, dp = await asyncio.to_thread(tgbot.setup)
    BOT.update(bot=bot, dp=dp)
    _spawn(tgbot.muddat_kuzatuvchi(bot))
    if WEBHOOK_URL and await _webhook_start(bot, dp):
        return
    _spawn(_polling(bot, dp))
    print("Бот ишга тушди (polling)", flush=True)


async def bot_stop():
    await _webhook_stop()
    for task in list(_tasks):
        task.cancel()
    await asyncio.gather(*_tasks, return_exceptions=True)
    if BOT["bot"] is not None:
        await BOT["bot"].session.close()


def db_start():
    print("PostgreSQL'га уланилмоқда...", flush=True)
    pgstore.migrate()
    imported = pgstore.import_json(DATA_PATH)
    if imported:
        print("Эски data.json PostgreSQL'га кўчирилди: %d та ёзув (файлнинг ўзига тегилмади)." % imported,
              flush=True)


@asynccontextmanager
async def lifespan(_app):
    await asyncio.to_thread(db_start)
    await bot_start()
    yield
    await bot_stop()


# ====================== HTTP API ======================
app = FastAPI(title="Ишлаб чиқариш бошқарув маркази", lifespan=lifespan)

NO_STORE = {"Cache-Control": "no-store"}
Name = Annotated[str, FPath(pattern=r"^[A-Za-z0-9_]+$")]
DocId = Annotated[str, FPath(pattern=r"^[A-Za-z0-9_\-]+$")]


def _json(payload, status=200):
    return JSONResponse(payload, status_code=status, headers=NO_STORE)


# ---- Кириш пароли (Basic Auth) ----
# .env'да APP_PASSWORD берилса, саҳифа ва API фақат логин/парол билан очилади
# (браузер бир марта сўрайди, кейин барча сўровларга ўзи қўшади — app.html'ни
# ўзгартириш шарт эмас). Бўш бўлса — аввалгидек паролсиз (фақат ишончли LAN учун).
APP_USER = os.environ.get("APP_USER", "").strip() or "admin"
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()
AUTH_FREE_PATHS = {"/healthz"}  # Docker соғлиқ текшируви


def _auth_ok(header):
    scheme, _, value = header.partition(" ")
    if scheme.lower() != "basic":
        return False
    try:
        user, _, password = base64.b64decode(value.strip()).decode("utf-8").partition(":")
    except Exception:
        return False
    return (hmac.compare_digest(user.encode(), APP_USER.encode())
            & hmac.compare_digest(password.encode(), APP_PASSWORD.encode()))


@app.middleware("http")
async def basic_auth(request, call_next):
    if APP_PASSWORD and request.url.path not in AUTH_FREE_PATHS \
            and not _auth_ok(request.headers.get("Authorization", "")):
        return Response("Логин ва парол керак", status_code=401, media_type="text/plain; charset=utf-8",
                        headers={"WWW-Authenticate": 'Basic realm="Santal", charset="UTF-8"', **NO_STORE})
    return await call_next(request)


async def _body(request):
    raw = await request.body()
    if not raw:
        return {}
    try:
        data = json.loads(raw.decode("utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


@app.exception_handler(StarletteHTTPException)
async def _http_error(_request, exc):
    return _json({"error": "topilmadi" if exc.status_code == 404 else str(exc.detail)}, exc.status_code)


@app.exception_handler(RequestValidationError)
async def _validation_error(_request, _exc):
    # Нотўғри коллекция номи ёки id — аввалгидек "топилмади"
    return _json({"error": "topilmadi"}, 404)


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
@app.get("/app.html", include_in_schema=False)
def index():
    return HTMLResponse(get_html(), headers=NO_STORE)


@app.get("/healthz")
def healthz():
    return _json({"ok": True})


@app.get("/api/export/mysql")
def export_mysql():
    try:
        sql_text = build_mysql_dump()
    except Exception as e:
        return _json({"error": "eksport xatosi: " + str(e)}, 500)
    fname = "ishlab_chiqarish_baza_" + time.strftime("%Y%m%d_%H%M%S") + ".sql"
    return Response(sql_text.encode("utf-8"), media_type="application/sql; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="%s"' % fname, **NO_STORE})


@app.get("/api/col/{name}")
def get_collection(name: Name):
    return _json(col_list(name))


@app.post("/api/col/{name}")
async def add_doc(name: Name, request: Request):
    body = await _body(request)
    return _json({"id": await run_in_threadpool(col_add, name, body)})


@app.get("/api/col/{name}/{doc_id}")
def get_doc(name: Name, doc_id: DocId):
    d = doc_get(name, doc_id)
    return _json({"exists": d is not None, "id": doc_id, "doc": d})


@app.patch("/api/col/{name}/{doc_id}")
async def patch_doc(name: Name, doc_id: DocId, request: Request):
    body = await _body(request)
    await run_in_threadpool(doc_update, name, doc_id, body)
    return _json({"ok": True})


@app.put("/api/col/{name}/{doc_id}")
async def put_doc(name: Name, doc_id: DocId, request: Request):
    body = await _body(request)
    await run_in_threadpool(doc_set, name, doc_id, body)
    return _json({"ok": True})


@app.delete("/api/col/{name}/{doc_id}")
def delete_doc(name: Name, doc_id: DocId):
    doc_delete(name, doc_id)
    return _json({"ok": True})


@app.post("/api/col/{name}/{doc_id}/acquire")
async def acquire_doc(name: Name, doc_id: DocId, request: Request):
    body = await _body(request)
    ok = await run_in_threadpool(doc_acquire, name, doc_id, body.get("holder") or "",
                                 body.get("ttlMs") or 20000)
    return _json({"acquired": ok})


def _save_upload(stored_name, raw):
    with open(os.path.join(UPLOADS_DIR, stored_name), "wb") as f:
        f.write(raw)


@app.post("/api/upload")
async def upload(request: Request):
    body = await _body(request)
    filename = os.path.basename(body.get("filename") or "fayl")
    try:
        raw = base64.b64decode(body.get("dataBase64") or "")
    except Exception:
        return _json({"error": "файл нотўғри"}, 400)
    stored_name = uuid.uuid4().hex[:10] + "-" + filename
    await run_in_threadpool(_save_upload, stored_name, raw)
    return _json({"id": stored_name, "url": "/uploads/" + stored_name})


@app.get("/uploads/{fname}", include_in_schema=False)
def get_upload(fname: str):
    path = os.path.join(UPLOADS_DIR, os.path.basename(fname))
    if not os.path.isfile(path):
        return _json({"error": "topilmadi"}, 404)
    return FileResponse(path)


# ====================== Webhook сервери (алоҳида порт) ======================
# Бу илова интернетга очилади, шунинг учун унда ФАҚАТ webhook бор.
webhook_app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@webhook_app.post(WEBHOOK_PATH)
async def bot_webhook(request: Request):
    bot, dp = BOT["bot"], BOT["dp"]
    if bot is None:
        return _json({"error": "bot tayyor emas"}, 503)
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not hmac.compare_digest(secret, WEBHOOK_SECRET):
        return _json({"error": "ruxsat yo'q"}, 403)
    update = Update.model_validate(await request.json(), context={"bot": bot})
    # Telegram'га дарҳол жавоб қайтарамиз, янгиланиш фонда қайта ишланади
    _spawn(dp.feed_update(bot, update))
    return _json({"ok": True})


def main():
    if not os.path.exists(HTML_PATH):
        print("ХАТО: frontend/index.html топилмади:", HTML_PATH)
        sys.exit(1)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    ip = local_ip()
    print("=" * 62)
    print(" Ишлаб чиқариш бошқарув маркази — сервер ишга тушмоқда")
    print("=" * 62)
    print(" Шу компьютерда очиш учун:      http://127.0.0.1:%d" % PORT)
    print(" Бошқа компьютерлардан очиш учун: http://%s:%d" % (ip, PORT))
    print(" База: PostgreSQL, акт файллари: %s" % UPLOADS_DIR)
    print(" Кириш: " + ("логин/пароль билан (APP_USER=%s)" % APP_USER if APP_PASSWORD
                        else "ПАРОЛСИЗ — фақат ишончли LAN'да ишлатинг (APP_PASSWORD йўқ)"))
    print(" Тўхтатиш учун: Ctrl+C")
    print("=" * 62, flush=True)
    # Бот вазифалари шу жараёнда — шунинг учун ҳамиша битта worker
    uvicorn.run(app, host=HOST, port=PORT, proxy_headers=True, forwarded_allow_ips="*")


if __name__ == "__main__":
    main()
