# -*- coding: utf-8 -*-
"""
frontend/ папкасидаги файллардан дастурнинг ягона HTML саҳифасини йиғади.

frontend/index.html — саҳифа қобиғи, ичидаги белгилар ўрнига файллар қўйилади:
    {{include:styles.css}}      — файл матни
    {{base64:assets/logo.png}}  — файлнинг base64 кўриниши (data: URI учун)
    {{js}}                      — frontend/js/*.js файллари номи тартибида

Барча js/ файллар БИТТА <script> ичида, кетма-кет уланади — улар битта
умумий (function(){ ... })() ичидаги бўлимлар: 000-iife-start.js очади,
990-iife-end.js ёпади. Шунинг учун бир бўлимдаги функция ва ўзгарувчилар
бошқа бўлимларда ҳам аввалгидек кўринади.

Ягона HTML файл керак бўлса (масалан текшириш учун):
    python frontend_build.py dist/app.html      (ёки: make html)
"""
import base64
import os
import re
import sys

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
JS_DIR = os.path.join(FRONTEND_DIR, "js")
INDEX_PATH = os.path.join(FRONTEND_DIR, "index.html")

_MARK = re.compile(r"\{\{(include|base64):([^}]+)\}\}|\{\{js\}\}")


def _read(rel):
    with open(os.path.join(FRONTEND_DIR, rel), "r", encoding="utf-8", newline="") as f:
        return f.read()


def js_files():
    return sorted(f for f in os.listdir(JS_DIR) if f.endswith(".js"))


def mtime():
    """frontend/ ичидаги энг охирги ўзгариш вақти (кэшни янгилаш учун)."""
    latest = 0.0
    for root, _dirs, files in os.walk(FRONTEND_DIR):
        for name in files:
            latest = max(latest, os.path.getmtime(os.path.join(root, name)))
    return latest


def assemble():
    def put(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "include":
            return _read(arg)
        if kind == "base64":
            with open(os.path.join(FRONTEND_DIR, arg), "rb") as f:
                return base64.b64encode(f.read()).decode("ascii")
        return "".join(_read(os.path.join("js", name)) for name in js_files())

    return _MARK.sub(put, _read("index.html"))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Ишлатиш: python frontend_build.py <чиқиш-файли.html>")
    out = sys.argv[1]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="") as f:
        f.write(assemble())
    print("Йиғилди:", out)
