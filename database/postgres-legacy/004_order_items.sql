-- Keep historical migrations immutable. One product/template, multiple designs per order.
ALTER TABLE orders DROP CONSTRAINT orders_quantity_check;
ALTER TABLE orders ADD CONSTRAINT orders_quantity_check CHECK (quantity BETWEEN 1 AND 100);
CREATE TABLE order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  position integer NOT NULL CHECK (position BETWEEN 0 AND 9),
  design_snapshot jsonb NOT NULL CHECK (jsonb_typeof(design_snapshot) = 'object'),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  photo_key varchar(255) NOT NULL CHECK (photo_key <> ''),
  preview_key varchar(255) NOT NULL CHECK (preview_key <> ''),
  UNIQUE (order_id, position)
);
-- Existing one-design orders remain accessible. No demo_checkouts are promoted.
INSERT INTO order_items(id,order_id,position,design_snapshot,quantity,photo_key,preview_key)
SELECT id,id,0,design_snapshot,quantity,photo_key,preview_key FROM orders;
COMMENT ON TABLE orders IS 'Canonical cart orders: one product/price/template, 1-10 designs; quantity is sum of items. First-design columns retained for historical compatibility, API uses order_items.';
COMMENT ON TABLE demo_checkouts IS 'Legacy test-only checkout, not part of canonical admin/order workflow. Retained until client migration; no automatic promotion.';
