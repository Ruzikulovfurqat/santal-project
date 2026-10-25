# -*- coding: utf-8 -*-
# Бот созламалари — барчаси лойиҳа папкасидаги .env файлидан ўқилади
# (намуна: .env.example). Маълумотлар базаси (PostgreSQL) созламалари
# pgstore.py'да — дастур билан бир хил.
import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import envconf  # noqa: E402

envconf.load()

# Бот токени (админ ҳам шу токен орқали /admin буйруғи билан киради)
TOKEN = os.environ.get("BOT_TOKEN", "").strip()
if not TOKEN:
    sys.exit("ХАТО: BOT_TOKEN .env файлида кўрсатилмаган.")

# Эски версиядаги SQLite базаси: топилса (ва PostgreSQL'даги бот жадваллари
# бўш бўлса) биринчи ишга тушишда PostgreSQL'га кўчирилади.
OLD_SQLITE_DB = [os.path.join(ROOT_DIR, "bot", "bot.db"), os.path.join(ROOT_DIR, "baza", "bot.db")]
