-- Fake demo catalogue data. 50,000 VND is not a confirmed selling price.
INSERT IGNORE INTO products (id, name, unit_price_vnd, template_version, is_active, is_demo)
VALUES ('11111111-1111-4111-8111-111111111111', 'Harméa NFC Music Card — DEMO', 50000, 'harmea-card-v1', TRUE, TRUE);
