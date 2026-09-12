CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.giveaways (
    id                  text PRIMARY KEY,
    title               text NOT NULL,
    description         text,
    prize_description   text NOT NULL,     -- что разыгрывается (текстовое описание приза)
    prize_amount        numeric(18,2),     -- если приз — денежная сумма, зачисляемая автоматически
    requirement_type     text NOT NULL,     -- 'deposit' (пополнить баланс) | 'sell' (продать на сумму)
    requirement_amount   numeric(18,2) NOT NULL,  -- сумма для выполнения условия
    requirement_days     integer NOT NULL, -- за сколько дней должно быть выполнено условие
    winners_count       integer NOT NULL DEFAULT 1,
    status              text NOT NULL DEFAULT 'active',  -- 'active' | 'finished' | 'cancelled'
    visible             boolean NOT NULL DEFAULT true,   -- видимость раздела пользователям (управляется админом)
    created_by          text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    expires_at          timestamptz NOT NULL,
    finished_at         timestamptz
);

CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.giveaway_participants (
    id            bigserial PRIMARY KEY,
    giveaway_id   text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.giveaways(id),
    user_id       text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    joined_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (giveaway_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.giveaway_winners (
    id            bigserial PRIMARY KEY,
    giveaway_id   text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.giveaways(id),
    user_id       text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_giveaway_participants_giveaway ON t_p38600009_virtual_asset_trader.giveaway_participants (giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_status ON t_p38600009_virtual_asset_trader.giveaways (status);
