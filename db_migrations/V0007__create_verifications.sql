CREATE TABLE IF NOT EXISTS verifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  full_name   TEXT NOT NULL,
  doc_type    TEXT NOT NULL,
  doc_number  TEXT NOT NULL,
  doc_photo   TEXT,
  selfie      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
