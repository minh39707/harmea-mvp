-- F3 account authentication and order ownership. Applied migrations are immutable.
CREATE TABLE users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NULL,
  default_address JSON NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT users_email_format CHECK (email = LOWER(TRIM(email))),
  CONSTRAINT users_password_hash_format CHECK (password_hash LIKE 'scrypt$%'),
  CONSTRAINT users_display_name_nonempty CHECK (CHAR_LENGTH(TRIM(display_name)) > 0),
  CONSTRAINT users_phone_format CHECK (phone IS NULL OR REGEXP_LIKE(phone, '^\\+?[0-9]{8,15}$', 'c')),
  CONSTRAINT users_default_address_object CHECK (default_address IS NULL OR JSON_TYPE(default_address) = 'OBJECT')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sessions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY sessions_user_id_idx (user_id),
  KEY sessions_expires_at_idx (expires_at),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sessions_token_hash_format CHECK (REGEXP_LIKE(token_hash, '^[0-9a-f]{64}$', 'c')),
  CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE orders
  ADD COLUMN user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER request_key,
  ADD KEY orders_user_created_at_idx (user_id, created_at DESC),
  ADD CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE order_status_events
  ADD COLUMN actor_user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER actor,
  ADD KEY order_status_events_actor_user_idx (actor_user_id),
  ADD CONSTRAINT order_status_events_actor_user_fk FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;

DROP TABLE admin_sessions;
