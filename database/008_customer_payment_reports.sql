-- A customer declaration is an audit event, not confirmation of received funds.
CREATE TABLE order_payment_reports (
  order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  reported_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT order_payment_reports_order_fk FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
