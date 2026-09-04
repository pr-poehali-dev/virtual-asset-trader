INSERT INTO t_p38600009_virtual_asset_trader.platform_settings (key, value)
VALUES ('ai_support_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
