ALTER TABLE t_p38600009_virtual_asset_trader.deals
    ADD COLUMN IF NOT EXISTS buyer_contact text,
    ADD COLUMN IF NOT EXISTS seller_shipped boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS seller_shipped_at timestamptz,
    ADD COLUMN IF NOT EXISTS cancel_reason text;
