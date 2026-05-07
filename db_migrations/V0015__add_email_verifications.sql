CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.email_verifications (
    id          serial PRIMARY KEY,
    email       text NOT NULL,
    code        text NOT NULL,
    expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
    used        boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_verif_email ON t_p38600009_virtual_asset_trader.email_verifications(email, expires_at DESC);
