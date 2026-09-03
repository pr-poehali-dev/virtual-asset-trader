ALTER TABLE t_p38600009_virtual_asset_trader.games
    ADD COLUMN winners_count integer NOT NULL DEFAULT 1;

CREATE TABLE t_p38600009_virtual_asset_trader.game_winners (
    id serial PRIMARY KEY,
    game_id text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.games(id),
    user_id text NOT NULL REFERENCES t_p38600009_virtual_asset_trader.users(id),
    ticket_no integer NOT NULL,
    amount numeric(18,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_winners_game_id ON t_p38600009_virtual_asset_trader.game_winners(game_id);
