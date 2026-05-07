CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.platform_settings (
    key   text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO t_p38600009_virtual_asset_trader.platform_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
