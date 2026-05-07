ALTER TABLE t_p38600009_virtual_asset_trader.deposits
  ADD COLUMN IF NOT EXISTS requisite_id   text,
  ADD COLUMN IF NOT EXISTS requisite_name text,
  ADD COLUMN IF NOT EXISTS requisite_details text,
  ADD COLUMN IF NOT EXISTS expires_at     timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;
