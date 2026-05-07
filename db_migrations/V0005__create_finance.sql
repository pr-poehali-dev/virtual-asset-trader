CREATE TABLE IF NOT EXISTS deposits (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  amount         NUMERIC(18,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'RUB',
  requisite_type TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  amount            NUMERIC(18,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'RUB',
  commission        NUMERIC(5,2) NOT NULL DEFAULT 5,
  to_receive        NUMERIC(18,2) NOT NULL,
  requisite_type    TEXT NOT NULL,
  requisite_details TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  text       TEXT NOT NULL,
  shield     BOOLEAN NOT NULL DEFAULT FALSE,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  seller_id    TEXT NOT NULL REFERENCES users(id),
  from_user_id TEXT NOT NULL REFERENCES users(id),
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
