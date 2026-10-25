# -*- coding: utf-8 -*-
"""
Диллерлар боти (битта бот: админ + диллер).
Дастур (app.py) ичида polling орқали ишлайди — алоҳида ишга тушириш шарт эмас.
Админ кириши:  /admin  → бот токенини юборади.
"""
import asyncio
import calendar
import logging
from contextlib import contextmanager
import os
import re
import sqlite3
from datetime import date, datetime, timedelta

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import BaseFilter, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, InlineKeyboardButton as IB,
                           InlineKeyboardMarkup as IM, KeyboardButton as KB,
                           Message, ReplyKeyboardMarkup as RM,
                           ReplyKeyboardRemove)

from psycopg.rows import dict_row

import baza
import pgstore
from config import OLD_SQLITE_DB, TOKEN

# ---------------------------------------------------------------- база (ботники)
# Ботнинг ўз жадваллари дастур билан БИР ХИЛ PostgreSQL базасида, "bot" схемасида
# (жадваллар migrations/ орқали яратилади).
TABLES = ("admins", "users", "dealers", "prices", "price_items", "orders", "order_items")
SERIAL_TABLES = ("dealers", "prices", "price_items", "orders")

db = pgstore.make_pool(max_size=4, autocommit=True, row_factory=dict_row,
                       options="-c search_path=bot")


@contextmanager
def tx():
    """Бир нечта ёзув битта транзакцияда: ё ҳаммаси сақланади, ё ҳеч бири."""
    with db.connection() as conn, conn.transaction():
        yield conn


def import_sqlite():
    """Эски bot.db (SQLite) маълумотларини PostgreSQL'га кўчиради — фақат
    бот жадваллари ҳали бўш бўлса. SQLite файлининг ўзига тегилмайди."""
    path = next((p for p in OLD_SQLITE_DB if os.path.isfile(p)), None)
    if not path:
        return
    with tx() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(%s)", (pgstore.SCHEMA_LOCK_ID,))
        if any(conn.execute(f"SELECT EXISTS (SELECT 1 FROM {t})").fetchone()["exists"] for t in TABLES):
            return
        old = sqlite3.connect(path)
        old.row_factory = sqlite3.Row
        have = {r[0] for r in old.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        jami = 0
        for t in TABLES:
            if t not in have:
                continue
            data = [dict(r) for r in old.execute(f"SELECT * FROM {t}")]
            if not data:
                continue
            cols = list(data[0].keys())
            sql = (f"INSERT INTO {t}({','.join(cols)}) VALUES({','.join(['%s'] * len(cols))})"
                   " ON CONFLICT DO NOTHING")
            conn.cursor().executemany(sql, [tuple(r[c] for c in cols) for r in data])
            jami += len(data)
        old.close()
        for t in SERIAL_TABLES:
            conn.execute(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), "
                         f"COALESCE((SELECT MAX(id) FROM {t}), 0) + 1, false)")
    logging.info("Эски %s PostgreSQL'га кўчирилди: %d та қатор", path, jami)


def q(sql, *a):
    with db.connection() as conn:
        return conn.execute(sql, a).rowcount


def one(sql, *a):
    with db.connection() as conn:
        return conn.execute(sql, a).fetchone()


def rows(sql, *a):
    with db.connection() as conn:
        return conn.execute(sql, a).fetchall()


def tel(s):
    """Телефон рақамини солиштириш учун охирги 9 та рақамга келтиради."""
    d = re.sub(r"\D", "", s or "")
    return d[-9:] if len(d) >= 9 else ""


def is_admin(cid):
    return one("SELECT 1 FROM admins WHERE chat_id=%s", cid) is not None


def dealer_of(cid):
    return one("SELECT * FROM dealers WHERE chat_id=%s", cid)


def lang_of(cid):
    r = one("SELECT lang FROM users WHERE chat_id=%s", cid)
    return r["lang"] if r and r["lang"] else "uz"


def admin_ids():
    return [r["chat_id"] for r in rows("SELECT chat_id FROM admins")]


