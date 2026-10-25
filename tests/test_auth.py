# -*- coding: utf-8 -*-
"""APP_PASSWORD берилганда саҳифа ва API фақат логин/пароль билан очилиши."""
import base64
import urllib.error
import urllib.request

_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def get(base, path, auth=None):
    headers = {}
    if auth:
        headers["Authorization"] = "Basic " + base64.b64encode(auth.encode()).decode()
    try:
        with _opener.open(urllib.request.Request(base + path, headers=headers), timeout=15) as r:
            return r.status, r.headers
    except urllib.error.HTTPError as e:
        return e.code, e.headers


def test_without_password_is_rejected(auth_server):
    for path in ("/", "/api/col/customers", "/api/export/mysql", "/uploads/x.pdf", "/docs"):
        status, headers = get(auth_server, path)
        assert status == 401, path
        assert headers["WWW-Authenticate"].startswith("Basic")


def test_wrong_password_is_rejected(auth_server):
    assert get(auth_server, "/api/col/customers", "ci:xato")[0] == 401
    assert get(auth_server, "/api/col/customers", "boshqa:ci-secret")[0] == 401
    assert get(auth_server, "/api/col/customers", "ci")[0] == 401


def test_correct_password_works(auth_server):
    assert get(auth_server, "/", "ci:ci-secret")[0] == 200
    assert get(auth_server, "/api/col/customers", "ci:ci-secret")[0] == 200


def test_healthcheck_is_open(auth_server):
    assert get(auth_server, "/healthz")[0] == 200
