CREATE TABLE IF NOT EXISTS deals (
  id           TEXT PRIMARY KEY,
  product_id   INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,
  category     TEXT,
  amount       NUMERIC(18,2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'escrow',
  buyer_id     TEXT NOT NULL REFERENCES users(id),
  seller_id    TEXT NOT NULL REFERENCES users(id),
  hold_days    INTEGER,
  hold_until   TIMESTAMPTZ,
  arbiter_id   TEXT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_messages (
  id         SERIAL PRIMARY KEY,
  deal_id    TEXT NOT NULL REFERENCES deals(id),
  from_user  TEXT NOT NULL,
  role       TEXT NOT NULL,
  text       TEXT NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