# ---------------------------------------------------------------- матнлар
T = {
    "ask_phone": {"uz": "Телефон рақамингизни пастдаги тугма орқали юборинг.",
                  "ru": "Отправьте свой номер телефона кнопкой ниже."},
    "btn_phone": {"uz": "📱 Рақамни юбориш", "ru": "📱 Отправить номер"},
    "own_phone": {"uz": "Фақат ўз рақамингизни тугма орқали юборинг.",
                  "ru": "Отправьте только свой номер через кнопку."},
    "not_dealer": {"uz": "Сиз диллер эмассиз.", "ru": "Вы не являетесь дилером."},
    "welcome": {"uz": "Хуш келибсиз, {n}!", "ru": "Добро пожаловать, {n}!"},
    "m_order": {"uz": "🛒 Буюртмалар", "ru": "🛒 Заказы"},
    "m_price": {"uz": "💰 Прайс", "ru": "💰 Прайс"},
    "m_akt": {"uz": "📑 Акт сверка", "ru": "📑 Акт сверки"},
    "m_admin": {"uz": "✉️ Админ билан алоқа", "ru": "✉️ Связь с админом"},
    "no_baza": {"uz": "⚠️ База ҳали уланмаган. Админга мурожаат қилинг.",
                "ru": "⚠️ База ещё не подключена. Обратитесь к админу."},
    "no_cust": {"uz": "⚠️ Сиз дастурдаги харидорлар рўйхатига боғланмагансиз. Админга мурожаат қилинг.",
                "ru": "⚠️ Вы не привязаны к списку покупателей в программе. Обратитесь к админу."},
    "baza_err": {"uz": "⚠️ База билан боғланиб бўлмади. Кейинроқ уриниб кўринг.",
                 "ru": "⚠️ Не удалось связаться с базой. Попробуйте позже."},
    "choose_prod": {"uz": "Маҳсулотни танланг (номи — қолдиғи):",
                    "ru": "Выберите товар (название — остаток):"},
    "no_prod": {"uz": "Омборда маҳсулот йўқ.", "ru": "На складе нет товаров."},
    "ask_qty": {"uz": "{n}\nОмборда: {s} та. Сонини киритинг:",
                "ru": "{n}\nНа складе: {s} шт. Введите количество:"},
    "bad_qty": {"uz": "Нотўғри сон. 1 дан {s} гача сон киритинг.",
                "ru": "Неверное количество. Введите число от 1 до {s}."},
    "cart": {"uz": "Саватча:", "ru": "Корзина:"},
    "send_order": {"uz": "✅ Буюртмани жўнатиш", "ru": "✅ Отправить заказ"},
    "cancel": {"uz": "❌ Бекор қилиш", "ru": "❌ Отмена"},
    "cancelled": {"uz": "Бекор қилинди.", "ru": "Отменено."},
    "order_sent": {"uz": "Буюртма №{i} ({d}) админга юборилди.",
                   "ru": "Заказ №{i} ({d}) отправлен админу."},
    "order_ok": {"uz": "✅ Буюртма №{i} қабул қилинди.",
                 "ru": "✅ Заказ №{i} принят."},
    "order_no": {"uz": "❌ Буюртма №{i} бекор қилинди.\nСабаб: {r}",
                 "ru": "❌ Заказ №{i} отменён.\nПричина: {r}"},
    "order_due": {"uz": "📅 Буюртма №{i}: маҳсулотингиз {d} гача тайёр бўлади.",
                  "ru": "📅 Заказ №{i}: ваш товар будет готов до {d}."},
    "no_stock": {"uz": "Бу маҳсулот омборда тугаган.", "ru": "Этого товара нет на складе."},
    "no_price": {"uz": "Ҳозирча прайс йўқ.", "ru": "Прайсов пока нет."},
    "prices": {"uz": "Прайслар рўйхати:", "ru": "Список прайсов:"},
    "akt_from": {"uz": "Даврни танланг ёки бошланиш санасини белгиланг:",
                 "ru": "Выберите период или укажите дату начала:"},
    "akt_to": {"uz": "Бошланиш: {a}\nТугаш санасини танланг:",
               "ru": "Начало: {a}\nВыберите дату окончания:"},
    "p_today": {"uz": "Бугун", "ru": "Сегодня"},
    "p_tm": {"uz": "Шу ой", "ru": "Этот месяц"},
    "p_lm": {"uz": "Ўтган ой", "ru": "Прошлый месяц"},
    "p_ty": {"uz": "Шу йил", "ru": "Этот год"},
    "akt_open": {"uz": "Давр бошига қолдиқ", "ru": "Остаток на начало периода"},
    "akt_debt": {"uz": "Жами қарздорлик", "ru": "Итого задолженность"},
    "akt_credit": {"uz": "Жами ҳақдорлик", "ru": "Итого переплата"},
    "akt_zero": {"uz": "Қарздорлик йўқ", "ru": "Задолженности нет"},
    "bad_date": {"uz": "Сана нотўғри. Намуна: 01.10.2026",
                 "ru": "Неверная дата. Пример: 01.10.2026"},
    "akt_empty": {"uz": "Бу даврда ёзувлар йўқ.", "ru": "За этот период записей нет."},
    "akt_title": {"uz": "Акт сверка {a} — {b}", "ru": "Акт сверки {a} — {b}"},
    "akt_goods": {"uz": "Олинган товар", "ru": "Получено товара"},
    "akt_paid": {"uz": "Тўланган", "ru": "Оплачено"},
    "to_admin": {"uz": "Админга хабар, расм ёки видео юборинг:",
                 "ru": "Отправьте админу сообщение, фото или видео:"},
    "sent": {"uz": "✅ Юборилди.", "ru": "✅ Отправлено."},
    "from_admin": {"uz": "📩 Админдан хабар:", "ru": "📩 Сообщение от админа:"},
    "use_menu": {"uz": "Менюдан танланг.", "ru": "Выберите из меню."},
}


def t(key, lang, **kw):
    return T[key][lang].format(**kw)


def both(key):
    return {T[key]["uz"], T[key]["ru"]}


A_DEALERS = "👥 Диллерга рухсат бериш"
A_MSG = "✉️ Диллер билан алоқа"
A_PRICE = "💰 Прайс"


def admin_menu():
    return RM(keyboard=[[KB(text=A_DEALERS)], [KB(text=A_MSG)], [KB(text=A_PRICE)]],
              resize_keyboard=True)


def dealer_menu(lang):
    return RM(keyboard=[[KB(text=t("m_order", lang)), KB(text=t("m_price", lang))],
                        [KB(text=t("m_akt", lang)), KB(text=t("m_admin", lang))]],
              resize_keyboard=True)


def kb(*lines):
    return IM(inline_keyboard=[[IB(text=a, callback_data=b) for a, b in ln] for ln in lines])


class St(StatesGroup):
    admin_token = State()
    d_name = State()
    d_phone = State()
    d_edit_name = State()
    d_edit_phone = State()
    msg_to_dealer = State()
    cancel_reason = State()
    p_number = State()
    p_date = State()
    pi_name = State()
    pi_price = State()
    pi_edit_name = State()
    pi_edit_price = State()
    qty = State()
    akt_from = State()
    akt_to = State()
    to_admin = State()


class IsAdmin(BaseFilter):
    async def __call__(self, ev) -> bool:
        return is_admin(ev.from_user.id)


class IsDealer(BaseFilter):
    async def __call__(self, ev) -> bool:
        return dealer_of(ev.from_user.id) is not None


common = Router()
admin = Router()
dealer = Router()
admin.message.filter(IsAdmin())
admin.callback_query.filter(IsAdmin())
dealer.message.filter(IsDealer())
dealer.callback_query.filter(IsDealer())


# ================================================================ УМУМИЙ
@common.message(Command("start"))
async def start(m: Message, state: FSMContext):
    await state.clear()
    if is_admin(m.from_user.id):
        return await m.answer("Админ менюси:", reply_markup=admin_menu())
    await m.answer("Тилни танланг / Выберите язык:",
                   reply_markup=kb([("🇺🇿 Ўзбекча", "lang:uz"), ("🇷🇺 Русский", "lang:ru")]))


