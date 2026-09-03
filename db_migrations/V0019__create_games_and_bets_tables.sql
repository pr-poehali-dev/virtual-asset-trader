CREATE TABLE t_p38600009_virtual_asset_trader.games (
    id text NOT NULL PRIMARY KEY,
    title text NOT NULL DEFAULT 'Игра',
    bet_amount numeric(18,2) NOT NULL,
    target_bank numeric(18,2) NOT NULL,
    duration_seconds integer NOT NULL,
    bank numeric(18,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    winner_id text NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    winner_amount numeric(18,2) NULL,
    created_by text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone NULL
);

CREATE TABLE t_p38600009_virtual_asset_trader.game_bets (
    id text NOT NULL PRIMARY KEY,
    game_id text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.games(id),
    user_id text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    amount numeric(18,2) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_bets_game_id ON t_p38600009_virtual_asset_trader.game_bets(game_id);
CREATE INDEX idx_games_status ON t_p38600009_virtual_asset_trader.games(status);
