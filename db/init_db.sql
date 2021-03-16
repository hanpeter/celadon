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

INSERT INTO purchasers (name) VALUES ('Eunjin');
INSERT INTO purchasers (name) VALUES ('Hyojin');
