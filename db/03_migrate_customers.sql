ALTER TABLE customers
    ADD COLUMN phone_number TEXT,
    ADD COLUMN postal_code TEXT;

UPDATE customers
    SET phone_number = COALESCE(NULLIF(cellular_phone_number, ''), home_phone_number);

ALTER TABLE customers
    DROP COLUMN cellular_phone_number,
    DROP COLUMN home_phone_number;
