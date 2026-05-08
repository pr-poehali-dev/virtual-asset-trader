INSERT INTO t_p38600009_virtual_asset_trader.platform_settings (key, value)
VALUES ('site_domain', 'gorant.shop')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();