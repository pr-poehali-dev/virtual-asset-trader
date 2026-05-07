CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  account_id    TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  is_owner      BOOLEAN NOT NULL DEFAULT FALSE,
  staff_perms   TEXT[] DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'active',
  freeze_reason TEXT,
  block_reason  TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  balance_rub   NUMERIC(18,2) NOT NULL DEFAULT 0,
  locked_rub    NUMERIC(18,2) NOT NULL DEFAULT 0,
  deals_count   INTEGER NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