@common.message(Command("admin"))
async def admin_login(m: Message, state: FSMContext):
    if is_admin(m.from_user.id):
        return await m.answer("Админ менюси:", reply_markup=admin_menu())
    await state.set_state(St.admin_token)
    await m.answer("Бот токенини юборинг:", reply_markup=ReplyKeyboardRemove())


@common.message(St.admin_token)
async def admin_token(m: Message, state: FSMContext):
    await state.clear()
    try:
        await m.delete()  # токен чатда қолмасин
    except Exception:
        pass
    if (m.text or "").strip() != TOKEN:
        return await m.answer("Токен нотўғри.")
    with tx() as conn:
        conn.execute("INSERT INTO admins(chat_id) VALUES(%s) ON CONFLICT DO NOTHING", (m.from_user.id,))
        conn.execute("UPDATE dealers SET chat_id=NULL WHERE chat_id=%s", (m.from_user.id,))
    await m.answer("✅ Сиз админсиз.", reply_markup=admin_menu())


@common.message(Command("chiqish"), IsAdmin())
async def admin_logout(m: Message, state: FSMContext):
    await state.clear()
    q("DELETE FROM admins WHERE chat_id=%s", m.from_user.id)
    await m.answer("Админликдан чиқдингиз. /start", reply_markup=ReplyKeyboardRemove())


@common.callback_query(F.data.startswith("lang:"))
async def set_lang(c: CallbackQuery):
    lang = c.data.split(":")[1]
    q("INSERT INTO users(chat_id,lang) VALUES(%s,%s) "
      "ON CONFLICT(chat_id) DO UPDATE SET lang=excluded.lang", c.from_user.id, lang)
    await c.message.delete()
    d = dealer_of(c.from_user.id)
    if d:
        await c.message.answer(t("welcome", lang, n=d["name"]), reply_markup=dealer_menu(lang))
    else:
        await c.message.answer(
            t("ask_phone", lang),
            reply_markup=RM(keyboard=[[KB(text=t("btn_phone", lang), request_contact=True)]],
                            resize_keyboard=True))
    await c.answer()


@common.message(F.contact)
async def got_contact(m: Message):
    if is_admin(m.from_user.id):
        return
    lang = lang_of(m.from_user.id)
    # Бошқа одамнинг рақамини юбориб кириб олмаслиги учун
    if m.contact.user_id != m.from_user.id:
        return await m.answer(t("own_phone", lang))
    p = tel(m.contact.phone_number)
    d = None
    for r in rows("SELECT * FROM dealers"):
        if p and tel(r["phone"]) == p:
            d = r
            break
    if not d:
        return await m.answer(t("not_dealer", lang), reply_markup=ReplyKeyboardRemove())
    with tx() as conn:
        conn.execute("UPDATE dealers SET chat_id=NULL WHERE chat_id=%s", (m.from_user.id,))
        conn.execute("UPDATE dealers SET chat_id=%s WHERE id=%s", (m.from_user.id, d["id"]))
    await m.answer(t("welcome", lang, n=d["name"]), reply_markup=dealer_menu(lang))


# ================================================================ АДМИН
def dealers_kb(prefix, with_new=False):
    lines = [[(("✅ " if r["chat_id"] else "⏳ ") + r["name"], f"{prefix}:{r['id']}")]
             for r in rows("SELECT * FROM dealers ORDER BY name")]
    if with_new:
        lines.append([("➕ Янги диллер", "d:new")])
    return kb(*lines)


@admin.message(F.text == A_DEALERS)
async def a_dealers(m: Message, state: FSMContext):
    await state.clear()
    await m.answer("Диллерлар рўйхати (✅ ботга кирган, ⏳ ҳали кирмаган):",
                   reply_markup=dealers_kb("d", True))


async def show_dealer(target: Message, did, edit=True):
    d = one("SELECT * FROM dealers WHERE id=%s", did)
    if not d:
        txt, mk = "Диллер топилмади.", kb([("⬅️ Орқага", "d:list")])
    else:
        txt = (f"👤 {d['name']}\n📞 {d['phone'] or 'рақам киритилмаган'}\n"
               f"Ҳолати: {'ботга кирган' if d['chat_id'] else 'ҳали кирмаган'}")
        mk = kb([("📞 Рақамни киритиш/ўзгартириш", f"dph:{did}")],
                [("✏️ Номини ўзгартириш", f"dnm:{did}")],
                [("🗑 Ўчириш", f"ddel:{did}")],
                [("⬅️ Орқага", "d:list")])
    if edit:
        await target.edit_text(txt, reply_markup=mk)
    else:
        await target.answer(txt, reply_markup=mk)


@admin.callback_query(F.data == "d:list")
async def cb_d_list(c: CallbackQuery, state: FSMContext):
    await state.clear()
    await c.message.edit_text("Диллерлар рўйхати (✅ ботга кирган, ⏳ ҳали кирмаган):",
                              reply_markup=dealers_kb("d", True))
    await c.answer()


@admin.callback_query(F.data == "d:new")
async def cb_d_new(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.d_name)
    await c.message.answer("Янги диллер номини киритинг:")
    await c.answer()


@admin.callback_query(F.data.regexp(r"^d:\d+$"))
async def cb_d_open(c: CallbackQuery, state: FSMContext):
    await state.clear()
    await show_dealer(c.message, int(c.data.split(":")[1]))
    await c.answer()


@admin.callback_query(F.data.startswith("dph:"))
async def cb_d_phone(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.d_edit_phone)
    await state.update_data(did=int(c.data.split(":")[1]))
    await c.message.answer("Диллер телефон рақамини киритинг (масалан +998901234567):")
    await c.answer()


@admin.callback_query(F.data.startswith("dnm:"))
async def cb_d_name(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.d_edit_name)
    await state.update_data(did=int(c.data.split(":")[1]))
    await c.message.answer("Диллернинг янги номини киритинг:")
    await c.answer()


@admin.callback_query(F.data.startswith("ddel:"))
async def cb_d_del(c: CallbackQuery):
    did = int(c.data.split(":")[1])
    await c.message.edit_text("Диллер ўчирилсинми?",
                              reply_markup=kb([("✅ Ҳа, ўчириш", f"ddelok:{did}"),
                                               ("⬅️ Йўқ", f"d:{did}")]))
    await c.answer()


