CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  seller_id   TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       NUMERIC(18,2) NOT NULL,
  description TEXT DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  boosted     BOOLEAN NOT NULL DEFAULT FALSE,
  boost_until TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
