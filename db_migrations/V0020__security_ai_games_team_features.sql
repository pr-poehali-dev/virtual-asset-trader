-- DDoS-защита: учёт запросов по IP и временные блокировки
CREATE TABLE t_p38600009_virtual_asset_trader.ip_hits (
    id serial PRIMARY KEY,
    ip text NOT NULL,
    bucket text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ip_hits_lookup ON t_p38600009_virtual_asset_trader.ip_hits(ip, bucket, created_at);

CREATE TABLE t_p38600009_virtual_asset_trader.blocked_ips (
    ip text PRIMARY KEY,
    reason text,
    blocked_until timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Тикеты безопасности: одноразовые коды для чувствительных действий (вывод средств, крупные траты)
CREATE TABLE t_p38600009_virtual_asset_trader.security_tickets (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    action_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    code text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    confirmed_at timestamptz
);
CREATE INDEX idx_security_tickets_user ON t_p38600009_virtual_asset_trader.security_tickets(user_id, status);

-- Онлайн-статус команды + верификация крупных трат раз в месяц
ALTER TABLE t_p38600009_virtual_asset_trader.users
    ADD COLUMN last_seen_at timestamptz,
    ADD COLUMN big_spend_verified_month text;

-- Исправление бага: used_at использовался в коде, но отсутствовал в схеме
ALTER TABLE t_p38600009_virtual_asset_trader.email_verifications
    ADD COLUMN used_at timestamptz;

-- ИИ-ассистент в чате поддержки
ALTER TABLE t_p38600009_virtual_asset_trader.support_tickets
    ADD COLUMN ai_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN escalated boolean NOT NULL DEFAULT false;

-- История ставок: номер билета победителя, создатель игры уже есть (created_by)
ALTER TABLE t_p38600009_virtual_asset_trader.games
    ADD COLUMN winner_ticket_no integer;
ALTER TABLE t_p38600009_virtual_asset_trader.game_bets
    ADD COLUMN ticket_no integer NOT NULL DEFAULT 1;
