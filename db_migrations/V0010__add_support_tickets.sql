-- Тикеты поддержки (один тикет = один диалог с пользователем)
CREATE TABLE t_p38600009_virtual_asset_trader.support_tickets (
    id          text PRIMARY KEY,
    user_id     text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    subject     text,
    status      text NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
    operator_id text REFERENCES t_p38600009_virtual_asset_trader.users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Сообщения в тикете
CREATE TABLE t_p38600009_virtual_asset_trader.support_messages (
    id          serial PRIMARY KEY,
    ticket_id   text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.support_tickets(id),
    from_user   text NOT NULL,   -- user_id или 'system'/'operator'
    role        text NOT NULL,   -- 'user' | 'operator' | 'system'
    text        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
