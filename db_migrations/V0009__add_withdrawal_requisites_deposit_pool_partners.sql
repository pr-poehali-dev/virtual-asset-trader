-- Реквизиты пользователей для ВЫВОДА (личные, не показываются никому кроме владельца и админа)
CREATE TABLE t_p38600009_virtual_asset_trader.withdrawal_requisites (
    id          text PRIMARY KEY,
    user_id     text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    type        text NOT NULL, -- 'sbp' | 'card'
    -- СБП
    phone       text,
    bank        text,
    -- Карта
    card_number text,
    card_holder text,
    -- Мета
    label       text,          -- удобное название (необязательно)
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Реквизиты платформы для ПОПОЛНЕНИЯ (пул, из которого рандомно выбирается 1)
-- Эти реквизиты добавляет/удаляет только админ через свою панель
CREATE TABLE t_p38600009_virtual_asset_trader.deposit_requisites (
    id          text PRIMARY KEY,
    name        text NOT NULL,   -- "Сбербанк СБП", "Тинькофф карта" ...
    type        text NOT NULL,   -- 'sbp' | 'card' | 'crypto' | 'wallet'
    details     text NOT NULL,   -- номер карты / телефон / адрес
    bank        text,            -- для СБП
    currency    text NOT NULL DEFAULT 'RUB',
    active      boolean NOT NULL DEFAULT true,
    show_count  integer NOT NULL DEFAULT 0,  -- сколько раз уже показан
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Заявки на партнёрство
CREATE TABLE t_p38600009_virtual_asset_trader.partner_applications (
    id              text PRIMARY KEY,
    user_id         text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    platforms       jsonb NOT NULL DEFAULT '[]', -- [{platform: "Twitch", url: "...", subscribers: 5000, avg_views: 1500}]
    status          text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    reject_reason   text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    reviewed_at     timestamptz,
    reviewed_by     text
);

-- Активные партнёры (создаётся при одобрении заявки)
CREATE TABLE t_p38600009_virtual_asset_trader.partners (
    id              text PRIMARY KEY,
    user_id         text NOT NULL UNIQUE REFERENCES t_p38600009_virtual_asset_trader.users(id),
    ref_code        text NOT NULL UNIQUE,    -- уникальный реф-код (в ссылке ?ref=CODE)
    commission_pct  numeric(5,2) NOT NULL DEFAULT 1.00,  -- % отчислений
    total_earned    numeric(18,2) NOT NULL DEFAULT 0,
    total_referrals integer NOT NULL DEFAULT 0,
    platforms       jsonb NOT NULL DEFAULT '[]',
    active          boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Реферальные переходы (кто пришёл по чьей ссылке)
CREATE TABLE t_p38600009_virtual_asset_trader.referrals (
    id              text PRIMARY KEY,
    partner_id      text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.partners(id),
    referred_user_id text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Добавляем ref_by в users (кем приведён пользователь)
ALTER TABLE t_p38600009_virtual_asset_trader.users
    ADD COLUMN IF NOT EXISTS ref_by text;

-- Начальные реквизиты для пополнения (используются по умолчанию)
INSERT INTO t_p38600009_virtual_asset_trader.deposit_requisites (id, name, type, details, bank, currency, active)
VALUES
    ('dr-001', 'Сбербанк СБП', 'sbp', '+7 (999) 000-00-00', 'Сбербанк', 'RUB', true),
    ('dr-002', 'Тинькофф карта', 'card', '2200 **** **** 0000', null, 'RUB', true),
    ('dr-003', 'USDT TRC-20', 'crypto', 'TXxxxxxxxxxxxxxxxxxxxxxxxxxx', null, 'USDT', true);