@admin.callback_query(F.data.startswith("ddelok:"))
async def cb_d_delok(c: CallbackQuery):
    q("DELETE FROM dealers WHERE id=%s", int(c.data.split(":")[1]))
    await c.message.edit_text("Диллер ўчирилди.", reply_markup=dealers_kb("d", True))
    await c.answer()


# --- диллер билан алоқа
@admin.message(F.text == A_MSG)
async def a_msg(m: Message, state: FSMContext):
    await state.clear()
    await m.answer("Қайси диллерга хабар юборасиз?", reply_markup=dealers_kb("m"))


@admin.callback_query(F.data.regexp(r"^[mr]:\d+$"))
async def cb_msg_dealer(c: CallbackQuery, state: FSMContext):
    d = one("SELECT * FROM dealers WHERE id=%s", int(c.data.split(":")[1]))
    if not d or not d["chat_id"]:
        return await c.answer("Бу диллер ҳали ботга кирмаган.", show_alert=True)
    await state.set_state(St.msg_to_dealer)
    await state.update_data(did=d["id"])
    await c.message.answer(f"«{d['name']}» учун хабар (матн, расм ёки видео) юборинг:")
    await c.answer()


# --- прайс
def prices_kb():
    lines = [[(f"№{r['number']} — {r['date']}", f"p:{r['id']}")]
             for r in rows("SELECT * FROM prices ORDER BY id DESC")]
    lines.append([("➕ Янги прайс", "p:new")])
    return kb(*lines)


def price_view(pid):
    p = one("SELECT * FROM prices WHERE id=%s", pid)
    if not p:
        return "Прайс топилмади.", kb([("⬅️ Орқага", "p:list")])
    items = rows("SELECT * FROM price_items WHERE price_id=%s ORDER BY id", pid)
    txt = f"Прайс №{p['number']} — {p['date']}\nТаҳрирлаш ёки ўчириш учун маҳсулотни танланг:"
    lines = [[(f"{i['name']} — {i['price']}", f"pi:{i['id']}")] for i in items]
    lines += [[("➕ Маҳсулот қўшиш", f"pinew:{pid}")],
              [("🗑 Прайсни ўчириш", f"pdel:{pid}")],
              [("⬅️ Орқага", "p:list")]]
    return txt, kb(*lines)


@admin.message(F.text == A_PRICE)
async def a_price(m: Message, state: FSMContext):
    await state.clear()
    await m.answer("Прайслар:", reply_markup=prices_kb())


@admin.callback_query(F.data == "p:list")
async def cb_p_list(c: CallbackQuery, state: FSMContext):
    await state.clear()
    await c.message.edit_text("Прайслар:", reply_markup=prices_kb())
    await c.answer()


@admin.callback_query(F.data == "p:new")
async def cb_p_new(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.p_number)
    await c.message.answer("Янги прайс тартиб рақамини киритинг:")
    await c.answer()


@admin.callback_query(F.data.regexp(r"^p:\d+$"))
async def cb_p_open(c: CallbackQuery, state: FSMContext):
    await state.clear()
    txt, mk = price_view(int(c.data.split(":")[1]))
    await c.message.edit_text(txt, reply_markup=mk)
    await c.answer()


@admin.callback_query(F.data.startswith("pdel:"))
async def cb_p_del(c: CallbackQuery):
    pid = int(c.data.split(":")[1])
    await c.message.edit_text("Прайс ўчирилсинми?",
                              reply_markup=kb([("✅ Ҳа, ўчириш", f"pdelok:{pid}"),
                                               ("⬅️ Йўқ", f"p:{pid}")]))
    await c.answer()


@admin.callback_query(F.data.startswith("pdelok:"))
async def cb_p_delok(c: CallbackQuery):
    pid = int(c.data.split(":")[1])
    with tx() as conn:
        conn.execute("DELETE FROM price_items WHERE price_id=%s", (pid,))
        conn.execute("DELETE FROM prices WHERE id=%s", (pid,))
    await c.message.edit_text("Прайс ўчирилди.", reply_markup=prices_kb())
    await c.answer()


@admin.callback_query(F.data.startswith("pinew:"))
async def cb_pi_new(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.pi_name)
    await state.update_data(pid=int(c.data.split(":")[1]))
    await c.message.answer("Маҳсулот номини киритинг:")
    await c.answer()


@admin.callback_query(F.data.regexp(r"^pi:\d+$"))
async def cb_pi_open(c: CallbackQuery):
    i = one("SELECT * FROM price_items WHERE id=%s", int(c.data.split(":")[1]))
    if not i:
        return await c.answer("Топилмади.", show_alert=True)
    await c.message.edit_text(
        f"{i['name']}\nНархи: {i['price']}",
        reply_markup=kb([("✏️ Номини ўзгартириш", f"pin:{i['id']}")],
                        [("💵 Нархини ўзгартириш", f"pip:{i['id']}")],
                        [("🗑 Ўчириш", f"pidel:{i['id']}")],
                        [("⬅️ Орқага", f"p:{i['price_id']}")]))
    await c.answer()


@admin.callback_query(F.data.startswith("pin:"))
async def cb_pi_name(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.pi_edit_name)
    await state.update_data(iid=int(c.data.split(":")[1]))
    await c.message.answer("Маҳсулотнинг янги номини киритинг:")
    await c.answer()


@admin.callback_query(F.data.startswith("pip:"))
async def cb_pi_price(c: CallbackQuery, state: FSMContext):
    await state.set_state(St.pi_edit_price)
    await state.update_data(iid=int(c.data.split(":")[1]))
    await c.message.answer("Янги нархни киритинг:")
    await c.answer()


@admin.callback_query(F.data.startswith("pidel:"))
async def cb_pi_del(c: CallbackQuery):
    i = one("SELECT * FROM price_items WHERE id=%s", int(c.data.split(":")[1]))
    if i:
        q("DELETE FROM price_items WHERE id=%s", i["id"])
        txt, mk = price_view(i["price_id"])
        await c.message.edit_text(txt, reply_markup=mk)
    await c.answer("Ўчирилди.")


