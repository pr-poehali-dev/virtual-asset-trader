ALTER TABLE t_p38600009_virtual_asset_trader.users
  ADD COLUMN IF NOT EXISTS oauth_provider text,
  ADD COLUMN IF NOT EXISTS oauth_id text;

CREATE INDEX IF NOT EXISTS idx_users_oauth
  ON t_p38600009_virtual_asset_trader.users (oauth_provider, oauth_id);