ALTER TABLE products
  MODIFY COLUMN name VARCHAR(200) NOT NULL,
  ADD COLUMN description VARCHAR(5000) NOT NULL DEFAULT '' AFTER name,
  ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER is_demo,
  ADD CONSTRAINT products_unit_price_range CHECK (unit_price_vnd BETWEEN 1000 AND 10000000),
  ADD CONSTRAINT products_version_positive CHECK (version > 0);

CREATE TABLE product_price_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  old_price INT NOT NULL,
  new_price INT NOT NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY product_price_history_product_changed_idx (product_id, changed_at DESC),
  CONSTRAINT product_price_history_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT product_price_history_old_range CHECK (old_price BETWEEN 1000 AND 10000000),
  CONSTRAINT product_price_history_new_range CHECK (new_price BETWEEN 1000 AND 10000000),
  CONSTRAINT product_price_history_changed CHECK (old_price <> new_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
