ALTER TABLE t_p38600009_virtual_asset_trader.users
    ADD COLUMN IF NOT EXISTS password_salt text;
