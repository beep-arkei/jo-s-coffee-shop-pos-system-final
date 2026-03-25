
-- Store settings
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Jo''s Coffee Shop',
  logo text DEFAULT '',
  locked boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- App users (custom auth)
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'cashier',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Menu items
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  prices jsonb NOT NULL DEFAULT '{}',
  archived boolean DEFAULT false,
  image text DEFAULT '',
  out_of_stock boolean DEFAULT false,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code text UNIQUE NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  adjustment numeric DEFAULT 0,
  adjustment_input text DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  cash_received numeric DEFAULT 0,
  change numeric DEFAULT 0,
  cashier text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  customer_name text DEFAULT '',
  special_instructions text DEFAULT '',
  refunded_at timestamptz,
  refunded_by text,
  voided boolean DEFAULT false,
  voided_at timestamptz,
  voided_by text,
  created_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  menu_item_code text NOT NULL,
  name text NOT NULL,
  size text NOT NULL DEFAULT 'default',
  price numeric NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  customizations text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS with permissive policies (no Supabase Auth used)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.store_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.app_users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.menu_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.order_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;

-- Seed store settings
INSERT INTO public.store_settings (name, logo, locked) VALUES ('Jo''s Coffee Shop', '', false);

-- Seed users
INSERT INTO public.app_users (username, password, role, active) VALUES
  ('skindog', 'cG9wb3kxMjM=', 'admin', true),
  ('admin', 'YWRtaW4xMjM=', 'admin', true),
  ('beppu', 'YmVlcDEyMw==', 'admin', true),
  ('cashier1', 'MTIzNDU2', 'cashier', true),
  ('cashier2', 'MTIzNDU2', 'cashier', true),
  ('cashier3', 'MTIzNDU2', 'cashier', true);

-- Seed categories
INSERT INTO public.categories (name, sort_order) VALUES
  ('Milktea', 1), ('Coffee', 2), ('Nostalgia Series', 3), ('Starbucks Series', 4),
  ('Fruit Shake', 5), ('Refreshers Series', 6), ('Waffle', 7), ('Sandwich', 8), ('Fries', 9);

-- Seed menu items
INSERT INTO public.menu_items (code, name, category_id, prices, archived, out_of_stock) VALUES
  ('mt-classic', 'Classic Milktea', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":35,"Regular (16oz)":45,"Large (22oz)":55}', false, false),
  ('mt-hokkaido', 'Hokkaido', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('mt-okinawa', 'Okinawa', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('mt-matcha', 'Matcha', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('mt-wintermelon', 'Winter-melon', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('mt-chocolate', 'Chocolate', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('mt-cheesymango', 'Cheesy Mango', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('mt-cookiescream', 'Cookies & Cream', (SELECT id FROM public.categories WHERE name='Milktea'), '{"Small (12oz)":39,"Regular (16oz)":49,"Large (22oz)":59}', false, false),
  ('cf-macchiato', 'Macchiato', (SELECT id FROM public.categories WHERE name='Coffee'), '{"default":35}', false, false),
  ('cf-brewed', 'Brewed Coffee', (SELECT id FROM public.categories WHERE name='Coffee'), '{"default":50}', false, false),
  ('ns-dalgona', 'Dalgona', (SELECT id FROM public.categories WHERE name='Nostalgia Series'), '{"default":60}', false, false),
  ('sb-americano', 'Americano', (SELECT id FROM public.categories WHERE name='Starbucks Series'), '{"default":170}', false, false),
  ('sb-cappuccino', 'Cappuccino', (SELECT id FROM public.categories WHERE name='Starbucks Series'), '{"default":170}', false, false),
  ('sb-caramelmacchiato', 'Caramel Macchiato', (SELECT id FROM public.categories WHERE name='Starbucks Series'), '{"default":170}', false, false),
  ('fs-mango', 'Mango Shake', (SELECT id FROM public.categories WHERE name='Fruit Shake'), '{"default":35}', false, false),
  ('fs-watermelon', 'Watermelon Shake', (SELECT id FROM public.categories WHERE name='Fruit Shake'), '{"default":35}', false, false),
  ('fs-banana', 'Banana Shake', (SELECT id FROM public.categories WHERE name='Fruit Shake'), '{"default":35}', false, false),
  ('rf-carrot', 'Yakult Fizz Carrot', (SELECT id FROM public.categories WHERE name='Refreshers Series'), '{"default":50}', false, false),
  ('rf-orange', 'Yakult Fizz Orange', (SELECT id FROM public.categories WHERE name='Refreshers Series'), '{"default":50}', false, false),
  ('rf-pineapple', 'Yakult Fizz Pineapple', (SELECT id FROM public.categories WHERE name='Refreshers Series'), '{"default":50}', false, false),
  ('rf-classic', 'Yakult Fizz Classic', (SELECT id FROM public.categories WHERE name='Refreshers Series'), '{"default":40}', false, false),
  ('wf-blueberry', 'Blueberry Waffle (3pcs)', (SELECT id FROM public.categories WHERE name='Waffle'), '{"default":50}', false, false),
  ('wf-strawberry', 'Strawberry Waffle (3pcs)', (SELECT id FROM public.categories WHERE name='Waffle'), '{"default":50}', false, false),
  ('wf-classic', 'Classic Waffle (3pcs)', (SELECT id FROM public.categories WHERE name='Waffle'), '{"default":50}', false, false),
  ('sw-egg', 'Egg + Cabbage + Mayo', (SELECT id FROM public.categories WHERE name='Sandwich'), '{"default":35}', false, false),
  ('sw-tuna', 'Tuna + Cheese + Mayo', (SELECT id FROM public.categories WHERE name='Sandwich'), '{"default":40}', false, false),
  ('sw-hamcheese', 'Ham + Cheese + Mayo', (SELECT id FROM public.categories WHERE name='Sandwich'), '{"default":45}', false, false),
  ('sw-hamegg', 'Ham + Egg + Mayo', (SELECT id FROM public.categories WHERE name='Sandwich'), '{"default":50}', false, false),
  ('fr-cheese', 'Cheese Fries', (SELECT id FROM public.categories WHERE name='Fries'), '{"default":50}', false, false),
  ('fr-sourcream', 'Sour Cream Fries', (SELECT id FROM public.categories WHERE name='Fries'), '{"default":50}', false, false),
  ('fr-classic', 'Classic Fries', (SELECT id FROM public.categories WHERE name='Fries'), '{"default":45}', false, false);
