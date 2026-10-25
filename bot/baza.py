# -*- coding: utf-8 -*-
"""
Ишлаб чиқариш дастури (http://127.0.0.1:8642) билан боғланиш қатлами.

Бот дастурнинг ўз манзили (/api/col/<жадвал>) орқали ишлайди, data.json
файлига тўғридан-тўғри тегмайди.

  ЎҚИЙДИ:  items, stock, workshops, categories, customers, orders,
           sales, cashTransactions
  ЁЗАДИ:   фақат orders жадвалига ЯНГИ ёзув қўшади (POST).
           Ҳеч бир мавжуд ёзув ўзгартирилмайди ва ўчирилмайди.
"""
import asyncio
import json
import math
import re
import urllib.request
from datetime import datetime, timezone

from config import BAZA_URL, KATEGORIYALAR

STAGE_READY_IDX = 2  # дастурдаги "Тайёр омборда" босқичи


class BazaUlanmagan(Exception):
    """Эски версия билан мослик учун қолдирилган (энди ишлатилмайди)."""


class HaridorTopilmadi(Exception):
    """Диллер дастурдаги "Харидорлар" рўйхатидан топилмади."""


# ------------------------------------------------------------ HTTP
def _req(method, path, body=None):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(BAZA_URL.rstrip("/") + path, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    # 127.0.0.1 учун прокси ишлатилмайди
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(r, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8") or "null")


async def _col(name):
    return await asyncio.to_thread(_req, "GET", "/api/col/" + name) or []


def _num(x):
    try:
        return float(x or 0)
    except (TypeError, ValueError):
        return 0.0


def _r2(x):
    return math.floor(_num(x) * 100 + 0.5) / 100


# ------------------------------------------------------------ категория
# Дастурдаги DASH_WORKSHOPS билан бир хил калит ва калит сўзлар
_KEYS = [
    ("radiator", ["радиатор", "radiator"]),
    ("tokar", ["токар", "tokar"]),
    ("gaz", ["газ", "gaz"]),
    ("kumir", ["кумир", "комир", "кумур", "kumir", "komir"]),
]


def _norm(s):
    s = re.sub(r"[ʻʼ'`’‘]", "", str(s or "").lower())
    for a, b in (("ў", "у"), ("қ", "к"), ("ғ", "г"), ("ҳ", "х"), ("ё", "е")):
        s = s.replace(a, b)
    return s


def _key_from_text(text):
    n = _norm(text)
    for key, kws in _KEYS:
        if any(_norm(k) in n for k in kws):
            return key
    return ""


def _workshop_key(w):
    if w.get("dashKey") in [k for k, _ in _KEYS]:
        return w["dashKey"]
    return _key_from_text(w.get("name"))


# config.KATEGORIYALAR даги номлар -> калитлар (масалан "Газ катёл" -> "gaz")
_RUXSAT = {}
for _nom in KATEGORIYALAR:
    _k = _key_from_text(_nom)
    if _k:
        _RUXSAT[_k] = _nom


def _item_key(item, ws_by_id, cat_by_id):
    """Маҳсулот қайси категорияга тегишли: цех белгиси -> категория -> номи."""
    keys = {_workshop_key(ws_by_id[i]) for i in (item.get("workshopIds") or []) if i in ws_by_id}
    keys.discard("")
    if len(keys) == 1:
        return keys.pop()
    cat = cat_by_id.get(item.get("categoryId") or "")
    return (_key_from_text(cat.get("name")) if cat else "") or _key_from_text(item.get("name"))


def _is_bot_order(o):
    return o.get("source") == "telegram-bot"


def _reserved_map(orders):
    """Бот орқали қабул қилинган, ҳали сотилмаган ва бекор қилинмаган
    буюртмалардаги миқдорлар (банд қилинган қолдиқ)."""
    out = {}
    for o in orders:
        if not _is_bot_order(o) or o.get("cancelled") or o.get("completed"):
            continue
        for r in o.get("items") or []:
            if r.get("itemId"):
                out[r["itemId"]] = out.get(r["itemId"], 0.0) + _num(r.get("quantity"))
    return out


def _stock_map(stock):
    out = {}
    for s in stock:
        out[s.get("itemId")] = out.get(s.get("itemId"), 0.0) + _num(s.get("quantity"))
    return out


# ------------------------------------------------------------ харидор
def _tel(s):
    d = re.sub(r"\D", "", str(s or ""))
    return d[-9:] if len(d) >= 9 else ""


def _find_customer(customers, nom, tel):
    """Аввал телефон (охирги 9 рақам), кейин ном бўйича қидиради."""
    t = _tel(tel)
    if t:
        for c in customers:
            if _tel(c.get("phone")) == t:
                return c
    n = (nom or "").strip().lower()
    if n:
        for c in customers:
            if (c.get("name") or "").strip().lower() == n:
                return c
    return None


# ------------------------------------------------------------ 1) омбор
async def mahsulotlar():
    """
    Омбордаги тайёр маҳсулотлар (фақат config.KATEGORIYALAR ичидагилар).
    Қолдиқ = омбордаги сон − админ қабул қилган, ҳали сотилмаган бот
    буюртмалари. Тугаган маҳсулотлар ҳам 0 билан қайтади.
    [{"id": ..., "nom": "…", "kategoriya": "…", "qoldiq": 12}, ...]
    """
    items, stock, workshops, cats, orders = await asyncio.gather(
        _col("items"), _col("stock"), _col("workshops"), _col("categories"), _col("orders"))
    ws_by_id = {w.get("id"): w for w in workshops}
    cat_by_id = {c.get("id"): c for c in cats}
    qty = _stock_map(stock)
    band = _reserved_map(orders)
    out = []
    for it in items:
        if it.get("itemType") != "mahsulot":
            continue
        key = _item_key(it, ws_by_id, cat_by_id)
        if key not in _RUXSAT:
            continue
        out.append({"id": it.get("id"), "nom": it.get("name") or "—",
                    "kategoriya": _RUXSAT[key],
                    "qoldiq": max(0, int(math.floor(
                        qty.get(it.get("id"), 0.0) - band.get(it.get("id"), 0.0) + 1e-9)))})
    order = list(_RUXSAT)
    out.sort(key=lambda p: (order.index(_key_from_text(p["kategoriya"])), p["nom"]))
    return out


# ------------------------------------------------------------ 2) буюртма
async def buyurtma_yarat(diller_nom, diller_tel, raqam, sana, qatorlar):
    """
    Админ қабул қилган буюртмани дастурнинг "Харидор буюртмаси" бўлимига
    ЯНГИ ёзув қилиб қўшади. (дастурдаги рақам, ёзув id) қайтаради.
    qatorlar: [{"id": ..., "nom": "…", "soni": 3}, ...]
    """
    items, stock, workshops, cats, customers, orders = await asyncio.gather(
        _col("items"), _col("stock"), _col("workshops"), _col("categories"),
        _col("customers"), _col("orders"))
    cust = _find_customer(customers, diller_nom, diller_tel)
    if not cust:
        raise HaridorTopilmadi
    item_by_id = {i.get("id"): i for i in items}
    ws_by_id = {w.get("id"): w for w in workshops}
    cat_by_id = {c.get("id"): c for c in cats}
    qty = _stock_map(stock)

    rows, ready = [], True
    for q in qatorlar:
        it = item_by_id.get(q["id"])
        soni = _num(q["soni"])
        soni = int(soni) if soni == int(soni) else soni
        if not it or qty.get(it.get("id"), 0.0) < soni:
            ready = False
        # Нарх бот томонидан қўйилмайди — уни админ дастурда прайс орқали белгилайди
        rows.append({
            "itemId": it.get("id") if it else "", "product": (it.get("name") if it else q["nom"]) or q["nom"],
            "unit": (it.get("unit") if it else "") or "дона", "warehouseId": "", "priceListId": "",
            "quantity": soni, "price": 0, "subtotalAmount": 0, "discountPct": 0, "discountAmount": 0,
            "discountManual": False, "totalAmount": 0,
            "categoryKey": _item_key(it, ws_by_id, cat_by_id) if it else _key_from_text(q["nom"]),
            "vatRate": 12, "unitNoVat": 0, "noVatAmount": 0, "vatAmount": 0,
        })
    if not rows:
        raise ValueError("буюртмада маҳсулот йўқ")

    try:
        iso = datetime.strptime(sana, "%d.%m.%Y").strftime("%Y-%m-%d")
    except ValueError:
        iso = datetime.now().strftime("%Y-%m-%d")

    # Дастурдаги каби рақам: BUY-<йил>-<тартиб>; банд бўлса кейингиси олинади
    used = {str(o.get("orderNumber")) for o in orders}
    n = len(orders) + 1
    while True:
        number = "BUY-%s-%03d" % (iso[:4], n)
        if number not in used:
            break
        n += 1

    first = rows[0]
    data = {
        "orderNumber": number, "date": iso, "contractNumber": "", "contractDate": "",
        "customer": cust.get("name") or diller_nom, "customerId": cust.get("id") or "",
        "items": rows,
        "warehouseId": "", "itemId": first["itemId"], "product": first["product"],
        "quantity": first["quantity"], "unit": first["unit"], "priceListId": "", "price": 0,
        "subtotalAmount": 0, "discountAmount": 0, "totalAmount": 0, "vatAmount": 0,
        "priority": "orta", "dueDate": "", "paidAmount": 0, "debtAmount": 0,
        "responsibleEmployeeId": "", "workshopId": "",
        "notes": "Телеграм бот орқали: диллер буюртмаси №%s" % raqam,
        "currentStageIndex": STAGE_READY_IDX if ready else 1,
        "completed": False, "cancelled": False,
        "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "source": "telegram-bot",
    }
    res = await asyncio.to_thread(_req, "POST", "/api/col/orders", data)
    return number, (res or {}).get("id") or ""


async def bot_buyurtmalar():
    """Бот орқали тушган буюртмаларнинг дастурдаги ҳозирги ҳолати (фақат ўқийди)."""
    out = []
    for o in await _col("orders"):
        if not _is_bot_order(o):
            continue
        m = re.search(r"№\s*(\d+)", str(o.get("notes") or ""))
        out.append({"id": o.get("id"), "raqam": o.get("orderNumber"),
                    "bot_no": int(m.group(1)) if m else None,
                    "muddat": o.get("dueDate") or "",
                    "cancelled": bool(o.get("cancelled")), "completed": bool(o.get("completed"))})
    return out


# ------------------------------------------------------------ 3) акт сверка
async def akt_sverka(diller_nom, diller_tel, sana_dan, sana_gacha):
    """
    Солиштирма далолатномадаги каби: шу диллер (харидор)нинг сотувлари ва
    касса тўловлари. Фақат ўша харидорга тегишли ёзувлар қайтади.
      ([{"sana": "05.10.2026", "tur": "tovar" | "tolov", "izoh": "…", "summa": 1500000}, ...],
       давр бошига қолдиқ)  — қолдиқ мусбат бўлса диллер қарздор.
    """
    customers, sales, txs = await asyncio.gather(
        _col("customers"), _col("sales"), _col("cashTransactions"))
    cust = _find_customer(customers, diller_nom, diller_tel)
    if not cust:
        raise HaridorTopilmadi
    cid = cust.get("id")
    d1, d2 = sana_dan.isoformat(), sana_gacha.isoformat()
    out = []

    for t in txs:
        if t.get("cancelled"):
            continue
        if not ((t.get("counterpartyType") == "customer" and t.get("counterpartyId") == cid)
                or t.get("customerId") == cid):
            continue
        amt = _num(t.get("amount"))
        if not amt:
            continue
        date = t.get("date") or (t.get("createdAt") or "")[:10]
        kirim = t.get("direction") == "kirim"
        out.append({"_d": date, "_c": t.get("createdAt") or "", "tur": "tolov",
                    "izoh": t.get("description") or ("Тўлов" if kirim else "Қайтарилган пул"),
                    "summa": amt if kirim else -amt})

    for s in sales:
        if s.get("customerId") != cid or s.get("cancelled"):
            continue
        date = s.get("date") or (s.get("createdAt") or "")[:10]
        parts = []
        for it in s.get("items") or []:
            q = _num(it.get("qty"))
            parts.append("%s × %s = %s" % (it.get("name") or "—",
                                           int(q) if q == int(q) else q,
                                           _sum(it.get("lineTotal"))))
        nom = "Сотув" + ((" №%s" % s.get("saleNumber")) if s.get("saleNumber") else "")
        out.append({"_d": date, "_c": s.get("createdAt") or "", "tur": "tovar",
                    "izoh": nom + (":\n   " + "\n   ".join(parts) + "\n   Жами" if parts else ""),
                    "summa": _num(s.get("totalWithVat"))})

    boshi = sum((e["summa"] if e["tur"] == "tovar" else -e["summa"]) for e in out if e["_d"] < d1)
    out = [e for e in out if d1 <= e["_d"] <= d2]
    out.sort(key=lambda e: (e["_d"], e["_c"]))
    for e in out:
        y, m, d = (e.pop("_d") + "--").split("-")[:3]
        e.pop("_c")
        e["sana"] = "%s.%s.%s" % (d, m, y)
    return out, boshi


def _sum(x):
    return ("%.0f" % _r2(x)) if _r2(x) == int(_r2(x)) else ("%.2f" % _r2(x))
