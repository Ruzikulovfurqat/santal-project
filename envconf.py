# -*- coding: utf-8 -*-
"""
.env файлини ўқиш (фақат Python стандарт кутубхонаси, pip install шарт эмас).

Формат: ҳар қаторда KEY=VALUE; "#" билан бошланган қаторлар — изоҳ.
Тизимда аллақачон берилган ўзгарувчилар (export қилинган) .env'дагидан
устун туради — .env фақат етишмаганларини тўлдиради.
"""
import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


def load(path=None):
    path = path or os.path.join(ROOT_DIR, ".env")
    if not os.path.isfile(path):
        return False
    with open(path, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].lstrip()
            key, sep, val = line.partition("=")
            key, val = key.strip(), val.strip()
            if not sep or not key:
                continue
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            elif " #" in val:
                val = val.split(" #", 1)[0].rstrip()
            os.environ.setdefault(key, val)
    return True
