INSERT INTO users (id, account_id, username, email, password_hash, role, is_owner, verified, balance_rub)
SELECT 'u-001', 'admin', 'Slumon4ik', 'slumon4ik@gorant.shop',
       '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LnzmK9.C8IO',
       'admin', TRUE, TRUE, 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'u-001');