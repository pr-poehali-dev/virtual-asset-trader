ALTER TABLE t_p38600009_virtual_asset_trader.reviews
  ADD COLUMN IF NOT EXISTS deal_id text REFERENCES t_p38600009_virtual_asset_trader.deals(id);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_deal_id_unique
  ON t_p38600009_virtual_asset_trader.reviews (deal_id)
  WHERE deal_id IS NOT NULL;
