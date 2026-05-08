CREATE TABLE IF NOT EXISTS t_p38600009_virtual_asset_trader.monitor_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'error',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT,
  user_id VARCHAR(64),
  ip TEXT,
  status_code INT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);