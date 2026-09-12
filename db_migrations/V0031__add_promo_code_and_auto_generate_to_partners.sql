-- Отдельный промокод для ручного ввода при регистрации (в дополнение к ref_code для ссылки)
ALTER TABLE t_p38600009_virtual_asset_trader.partners
    ADD COLUMN IF NOT EXISTS promo_code text UNIQUE;

-- Включена ли автогенерация кодов для партнёра (по умолчанию — да, как раньше)
ALTER TABLE t_p38600009_virtual_asset_trader.partners
    ADD COLUMN IF NOT EXISTS auto_generate boolean NOT NULL DEFAULT true;

-- Быстрый поиск партнёра по промокоду при регистрации
CREATE INDEX IF NOT EXISTS idx_partners_promo_code ON t_p38600009_virtual_asset_trader.partners (promo_code);
