-- Scope update 2026-10-29: multiple customized cards per TEST checkout.
-- Legacy orders schema remains for the earlier admin/production plan.
CREATE TABLE demo_checkouts (
  id uuid PRIMARY KEY,
  order_number varchar(32) NOT NULL UNIQUE,
  request_key uuid NOT NULL UNIQUE,
  request_hash varchar(64) NOT NULL,
  tracking_hash varchar(64) NOT NULL UNIQUE,
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  recipient jsonb NOT NULL CHECK (jsonb_typeof(recipient) = 'object'),
  subtotal_vnd integer NOT NULL CHECK (subtotal_vnd >= 0),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status = 'pending'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE demo_checkouts IS 'Test checkout only, no money collected, private design/recipient JSON; not a real fulfillment commitment.';
