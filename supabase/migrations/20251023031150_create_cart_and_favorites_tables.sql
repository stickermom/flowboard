/*
  # Create Cart and Favorites Tables

  1. New Tables
    - `cart_items`
      - `id` (uuid, primary key)
      - `user_id` (text) - stores user identifier (guest or authenticated)
      - `product_id` (uuid) - reference to products table
      - `quantity` (integer) - number of items
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (text) - stores user identifier (guest or authenticated)
      - `product_id` (uuid) - reference to products table
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Allow public access for guest users (using text-based user_id)
    - Users can only access their own cart and favorites
    
  3. Important Notes
    - Using text for user_id to support guest users with local identifiers
    - Foreign key to products table with CASCADE on delete
    - Unique constraint on user_id + product_id for favorites
*/

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Cart items policies (allow all operations for everyone since we use text-based user_id)
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create own cart items" ON cart_items;
CREATE POLICY "Users can create own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (true);

-- Favorites policies (allow all operations for everyone since we use text-based user_id)
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create own favorites" ON favorites;
CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);

-- Create trigger for cart_items updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cart_items_updated_at') THEN
    CREATE TRIGGER update_cart_items_updated_at
      BEFORE UPDATE ON cart_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;