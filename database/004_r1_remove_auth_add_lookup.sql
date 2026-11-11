-- R1: remove the canceled F3 auth schema and add the phone lookup digest.
-- 003_users.sql is already applied locally, so it remains immutable.
ALTER TABLE orders
  ADD COLUMN lookup_phone_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER recipient_snapshot,
  DROP FOREIGN KEY orders_user_fk,
  DROP INDEX orders_user_created_at_idx,
  DROP COLUMN user_id;

ALTER TABLE order_status_events
  DROP FOREIGN KEY order_status_events_actor_user_fk,
  DROP INDEX order_status_events_actor_user_idx,
  DROP COLUMN actor_user_id;

DROP TABLE sessions;
DROP TABLE users;
DROP TABLE IF EXISTS admin_sessions;
