CREATE TABLE IF NOT EXISTS purchasers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    purchase_date TIMESTAMPTZ,
    cost DECIMAL(100, 2),
    purchaser_id INT REFERENCES purchasers (id)
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    brand TEXT,
    name TEXT,
    quantity INT,
    cost DECIMAL(100, 4)
);

CREATE TABLE IF NOT EXISTS purchase_items (
    purchase_id INT REFERENCES purchases (id),
    item_id INT REFERENCES items (id),
    quantity INT,
    cost DECIMAL(100, 4)
);

CREATE TABLE IF NOT EXISTS customers (
    id                              SERIAL PRIMARY KEY,
    name                            TEXT,
    nickname                        TEXT,
    phone_number                    TEXT,
    address                         TEXT,
    postal_code                     TEXT,
    personal_customs_clearance_code TEXT
);

CREATE TABLE IF NOT EXISTS sales (
    id                   SERIAL PRIMARY KEY,
    customer_id          INT REFERENCES customers (id),
    description          TEXT,
    sale_price_won       DECIMAL(15, 0),
    shipping_cost_dollar DECIMAL(10, 2) NULL,
    sales_date           TIMESTAMPTZ,
    paid_date            TIMESTAMPTZ,
    shipped_date         TIMESTAMPTZ
);

INSERT INTO purchasers (name) VALUES ('Eunjin');
INSERT INTO purchasers (name) VALUES ('Hyojin');

CREATE TABLE IF NOT EXISTS organizations (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT,
    organization_id INT NOT NULL REFERENCES organizations (id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id     TEXT PRIMARY KEY,
    data   BYTEA NOT NULL,
    expiry TIMESTAMPTZ NOT NULL
);
