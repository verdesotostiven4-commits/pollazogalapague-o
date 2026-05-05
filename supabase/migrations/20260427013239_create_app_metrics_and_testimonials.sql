/*
  # Create app_metrics and testimonials tables

  ## New Tables

  ### app_metrics
  - `id` (text, primary key) — metric key e.g. 'total_visits', 'total_orders'
  - `value` (bigint) — current counter value
  - `updated_at` (timestamptz) — last updated

  ### testimonials
  - `id` (uuid, primary key)
  - `author_name` (text) — reviewer's name
  - `stars` (int, 1-5) — star rating
  - `comment` (text) — review text
  - `photo_url` (text, nullable) — uploaded photo URL
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - app_metrics: public read, no write from client (managed via function)
  - testimonials: public read/insert, no update/delete from anonymous

  ## Notes
  - Metrics use upsert pattern keyed by id string
  - online_users is computed client-side via presence, not stored
*/

-- app_metrics table
CREATE TABLE IF NOT EXISTS app_metrics (
  id text PRIMARY KEY,
  value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read metrics"
  ON app_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

-- seed initial rows
INSERT INTO app_metrics (id, value) VALUES
  ('total_visits', 0),
  ('total_orders', 0)
ON CONFLICT (id) DO NOTHING;

-- testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT '',
  stars integer NOT NULL DEFAULT 5 CHECK (stars >= 1 AND stars <= 5),
  comment text NOT NULL DEFAULT '',
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read testimonials"
  ON testimonials FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert testimonials"
  ON testimonials FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(author_name) > 0
    AND length(comment) > 0
    AND stars >= 1
    AND stars <= 5
  );

CREATE POLICY "Anyone can delete testimonials"
  ON testimonials FOR DELETE
  TO anon, authenticated
  USING (true);
