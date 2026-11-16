-- FAKE demo catalogue data. 50,000 VND is NOT a confirmed Harméa selling price.
-- Run after 001_initial.sql. Safe to repeat; does not overwrite an existing product.
INSERT INTO products (id, name, unit_price_vnd, template_version, is_active, is_demo)
VALUES ('11111111-1111-4111-8111-111111111111', 'Harméa NFC Music Card — DEMO', 50000, 'harmea-card-v1', true, true)
ON CONFLICT (id) DO NOTHING;