# --- буюртмани қабул қилиш / бекор қилиш
def order_text(oid):
    o = one("SELECT o.*, d.name, d.phone FROM orders o "
            "LEFT JOIN dealers d ON d.id=o.dealer_id WHERE o.id=%s", oid)
    lines = [f"🛒 Буюртма №{o['id']}", f"Сана: {o['date']}",
             f"Диллер: {o['name'] or '—'} ({o['phone'] or '—'})", ""]
    for n, it in enumerate(rows("SELECT * FROM order_items WHERE order_id=%s", oid), 1):
        lines.append(f"{n}. {it['name']} — {it['qty']} та")
    return "\n".join(lines)


@admin.callback_query(F.data.regexp(r"^o[ac]:\d+$"))
async def cb_order_decide(c: CallbackQuery, bot: Bot, state: FSMContext):
    accept = c.data.startswith("oa:")
    oid = int(c.data.split(":")[1])
    o = one("SELECT * FROM orders WHERE id=%s", oid)
    if not o or o["status"] != "new":
        await c.message.edit_reply_markup(reply_markup=None)
        return await c.answer("Бу буюртма бўйича қарор аллақачон қабул қилинган.", show_alert=True)
    if not accept:
        await state.set_state(St.cancel_reason)
        await state.update_data(oid=oid, mid=c.message.message_id)
        await c.message.answer(f"Буюртма №{oid} нима сабабдан бекор қилинмоқда? Сабабини ёзинг:")
        return await c.answer()
    d = one("SELECT * FROM dealers WHERE id=%s", o["dealer_id"])
    items = rows("SELECT * FROM order_items WHERE order_id=%s", oid)
    try:
        data = await baza.buyurtma_tayyorla(
            d["name"] if d else "", d["phone"] if d else "", oid, o["date"],
            [{"id": i["product_id"], "nom": i["name"], "soni": i["qty"]} for i in items])
    except baza.HaridorTopilmadi:
        return await c.answer(
            "Бу диллер дастурдаги «Харидорлар» рўйхатидан топилмади. Дастурда шу ном ёки "
            "шу телефон рақами билан харидор қўшинг, кейин қайта «Қабул қилиш»ни босинг.",
            show_alert=True)
    except Exception as e:
        logging.exception("buyurtma_tayyorla")
        return await c.answer(f"Дастур маълумотларини ўқиб бўлмади: {e}"[:190], show_alert=True)
    # Ботдаги ҳолат ва дастурдаги буюртма БИТТА транзакцияда: ё иккаласи ёзилади,
    # ё ҳеч бири. "status='new'" шарти икки админ бир вақтда босса, иккинчисини тўхтатади.
    buy_no = None
    try:
        with tx() as conn:
            if conn.execute("UPDATE orders SET status='accepted' WHERE id=%s AND status='new' "
                            "RETURNING id", (oid,)).fetchone():
                buy_no, app_id = baza.buyurtma_yoz(conn, data)
                conn.execute("UPDATE orders SET app_no=%s, app_id=%s WHERE id=%s", (buy_no, app_id, oid))
    except Exception as e:
        logging.exception("buyurtma_yoz")
        return await c.answer(f"Дастурга ёзиб бўлмади: {e}"[:190], show_alert=True)
    if buy_no is None:
        await c.message.edit_reply_markup(reply_markup=None)
        return await c.answer("Бу буюртма бўйича қарор аллақачон қабул қилинган.", show_alert=True)
    await c.message.edit_text(order_text(oid) + f"\n\n✅ ҚАБУЛ ҚИЛИНДИ — дастурда {buy_no}")
    if d and d["chat_id"]:
        try:
            await bot.send_message(d["chat_id"], t("order_ok", lang_of(d["chat_id"]), i=oid))
        except Exception:
            pass
    await c.answer()


