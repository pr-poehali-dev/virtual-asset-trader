CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.site_visits (
    id          bigserial PRIMARY KEY,
    visitor_id  text NOT NULL,   -- анонимный ID посетителя (генерируется на фронте, хранится в localStorage)
    path        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON t_p38600009_virtual_asset_trader.site_visits (created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON t_p38600009_virtual_asset_trader.site_visits (visitor_id);
