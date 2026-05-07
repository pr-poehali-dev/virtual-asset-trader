-- Журнал подозрительных действий для anti-spam / anti-fraud
CREATE TABLE t_p38600009_virtual_asset_trader.security_events (
    id          serial PRIMARY KEY,
    user_id     text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    event_type  text NOT NULL,  -- 'buy', 'dispute', 'support_msg', 'cancel_deposit', etc.
    ip          text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_security_events_user_time ON t_p38600009_virtual_asset_trader.security_events(user_id, created_at DESC);

-- Флаг вечного бана чата поддержки
ALTER TABLE t_p38600009_virtual_asset_trader.users
    ADD COLUMN IF NOT EXISTS chat_banned boolean NOT NULL DEFAULT false;

-- Флаг вечного бана аккаунта (отдельный от status='blocked')
ALTER TABLE t_p38600009_virtual_asset_trader.users
    ADD COLUMN IF NOT EXISTS perma_banned boolean NOT NULL DEFAULT false;
