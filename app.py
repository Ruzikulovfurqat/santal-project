#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ишлаб чиқариш бошқарув маркази — локал тармоқ (LAN) сервери.

Фақат Python стандарт кутубхонаси ишлатилади — ҳеч нарса ўрнатиш шарт эмас
(pip install керак эмас). Windows, macOS ва Linux'да бир хил ишлайди.

ИШГА ТУШИРИШ:
    python3 app.py
    (Windows'да: python app.py)

Сервер ишга тушгач терминалда икки хил манзил кўрсатилади:
  - http://127.0.0.1:8642        — фақат шу компьютердан очиш учун
  - http://<бу-компьютернинг-IP>:8642 — бир хил Wi-Fi/LAN тармоғидаги
    БОШҚА компьютерлардан очиш учун (масалан http://192.168.1.25:8642)

Барча компьютерлар БИР ХИЛ маълумотлар базасини (шу папкадаги "baza"
папкасидаги data.json файлини) кўради ва бирга ишлайди — ким киритган
бўлса, бошқалар ҳам дарҳол (2 сониягача) кўради.

Админ ҳуқуқи тизимнинг ўзида (Админ PIN, стандарт: 0000) бошқарилади — уни
биладиган ҳар қандай компьютер "Админ" тугмаси орқали шу ҳуқуққа эга бўлади.
PIN'ни "Омборлар → Бошқарув" бўлимидан ўзгартириш мумкин.

МУҲИМ — БАЗА АЛОҲИДА ПАПКАДА: барча маълумот (буюртмалар, омбор, касса,
акт файллари — ҳаммаси) app.py ва app.html билан БИР ЖОЙДА эмас, балки
шу папка ичидаги алоҳида "baza" номли папкада сақланади. Шунинг учун
тизимга янгилаш киритилганда (app.py ва/ёки app.html файллари янги
версия билан алмаштирилганда), "baza" папкасига умуман тегилмайди — уни
эски жойида қолдирсангиз, ичидаги барча маълумот бутунлигича сақланиб
қолади. Агар олдинги версияда data.json файли шу папканинг ўзида (baza
папкасисиз) сақланган бўлса, дастур биринчи ишга тушишда уни ўзи
автоматик равишда "baza" папкасига кўчиради — ҳеч нарса йўқолмайди.
"""
import base64
import json
import mimetypes
import os
import re
import socket
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, "app.html")

# Маълумотлар базаси (data.json + uploads) ҳамиша app.py/app.html'дан
# АЛОҲИДА "baza" папкасида сақланади — шунда тизимни янгилаш (app.py ва
# app.html файлларини алмаштириш) ҳеч қачон ичидаги маълумотга тегмайди:
# "baza" папкаси ўз жойида, ўзгаришсиз қолаверади.
DATA_DIR = os.path.join(BASE_DIR, "baza")
DATA_PATH = os.path.join(DATA_DIR, "data.json")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
PORT = int(os.environ.get("PORT", "8642"))

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

_lock = threading.RLock()


def _empty_store():
    return {"_collections": {}, "_locks": {}}


def _load_store():
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                data.setdefault("_collections", {})
                data.setdefault("_locks", {})
                return data
        except Exception as e:
            # Файл шикастланган бўлса ҳам, мавжуд маълумотни ҳеч қачон жим
            # ўчириб ташламаймиз — уни зaxира номи билан ёнига қолдирамиз
            # ва фақат шундан кейин бўш ҳолатдан бошлаймиз.
            backup = DATA_PATH + ".corrupt-" + str(int(time.time()))
            try:
                os.rename(DATA_PATH, backup)
                print("ОГОҲЛАНТИРИШ: data.json ўқилмади, эски файл сақланди:", backup)
                print("Хато:", e)
            except Exception:
                pass
    return _empty_store()


STORE = _load_store()


def _save_store():
    tmp = DATA_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(STORE, f, ensure_ascii=False, indent=1)
    os.replace(tmp, DATA_PATH)


def _col(name):
    return STORE["_collections"].setdefault(name, [])


def _find(name, doc_id):
    for d in _col(name):
        if d.get("id") == doc_id:
            return d
    return None


def col_list(name):
    with _lock:
        return list(_col(name))


def col_add(name, fields):
    with _lock:
        doc_id = uuid.uuid4().hex[:14]
        doc = dict(fields or {})
        doc["id"] = doc_id
        _col(name).append(doc)
        _save_store()
        return doc_id


def doc_get(name, doc_id):
    with _lock:
        d = _find(name, doc_id)
        return dict(d) if d else None


def doc_update(name, doc_id, patch):
    """Firestore .update() семантикаси: ҳужжат мавжуд бўлиши керак, фақат
    берилган майдонлар устига ёзилади. Мавжуд бўлмаса (масалан, боshqa
    компьютер уни ўчириб улгурган бўлса), жим яратамиз — ёзувни йўқотиб
    қўймаслик учун."""
    with _lock:
        d = _find(name, doc_id)
        if d is None:
            d = {"id": doc_id}
            _col(name).append(d)
        d.update(patch or {})
        d["id"] = doc_id
        _save_store()
        return True


def doc_set(name, doc_id, fields):
    """Иловадаги dbSet() худди шу семантикани кутади: мавжуд бўлса устига
    (мерж) ёзилади, бўлмаса шу id билан янги ҳужжат яратилади."""
    with _lock:
        d = _find(name, doc_id)
        if d is None:
            d = {"id": doc_id}
            _col(name).append(d)
        d.update(fields or {})
        d["id"] = doc_id
        _save_store()
        return True


def doc_delete(name, doc_id):
    with _lock:
        arr = _col(name)
        before = len(arr)
        arr[:] = [d for d in arr if d.get("id") != doc_id]
        if len(arr) != before:
            _save_store()
        return True


def doc_acquire(name, doc_id, holder, ttl_ms):
    with _lock:
        key = name + "/" + doc_id
        now_ms = time.time() * 1000.0
        locks = STORE.setdefault("_locks", {})
        cur = locks.get(key)
        if cur and cur.get("expires", 0) > now_ms and cur.get("holder") != holder:
            return False
        locks[key] = {"holder": holder, "expires": now_ms + (ttl_ms or 20000)}
        _save_store()
        return True


NAME_RE = r"[A-Za-z0-9_]+"
ID_RE = r"[A-Za-z0-9_\-]+"
RE_COL = re.compile(r"^/api/col/(" + NAME_RE + r")$")
RE_DOC = re.compile(r"^/api/col/(" + NAME_RE + r")/(" + ID_RE + r")$")
RE_ACQUIRE = re.compile(r"^/api/col/(" + NAME_RE + r")/(" + ID_RE + r")/acquire$")
RE_UPLOAD = re.compile(r"^/api/upload$")
RE_UPLOADS_FILE = re.compile(r"^/uploads/([^/]+)$")
RE_EXPORT_MYSQL = re.compile(r"^/api/export/mysql$")


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
    with _lock:
        collections = dict(STORE.get("_collections", {}))
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
    mtime = os.path.getmtime(HTML_PATH)
    if _HTML_CACHE["mtime"] == mtime and _HTML_CACHE["html"] is not None:
        return _HTML_CACHE["html"]
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        raw = f.read()
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


class Handler(BaseHTTPRequestHandler):
    server_version = "IshlabChiqarishLAN/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status, html_str):
        body = html_str.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        try:
            with open(path, "rb") as f:
                data = f.read()
        except FileNotFoundError:
            self._send_json(404, {"error": "topilmadi"})
            return
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_mysql_dump(self):
        try:
            sql_text = build_mysql_dump()
        except Exception as e:
            self._send_json(500, {"error": "eksport xatosi: " + str(e)})
            return
        body = sql_text.encode("utf-8")
        fname = "ishlab_chiqarish_baza_" + time.strftime("%Y%m%d_%H%M%S") + ".sql"
        self.send_response(200)
        self.send_header("Content-Type", "application/sql; charset=utf-8")
        self.send_header("Content-Disposition", 'attachment; filename="%s"' % fname)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed_path = self.path.split("?", 1)[0]
        if parsed_path == "/" or parsed_path == "/index.html" or parsed_path == "/app.html":
            self._send_html(200, get_html())
            return
        if RE_EXPORT_MYSQL.match(parsed_path):
            self._send_mysql_dump()
            return
        m = RE_DOC.match(parsed_path)
        if m:
            name, doc_id = m.group(1), m.group(2)
            d = doc_get(name, doc_id)
            if d is None:
                self._send_json(200, {"exists": False, "id": doc_id, "doc": None})
            else:
                self._send_json(200, {"exists": True, "id": doc_id, "doc": d})
            return
        m = RE_COL.match(parsed_path)
        if m:
            self._send_json(200, col_list(m.group(1)))
            return
        m = RE_UPLOADS_FILE.match(parsed_path)
        if m:
            safe_name = os.path.basename(m.group(1))
            self._send_file(os.path.join(UPLOADS_DIR, safe_name))
            return
        self._send_json(404, {"error": "topilmadi"})

    def do_POST(self):
        parsed_path = self.path.split("?", 1)[0]
        m = RE_ACQUIRE.match(parsed_path)
        if m:
            name, doc_id = m.group(1), m.group(2)
            body = self._read_json_body()
            ok = doc_acquire(name, doc_id, body.get("holder") or "", body.get("ttlMs") or 20000)
            self._send_json(200, {"acquired": ok})
            return
        if RE_UPLOAD.match(parsed_path):
            body = self._read_json_body()
            filename = os.path.basename(body.get("filename") or "fayl")
            data_b64 = body.get("dataBase64") or ""
            try:
                raw = base64.b64decode(data_b64)
            except Exception:
                self._send_json(400, {"error": "файл нотўғри"})
                return
            stored_name = uuid.uuid4().hex[:10] + "-" + filename
            with open(os.path.join(UPLOADS_DIR, stored_name), "wb") as f:
                f.write(raw)
            self._send_json(200, {"id": stored_name, "url": "/uploads/" + stored_name})
            return
        m = RE_COL.match(parsed_path)
        if m:
            name = m.group(1)
            body = self._read_json_body()
            doc_id = col_add(name, body)
            self._send_json(200, {"id": doc_id})
            return
        self._send_json(404, {"error": "топилмади"})

    def do_PATCH(self):
        parsed_path = self.path.split("?", 1)[0]
        m = RE_DOC.match(parsed_path)
        if m:
            name, doc_id = m.group(1), m.group(2)
            body = self._read_json_body()
            doc_update(name, doc_id, body)
            self._send_json(200, {"ok": True})
            return
        self._send_json(404, {"error": "топилмади"})

    def do_PUT(self):
        parsed_path = self.path.split("?", 1)[0]
        m = RE_DOC.match(parsed_path)
        if m:
            name, doc_id = m.group(1), m.group(2)
            body = self._read_json_body()
            doc_set(name, doc_id, body)
            self._send_json(200, {"ok": True})
            return
        self._send_json(404, {"error": "топилмади"})

    def do_DELETE(self):
        parsed_path = self.path.split("?", 1)[0]
        m = RE_DOC.match(parsed_path)
        if m:
            name, doc_id = m.group(1), m.group(2)
            doc_delete(name, doc_id)
            self._send_json(200, {"ok": True})
            return
        self._send_json(404, {"error": "топилмади"})


def main():
    if not os.path.exists(HTML_PATH):
        print("ХАТО: app.html топилмади:", HTML_PATH)
        sys.exit(1)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    ip = local_ip()
    print("=" * 62)
    print(" Ишлаб чиқариш бошқарув маркази — LAN сервери ишга тушди")
    print("=" * 62)
    print(" Шу компьютерда очиш учун:      http://127.0.0.1:%d" % PORT)
    print(" Бошқа компьютерлардан очиш учун: http://%s:%d" % (ip, PORT))
    print(" База папкаси (маълумотлар шу ерда): %s" % DATA_DIR)
    print(" Тўхтатиш учун: Ctrl+C")
    print("=" * 62)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер тўхтатилди.")


if __name__ == "__main__":
    main()
