# -*- coding: utf-8 -*-
"""Бот: базадан категориялар, буюртмаларни транзакцияда ёзиш ва бир вақтдаги қабул қилиш."""
import asyncio
import threading

import pytest

import pgstore


@pytest.fixture(scope="module")
def ctx(botmod):
    import baza
    cust = pgstore.col_list("customers")[0]
    item = next(i for i in pgstore.col_list("items") if i.get("itemType") == "mahsulot")
    did = botmod.one("INSERT INTO dealers(name,phone) VALUES(%s,%s) RETURNING id",
                     cust["name"], cust.get("phone") or "")["id"]
    data = asyncio.run(baza.buyurtma_tayyorla(cust["name"], cust.get("phone"), 1, "25.10.2026",
                                              [{"id": item["id"], "nom": item["name"], "soni": 2}]))
    return {"bot": botmod, "baza": baza, "dealer": did, "item": item, "data": data}


def new_order(ctx):
    bot, item = ctx["bot"], ctx["item"]
    with bot.tx() as conn:
        oid = conn.execute("INSERT INTO orders(dealer_id,date) VALUES(%s,%s) RETURNING id",
                           (ctx["dealer"], "25.10.2026")).fetchone()["id"]
        conn.execute("INSERT INTO order_items(order_id,product_id,name,qty) VALUES(%s,%s,%s,%s)",
                     (oid, item["id"], item["name"], 2))
    return oid


def accept(ctx, oid, fail=False):
    """bot.cb_order_decide'даги транзакция билан бир хил."""
    buy_no = None
    with ctx["bot"].tx() as conn:
        if conn.execute("UPDATE orders SET status='accepted' WHERE id=%s AND status='new' RETURNING id",
                        (oid,)).fetchone():
            buy_no, app_id = ctx["baza"].buyurtma_yoz(conn, ctx["data"])
            if fail:
                raise RuntimeError("сунъий хато")
            conn.execute("UPDATE orders SET app_no=%s, app_id=%s WHERE id=%s", (buy_no, app_id, oid))
    return buy_no


def app_orders():
    return len(pgstore.col_list("orders"))


def test_categories_from_db(ctx):
    cats = asyncio.run(ctx["baza"]._col("categories"))
    names = {c["name"] for c in cats}
    assert set(ctx["baza"]._ruxsat(cats).values()) == names
    products = asyncio.run(ctx["baza"].mahsulotlar())
    assert products and all(p["kategoriya"] in names for p in products)


def test_rollback_keeps_both_sides_unchanged(ctx):
    oid, before = new_order(ctx), app_orders()
    with pytest.raises(RuntimeError):
        accept(ctx, oid, fail=True)
    assert ctx["bot"].one("SELECT status FROM orders WHERE id=%s", oid)["status"] == "new"
    assert app_orders() == before


def test_accept_once(ctx):
    oid, before = new_order(ctx), app_orders()
    number = accept(ctx, oid)
    assert number and number.startswith("BUY-2026-")
    row = ctx["bot"].one("SELECT status, app_no FROM orders WHERE id=%s", oid)
    assert (row["status"], row["app_no"]) == ("accepted", number)
    assert app_orders() == before + 1
    assert accept(ctx, oid) is None  # иккинчи марта қабул қилинмайди


def test_parallel_accept_single_winner(ctx):
    oid, before = new_order(ctx), app_orders()
    results, gate = [], threading.Barrier(8)

    def worker():
        gate.wait()
        results.append(accept(ctx, oid))

    threads = [threading.Thread(target=worker) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len([r for r in results if r]) == 1
    assert app_orders() == before + 1


def test_parallel_numbers_unique(ctx):
    oids, results, gate = [new_order(ctx) for _ in range(5)], [], threading.Barrier(5)

    def worker(oid):
        gate.wait()
        results.append(accept(ctx, oid))

    threads = [threading.Thread(target=worker, args=(o,)) for o in oids]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(set(results)) == 5 and None not in results
