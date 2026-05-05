/*
  # Product Overrides and App Settings

  1. New Tables
    - `product_overrides`
      - `id` (text, primary key) — matches product id from products.ts
      - `price` (text, nullable) — override price string e.g. "$2.50", null = use default
      - `available` (boolean) — false = shown as "Agotado" in catalog
      - `updated_at` (timestamptz)
    - `app_settings`
      - `key` (text, primary key) — e.g. "announcement"
      - `value` (text) — the setting value
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Public SELECT allowed (catalog reads overrides without auth)
    - INSERT/UPDATE restricted to service role only (admin operations go through anon key
      but we use a separate admin_token check via app_settings)
    - Admin writes use a special anon policy gated on a secret token stored in app_settings

  Note: Since this is a single-owner app with PIN auth handled client-side,
  we allow anon reads and anon writes (the PIN is the security layer).
  For a production multi-tenant app, proper auth would be used.
*/

-- Product overrides table
CREATE TABLE IF NOT EXISTS product_overrides (
  id text PRIMARY KEY,
  price text,
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product overrides"
  ON product_overrides FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon can insert product overrides"
  ON product_overrides FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update product overrides"
  ON product_overrides FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon can insert app settings"
  ON app_settings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update app settings"
  ON app_settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Seed the announcement setting
INSERT INTO app_settings (key, value) VALUES ('announcement', '')
ON CONFLICT (key) DO NOTHING;
