UPDATE t_p38600009_virtual_asset_trader.users
SET
  email = 'gorant.shop-supp0rt@yandex.ru',
  password_hash = encode(sha256(('gorant_salt_2024' || 'As53FlmMs')::bytea), 'hex'),
  role = 'admin',
  is_owner = true,
  verified = true
WHERE id = 'u-001';