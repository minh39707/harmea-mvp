-- Applied after scripts/backfill-lookup.mjs has populated every existing order.
ALTER TABLE orders
  MODIFY COLUMN lookup_phone_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ADD CONSTRAINT orders_lookup_phone_hash_format CHECK (REGEXP_LIKE(lookup_phone_hash, '^[0-9a-f]{64}$', 'c')),
  DROP CHECK orders_tracking_hash_format,
  DROP INDEX tracking_token_hash,
  DROP COLUMN tracking_token_hash;
