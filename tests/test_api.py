# -*- coding: utf-8 -*-
"""Дастурнинг HTTP API'си: app.html кутадиган шакл ва хатти-ҳаракат."""
import base64
import json
import os
import urllib.error
import urllib.request

from conftest import ROOT

DATA_JSON = os.path.join(ROOT, "baza", "data.json")
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def call(base, method, path, body=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(base + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with _opener.open(req, timeout=15) as r:
            payload = r.read()
            ctype = r.headers.get_content_type()
            return r.status, r.headers, (json.loads(payload) if ctype == "application/json" else payload)
    except urllib.error.HTTPError as e:
        return e.code, e.headers, json.loads(e.read())


def test_data_json_imported_exactly(server):
    with open(DATA_JSON, encoding="utf-8") as f:
        src = json.load(f)["_collections"]
    for name, docs in src.items():
        status, headers, got = call(server, "GET", "/api/col/" + name)
        assert status == 200
        assert headers["Cache-Control"] == "no-store"
        assert got == docs, name


def test_crud(server):
    status, _, res = call(server, "POST", "/api/col/ciSmoke", {"a": 1, "b": "x"})
    assert status == 200
    doc_id = res["id"]
    call(server, "PATCH", "/api/col/ciSmoke/" + doc_id, {"b": "y", "c": [1, 2]})
    call(server, "PUT", "/api/col/ciSmoke/fixed1", {"k": "v"})
    _, _, got = call(server, "GET", "/api/col/ciSmoke/" + doc_id)
    assert got == {"exists": True, "id": doc_id, "doc": {"id": doc_id, "a": 1, "b": "y", "c": [1, 2]}}
    _, _, lst = call(server, "GET", "/api/col/ciSmoke")
    assert [d["id"] for d in lst] == [doc_id, "fixed1"]  # қўшилиш тартиби сақланади
    call(server, "DELETE", "/api/col/ciSmoke/" + doc_id)
    call(server, "DELETE", "/api/col/ciSmoke/fixed1")
    assert call(server, "GET", "/api/col/ciSmoke")[2] == []
    assert call(server, "GET", "/api/col/ciSmoke/" + doc_id)[2] == {"exists": False, "id": doc_id, "doc": None}


def test_acquire_lock(server):
    path = "/api/col/ciSmoke/lockdoc/acquire"
    assert call(server, "POST", path, {"holder": "h1"})[2] == {"acquired": True}
    assert call(server, "POST", path, {"holder": "h2"})[2] == {"acquired": False}
    assert call(server, "POST", path, {"holder": "h1"})[2] == {"acquired": True}


def test_errors(server):
    assert call(server, "GET", "/api/col/bad-name!") [:3:2] == (404, {"error": "topilmadi"})
    assert call(server, "GET", "/nope")[:3:2] == (404, {"error": "topilmadi"})
    status, _, res = call(server, "POST", "/api/col/ciBadJson", raw=b"{not json")
    assert status == 200  # аввалгидек: нотўғри JSON — бўш ҳужжат
    call(server, "DELETE", "/api/col/ciBadJson/" + res["id"])


def test_upload(server):
    body = {"filename": "../ci.txt", "mime": "text/plain", "dataBase64": base64.b64encode(b"hello").decode()}
    _, _, up = call(server, "POST", "/api/upload", body)
    try:
        assert up["id"].endswith("-ci.txt")  # йўл (../) олиб ташланади
        assert call(server, "GET", up["url"])[2] == b"hello"
    finally:
        os.remove(os.path.join(ROOT, "baza", "uploads", up["id"]))
    assert call(server, "GET", "/uploads/none.pdf")[0] == 404


def test_html_and_export(server):
    status, headers, html = call(server, "GET", "/")
    assert status == 200 and headers["Cache-Control"] == "no-store"
    assert b"window.claude.use" in html and b"{{js}}" not in html
    status, headers, dump = call(server, "GET", "/api/export/mysql")
    assert status == 200 and "attachment" in headers["Content-Disposition"]
    assert b"CREATE TABLE `orders`" in dump