@admin.message(St.cancel_reason, F.text)
async def s_cancel_reason(m: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    await state.clear()
    oid, reason = data["oid"], m.text.strip()
    # Текшириш ва ёзиш битта сўровда — бир вақтда қабул қилинаётган бўлса, тўқнашмайди
    o = one("UPDATE orders SET status='cancelled', reason=%s WHERE id=%s AND status='new' "
            "RETURNING *", reason, oid)
    if not o:
        return await m.answer("Бу буюртма бўйича қарор аллақачон қабул қилинган.")
    txt = order_text(oid) + f"\n\n❌ БЕКОР ҚИЛИНДИ\nСабаб: {reason}"
    try:
        await bot.edit_message_text(txt, chat_id=m.chat.id, message_id=data["mid"])
    except Exception:
        pass
    d = one("SELECT * FROM dealers WHERE id=%s", o["dealer_id"])
    sent = False
    if d and d["chat_id"]:
        try:
            await bot.send_message(d["chat_id"], t("order_no", lang_of(d["chat_id"]), i=oid, r=reason))
            sent = True
        except Exception:
            pass
    await m.answer(f"Буюртма №{oid} бекор қилинди." +
                   (" Сабаб диллерга юборилди." if sent else " Диллерга хабар етказиб бўлмади."))


# --- админ ҳолатлари (матн киритиш)
@admin.message(St.d_name, F.text)
async def s_d_name(m: Message, state: FSMContext):
    await state.update_data(name=m.text.strip())
    await state.set_state(St.d_phone)
    await m.answer("Телефон рақамини киритинг (масалан +998901234567):")


async def phone_ok(m: Message, skip_id=None):
    p = tel(m.text)
    if not p:
        await m.answer("Рақам нотўғри. Камида 9 та рақам бўлиши керак. Қайта киритинг:")
        return None
    for r in rows("SELECT * FROM dealers"):
        if r["id"] != skip_id and tel(r["phone"]) == p:
            await m.answer(f"Бу рақам «{r['name']}» диллерига бириктирилган. Бошқа рақам киритинг:")
            return None
    return "+998" + p


@admin.message(St.d_phone, F.text)
async def s_d_phone(m: Message, state: FSMContext):
    p = await phone_ok(m)
    if not p:
        return
    data = await state.get_data()
    await state.clear()
    did = one("INSERT INTO dealers(name,phone) VALUES(%s,%s) RETURNING id", data["name"], p)["id"]
    await m.answer("✅ Диллер қўшилди. У шу рақам билан ботга кирса, менюлар очилади.")
    await show_dealer(m, did, edit=False)


@admin.message(St.d_edit_phone, F.text)
async def s_d_edit_phone(m: Message, state: FSMContext, bot: Bot):
    did = (await state.get_data())["did"]
    p = await phone_ok(m, skip_id=did)
    if not p:
        return
    await state.clear()
    old = one("SELECT * FROM dealers WHERE id=%s", did)
    if old and tel(old["phone"]) != tel(p):
        # рақам ўзгарса, эски рақам билан кирган одамнинг рухсати бекор бўлади
        if old["chat_id"]:
            try:
                await bot.send_message(old["chat_id"], t("not_dealer", lang_of(old["chat_id"])),
                                       reply_markup=ReplyKeyboardRemove())
            except Exception:
                pass
        q("UPDATE dealers SET phone=%s, chat_id=NULL WHERE id=%s", p, did)
    await m.answer("✅ Рақам сақланди.")
    await show_dealer(m, did, edit=False)


@admin.message(St.d_edit_name, F.text)
async def s_d_edit_name(m: Message, state: FSMContext):
    did = (await state.get_data())["did"]
    await state.clear()
    q("UPDATE dealers SET name=%s WHERE id=%s", m.text.strip(), did)
    await show_dealer(m, did, edit=False)


@admin.message(St.msg_to_dealer)
async def s_msg_to_dealer(m: Message, state: FSMContext, bot: Bot):
    did = (await state.get_data())["did"]
    await state.clear()
    d = one("SELECT * FROM dealers WHERE id=%s", did)
    if not d or not d["chat_id"]:
        return await m.answer("Бу диллер ботга кирмаган.")
    try:
        await bot.send_message(d["chat_id"], t("from_admin", lang_of(d["chat_id"])))
        await m.copy_to(d["chat_id"])
        await m.answer(f"✅ «{d['name']}» га юборилди.")
    except Exception as e:
        await m.answer(f"Юбориб бўлмади: {e}")


@admin.message(St.p_number, F.text)
async def s_p_number(m: Message, state: FSMContext):
    await state.update_data(number=m.text.strip())
    await state.set_state(St.p_date)
    await m.answer(f"Прайс санасини киритинг (масалан {datetime.now():%d.%m.%Y}):")


@admin.message(St.p_date, F.text)
async def s_p_date(m: Message, state: FSMContext):
    try:
        d = datetime.strptime(m.text.strip(), "%d.%m.%Y").strftime("%d.%m.%Y")
    except ValueError:
        return await m.answer("Сана нотўғри. Намуна: 01.10.2026")
    data = await state.get_data()
    await state.clear()
    pid = one("INSERT INTO prices(number,date) VALUES(%s,%s) RETURNING id", data["number"], d)["id"]
    txt, mk = price_view(pid)
    await m.answer(txt, reply_markup=mk)


@admin.message(St.pi_name, F.text)
async def s_pi_name(m: Message, state: FSMContext):
    await state.update_data(name=m.text.strip())
    await state.set_state(St.pi_price)
    await m.answer("Нархини киритинг:")


@admin.message(St.pi_price, F.text)
async def s_pi_price(m: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()
    q("INSERT INTO price_items(price_id,name,price) VALUES(%s,%s,%s)",
      data["pid"], data["name"], m.text.strip())
    txt, mk = price_view(data["pid"])
    await m.answer(txt, reply_markup=mk)


@admin.message(St.pi_edit_name, F.text)
@admin.message(St.pi_edit_price, F.text)
async def s_pi_edit(m: Message, state: FSMContext):
    col = "name" if await state.get_state() == St.pi_edit_name.state else "price"
    iid = (await state.get_data())["iid"]
    await state.clear()
    q(f"UPDATE price_items SET {col}=%s WHERE id=%s", m.text.strip(), iid)
    i = one("SELECT * FROM price_items WHERE id=%s", iid)
    if i:
        txt, mk = price_view(i["price_id"])
        await m.answer(txt, reply_markup=mk)


@admin.message()
async def a_fallback(m: Message):
    await m.answer("Менюдан танланг.", reply_markup=admin_menu())


# ================================================================ ДИЛЛЕР
async def load_products(m: Message, lang):
    try:
        return await baza.mahsulotlar()
    except Exception:
        logging.exception("mahsulotlar")
        await m.answer(t("baza_err", lang))
    return None


def order_kb(prods, cart, lang):
    lines = []
    for n, p in enumerate(prods):
        mark = f"  🛒{cart[str(n)]}" if str(n) in cart else ""
        lines.append([(f"{p['nom']} — {p['qoldiq']}{mark}", f"op:{n}")])
    last = [(t("cancel", lang), "o:cancel")]
    if cart:
        last.insert(0, (t("send_order", lang), "o:send"))
    lines.append(last)
    return kb(*lines)


def cart_text(prods, cart, lang):
    if not cart:
        return t("choose_prod", lang)
    lines = [t("cart", lang)]
    for n, (k, v) in enumerate(cart.items(), 1):
        lines.append(f"{n}. {prods[int(k)]['nom']} — {v}")
    return "\n".join(lines) + "\n\n" + t("choose_prod", lang)


@dealer.message(F.text.in_(both("m_order")))
async def d_order(m: Message, state: FSMContext):
    await state.clear()
    lang = lang_of(m.from_user.id)
    prods = await load_products(m, lang)
    if prods is None:
        return
    if not prods:
        return await m.answer(t("no_prod", lang))
    await state.update_data(prods=prods, cart={})
    await m.answer(t("choose_prod", lang), reply_markup=order_kb(prods, {}, lang))


@dealer.callback_query(F.data.startswith("op:"))
async def cb_pick(c: CallbackQuery, state: FSMContext):
    lang = lang_of(c.from_user.id)
    data = await state.get_data()
    n = int(c.data.split(":")[1])
    prods = data.get("prods")
    if not prods or n >= len(prods):
        return await c.answer(t("use_menu", lang), show_alert=True)
    if prods[n]["qoldiq"] <= 0:
        return await c.answer(t("no_stock", lang), show_alert=True)
    await state.update_data(pick=n)
    await state.set_state(St.qty)
    await c.message.answer(t("ask_qty", lang, n=prods[n]["nom"], s=prods[n]["qoldiq"]))
    await c.answer()


@dealer.callback_query(F.data == "o:cancel")
async def cb_order_cancel(c: CallbackQuery, state: FSMContext):
    await state.clear()
    await c.message.edit_text(t("cancelled", lang_of(c.from_user.id)))
    await c.answer()


@dealer.callback_query(F.data == "o:send")
async def cb_order_send(c: CallbackQuery, state: FSMContext, bot: Bot):
    lang = lang_of(c.from_user.id)
    data = await state.get_data()
    cart, old = data.get("cart") or {}, data.get("prods") or []
    if not cart:
        return await c.answer(t("use_menu", lang), show_alert=True)
    # Жўнатишдан олдин қолдиқни базадан қайта текширамиз
    fresh = await load_products(c.message, lang)
    if fresh is None:
        return await c.answer()
    stock = {str(p["id"]): p["qoldiq"] for p in fresh}
    for k, v in cart.items():
        p = old[int(k)]
        have = stock.get(str(p["id"]), 0)
        if v > have:
            await c.message.answer(t("bad_qty", lang, s=have) + f"\n({p['nom']})")
            return await c.answer()
    d = dealer_of(c.from_user.id)
    today = datetime.now().strftime("%d.%m.%Y")
    with tx() as conn:
        oid = conn.execute("INSERT INTO orders(dealer_id,date) VALUES(%s,%s) RETURNING id",
                           (d["id"], today)).fetchone()["id"]
        conn.cursor().executemany(
            "INSERT INTO order_items(order_id,product_id,name,qty) VALUES(%s,%s,%s,%s)",
            [(oid, str(old[int(k)]["id"]), old[int(k)]["nom"], v) for k, v in cart.items()])
    await state.clear()
    await c.message.edit_text(t("order_sent", lang, i=oid, d=today))
    mk = kb([("✅ Қабул қилиш", f"oa:{oid}"), ("❌ Бекор қилиш", f"oc:{oid}")])
    for a in admin_ids():
        try:
            await bot.send_message(a, order_text(oid), reply_markup=mk)
        except Exception:
            pass
    await c.answer()


@dealer.message(F.text.in_(both("m_price")))
async def d_price(m: Message, state: FSMContext):
    await state.clear()
    lang = lang_of(m.from_user.id)
    ps = rows("SELECT * FROM prices ORDER BY id DESC")
    if not ps:
        return await m.answer(t("no_price", lang))
    await m.answer(t("prices", lang),
                   reply_markup=kb(*[[(f"№{p['number']} — {p['date']}", f"vp:{p['id']}")] for p in ps]))


@dealer.callback_query(F.data.startswith("vp:"))
async def cb_view_price(c: CallbackQuery):
    lang = lang_of(c.from_user.id)
    p = one("SELECT * FROM prices WHERE id=%s", int(c.data.split(":")[1]))
    if not p:
        return await c.answer(t("no_price", lang), show_alert=True)
    lines = [f"💰 №{p['number']} — {p['date']}", ""]
    for n, i in enumerate(rows("SELECT * FROM price_items WHERE price_id=%s ORDER BY id", p["id"]), 1):
        lines.append(f"{n}. {i['name']} — {i['price']}")
    await c.message.answer("\n".join(lines))
    await c.answer()


@dealer.message(F.text.in_(both("m_akt")))
async def d_akt(m: Message, state: FSMContext):
    await state.clear()
    lang = lang_of(m.from_user.id)
    today = date.today()
    await m.answer(t("akt_from", lang), reply_markup=cal_kb(today.year, today.month, lang, True))


@dealer.message(F.text.in_(both("m_admin")))
async def d_to_admin(m: Message, state: FSMContext):
    await state.set_state(St.to_admin)
    await m.answer(t("to_admin", lang_of(m.from_user.id)))


@dealer.message(St.qty, F.text)
async def s_qty(m: Message, state: FSMContext):
    lang = lang_of(m.from_user.id)
    data = await state.get_data()
    prods, cart, n = data["prods"], data["cart"], data["pick"]
    s = prods[n]["qoldiq"]
    txt = m.text.strip()
    if not txt.isdigit() or not 1 <= int(txt) <= s:
        return await m.answer(t("bad_qty", lang, s=s))  # омбордагидан кўп бўлмайди
    cart[str(n)] = int(txt)
    await state.update_data(cart=cart)
    await state.set_state(None)
    await m.answer(cart_text(prods, cart, lang), reply_markup=order_kb(prods, cart, lang))


def parse_date(s):
    try:
        return datetime.strptime(s.strip(), "%d.%m.%Y").date()
    except ValueError:
        return None


def money(x):
    try:
        return f"{float(x):,.0f}".replace(",", " ")
    except (TypeError, ValueError):
        return str(x)


OYLAR = {"uz": ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август",
                "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
         "ru": ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август",
                "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]}
KUNLAR = {"uz": ["Ду", "Се", "Чо", "Па", "Жу", "Ша", "Як"],
          "ru": ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]}


def cal_kb(y, mth, lang, presets):
    """Ой тақвими: кунни тугма билан танлаш."""
    py, pm = (y, mth - 1) if mth > 1 else (y - 1, 12)
    ny, nm = (y, mth + 1) if mth < 12 else (y + 1, 1)
    lines = []
    if presets:
        lines.append([(t("p_today", lang), "ak:p:td"), (t("p_tm", lang), "ak:p:tm")])
        lines.append([(t("p_lm", lang), "ak:p:lm"), (t("p_ty", lang), "ak:p:ty")])
    lines.append([("«", f"ak:m:{py}-{pm}"), (f"{OYLAR[lang][mth - 1]} {y}", "ak:x"),
                  ("»", f"ak:m:{ny}-{nm}")])
    lines.append([(k, "ak:x") for k in KUNLAR[lang]])
    for week in calendar.monthcalendar(y, mth):
        lines.append([(str(d), f"ak:d:{y}-{mth:02d}-{d:02d}") if d else (" ", "ak:x") for d in week])
    return kb(*lines)


async def send_akt(m: Message, uid, d1, d2):
    lang = lang_of(uid)
    if d2 < d1:
        d1, d2 = d2, d1
    me = dealer_of(uid)
    try:
        recs, boshi = await baza.akt_sverka(me["name"], me["phone"], d1, d2)
    except baza.HaridorTopilmadi:
        return await m.answer(t("no_cust", lang))
    except Exception:
        logging.exception("akt_sverka")
        return await m.answer(t("baza_err", lang))
    lines = [t("akt_title", lang, a=f"{d1:%d.%m.%Y}", b=f"{d2:%d.%m.%Y}"), ""]
    goods = paid = 0.0
    for r in recs:
        is_pay = r.get("tur") == "tolov"
        s = float(r.get("summa") or 0)
        if is_pay:
            paid += s
        else:
            goods += s
        lines.append(f"{r.get('sana', '')}  {'💵' if is_pay else '📦'} {r.get('izoh', '')} — {money(s)}")
    if not recs:
        lines.append(t("akt_empty", lang))
    lines.append("")
    if abs(boshi) >= 0.5:
        lines.append(f"{t('akt_open', lang)}: {money(boshi)}")
    lines += [f"📦 {t('akt_goods', lang)}: {money(goods)}", f"💵 {t('akt_paid', lang)}: {money(paid)}", ""]
    qarz = boshi + goods - paid  # мусбат — диллер қарздор, манфий — диллер ҳақдор
    if qarz >= 0.5:
        lines.append(f"🔴 {t('akt_debt', lang)}: {money(qarz)}")
    elif qarz <= -0.5:
        lines.append(f"🟢 {t('akt_credit', lang)}: {money(-qarz)}")
    else:
        lines.append(f"✅ {t('akt_zero', lang)}")
    text = "\n".join(lines)
    for i in range(0, len(text), 4000):
        await m.answer(text[i:i + 4000])


@dealer.callback_query(F.data.startswith("ak:"))
async def cb_akt(c: CallbackQuery, state: FSMContext):
    lang = lang_of(c.from_user.id)
    _, kind, val = (c.data.split(":") + [""])[:3]
    d1s = (await state.get_data()).get("akt_d1")
    if kind == "m":
        y, mth = map(int, val.split("-"))
        await c.message.edit_reply_markup(reply_markup=cal_kb(y, mth, lang, not d1s))
    elif kind == "p":
        today = date.today()
        if val == "td":
            d1 = d2 = today
        elif val == "tm":
            d1, d2 = today.replace(day=1), today
        elif val == "lm":
            d2 = today.replace(day=1) - timedelta(days=1)
            d1 = d2.replace(day=1)
        else:
            d1, d2 = today.replace(month=1, day=1), today
        await state.update_data(akt_d1=None)
        await c.message.delete()
        await send_akt(c.message, c.from_user.id, d1, d2)
    elif kind == "d":
        d = date.fromisoformat(val)
        if not d1s:
            await state.update_data(akt_d1=val)
            await c.message.edit_text(t("akt_to", lang, a=f"{d:%d.%m.%Y}"),
                                      reply_markup=cal_kb(d.year, d.month, lang, False))
        else:
            await state.update_data(akt_d1=None)
            await c.message.delete()
            await send_akt(c.message, c.from_user.id, date.fromisoformat(d1s), d)
    await c.answer()


@dealer.message(St.to_admin)
async def s_to_admin(m: Message, state: FSMContext, bot: Bot):
    await state.clear()
    lang = lang_of(m.from_user.id)
    d = dealer_of(m.from_user.id)
    mk = kb([("↩️ Диллерга жавоб қайтариш", f"r:{d['id']}")])
    for a in admin_ids():
        try:
            await bot.send_message(a, f"📩 Диллердан хабар: {d['name']} ({d['phone']})")
            await m.copy_to(a, reply_markup=mk)
        except Exception:
            pass
    await m.answer(t("sent", lang))


@dealer.message()
async def d_fallback(m: Message):
    lang = lang_of(m.from_user.id)
    await m.answer(t("use_menu", lang), reply_markup=dealer_menu(lang))


# ================================================================ ишга тушириш
async def muddat_kuzatuvchi(bot: Bot):
    """Дастурда буюртмага «Муддати» қўйилса (ёки ўзгарса), диллерга хабар юборади."""
    while True:
        try:
            pend = rows("SELECT * FROM orders WHERE status='accepted'")
            if pend:
                apps = await baza.bot_buyurtmalar()
                by_id = {a["id"]: a for a in apps}
                by_no = {a["bot_no"]: a for a in apps if a["bot_no"] is not None}
                for o in pend:
                    a = by_id.get(o["app_id"]) if o["app_id"] else by_no.get(o["id"])
                    if not a or a["cancelled"]:
                        continue
                    due = a["muddat"]
                    if due == (o["due"] or ""):
                        continue
                    if due:
                        d = one("SELECT * FROM dealers WHERE id=%s", o["dealer_id"])
                        if not d or not d["chat_id"]:
                            continue
                        try:
                            kun = datetime.strptime(due, "%Y-%m-%d").strftime("%d.%m.%Y")
                        except ValueError:
                            kun = due
                        await bot.send_message(d["chat_id"],
                                               t("order_due", lang_of(d["chat_id"]), i=o["id"], d=kun))
                    q("UPDATE orders SET due=%s WHERE id=%s", due, o["id"])
        except Exception:
            logging.exception("muddat_kuzatuvchi")
        await asyncio.sleep(30)


def setup():
    """Bot ва Dispatcher (дастур — app.py — ичида polling орқали ишлатилади)."""
    import_sqlite()
    bot = Bot(TOKEN)
    dp = Dispatcher()
    dp.include_routers(common, admin, dealer)
    return bot, dp


async def main():
    """Алоҳида, polling билан ишга тушириш (фақат синаш учун)."""
    logging.basicConfig(level=logging.INFO)
    pgstore.migrate()
    bot, dp = setup()
    await bot.delete_webhook()
    kuzatuvchi = asyncio.create_task(muddat_kuzatuvchi(bot))
    try:
        await dp.start_polling(bot)
    finally:
        kuzatuvchi.cancel()


if __name__ == "__main__":
    asyncio.run(main())
