CREATE TABLE t_p38600009_virtual_asset_trader.categories (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    unit_label text NOT NULL DEFAULT 'шт',
    hold_days integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO t_p38600009_virtual_asset_trader.categories (name, unit_label, hold_days, sort_order) VALUES
  ('Игровые аккаунты', 'шт', 0, 1),
  ('Программное обеспечение', 'шт', 0, 2),
  ('Подарочные карты', 'шт', 0, 3),
  ('CS2 скины', 'шт', 8, 4),
  ('PUBG Mobile akk', 'UC', 14, 5),
  ('Прочее', 'шт', 0, 6);

ALTER TABLE t_p38600009_virtual_asset_trader.products
    ADD COLUMN stock integer NOT NULL DEFAULT 1,
    ADD COLUMN unit_label text NOT NULL DEFAULT 'шт';

ALTER TABLE t_p38600009_virtual_asset_trader.deals
    ADD COLUMN quantity integer NOT NULL DEFAULT 1,
    ADD COLUMN unit_label text NOT NULL DEFAULT 'шт';
