-- Requested catalogue price. Keep order snapshots unchanged and record the price change atomically.
START TRANSACTION;

INSERT INTO product_price_history (product_id, old_price, new_price)
SELECT id, unit_price_vnd, 89000
FROM products
WHERE id = '11111111-1111-4111-8111-111111111111' AND unit_price_vnd <> 89000;

UPDATE products
SET unit_price_vnd = 89000, version = version + 1
WHERE id = '11111111-1111-4111-8111-111111111111' AND unit_price_vnd <> 89000;

COMMIT;
