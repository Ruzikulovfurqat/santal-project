-- Дастур ёзувлари: ҳар бир ҳужжат (буюртма, омбор, касса...) — битта қатор.
-- seq — қўшилиш тартиби (рўйхатлар шу тартибда қайтади).
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.docs (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL,
    seq BIGINT GENERATED ALWAYS AS IDENTITY,
    PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS docs_collection_seq ON app.docs (collection, seq);

CREATE TABLE IF NOT EXISTS app.locks (
    key TEXT PRIMARY KEY,
    holder TEXT NOT NULL,
    expires DOUBLE PRECISION NOT NULL
);
