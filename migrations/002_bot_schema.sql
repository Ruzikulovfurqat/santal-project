-- Телеграм ботнинг ўз жадваллари.
CREATE SCHEMA IF NOT EXISTS bot;

CREATE TABLE IF NOT EXISTS bot.admins (chat_id BIGINT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS bot.users (chat_id BIGINT PRIMARY KEY, lang TEXT);
CREATE TABLE IF NOT EXISTS bot.dealers (id SERIAL PRIMARY KEY,
    name TEXT, phone TEXT, chat_id BIGINT);
CREATE TABLE IF NOT EXISTS bot.prices (id SERIAL PRIMARY KEY,
    number TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS bot.price_items (id SERIAL PRIMARY KEY,
    price_id INTEGER, name TEXT, price TEXT);
CREATE TABLE IF NOT EXISTS bot.orders (id SERIAL PRIMARY KEY,
    dealer_id INTEGER, date TEXT, status TEXT DEFAULT 'new',
    app_id TEXT, app_no TEXT, due TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS bot.order_items (order_id INTEGER, product_id TEXT,
    name TEXT, qty INTEGER);
