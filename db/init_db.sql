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

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    sales_date TIMESTAMPTZ,
    buyer_name TEXT,
    buyer_address TEXT,
    has_buyer_paid BOOLEAN DEFAULT false,
    is_shipped BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS sale_items (
    sales_id INT REFERENCES sales (id),
    item_id INT REFERENCES items (id),
    quantity INT,
    price DECIMAL(100, 4)
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    instagram_account TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    phone_number TEXT,
    personal_customs_clearance_code TEXT
);

INSERT INTO purchasers (name) VALUES ('Eunjin');
INSERT INTO purchasers (name) VALUES ('Hyojin');
