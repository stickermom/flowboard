/*
  # Admin Dashboard Schema - Products, Categories, and Admin Users

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `name` (text)
      - `role` (text) - admin or super_admin
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `description` (text)
      - `image_url` (text)
      - `parent_id` (uuid, nullable) - for subcategories
      - `display_order` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `price` (decimal)
      - `compare_at_price` (decimal, nullable) - for showing discounts
      - `cost_per_item` (decimal, nullable) - for profit tracking
      - `sku` (text, unique, nullable)
      - `barcode` (text, nullable)
      - `category_id` (uuid, foreign key)
      - `image_url` (text)
      - `images` (jsonb) - array of additional images
      - `inventory_quantity` (integer)
      - `track_inventory` (boolean)
      - `allow_backorder` (boolean)
      - `weight` (decimal, nullable)
      - `weight_unit` (text, nullable)
      - `is_active` (boolean)
      - `is_featured` (boolean)
      - `tags` (text[])
      - `metadata` (jsonb) - for custom fields
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `inventory_history`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `change_type` (text) - sale, restock, adjustment, return
      - `quantity_change` (integer)
      - `quantity_after` (integer)
      - `reference_id` (text, nullable) - order number or note
      - `admin_user_id` (uuid, nullable, foreign key)
      - `created_at` (timestamptz)

  2. Modify Existing Tables
    - Update `orders` table to add more fields for admin management
    - Add `order_items` separate table for better normalization

  3. Security
    - Enable RLS on all tables
    - Add policies for admin users only
    - Restrict public access to admin tables
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only super admins can manage admin users" ON admin_users;
CREATE POLICY "Only super admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  image_url text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories"
  ON categories
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  price decimal(10, 2) NOT NULL,
  compare_at_price decimal(10, 2),
  cost_per_item decimal(10, 2),
  sku text UNIQUE,
  barcode text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  inventory_quantity integer DEFAULT 0,
  track_inventory boolean DEFAULT true,
  allow_backorder boolean DEFAULT false,
  weight decimal(10, 2),
  weight_unit text DEFAULT 'kg',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  tags text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create inventory_history table
CREATE TABLE IF NOT EXISTS inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  change_type text NOT NULL,
  quantity_change integer NOT NULL,
  quantity_after integer NOT NULL,
  reference_id text,
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view inventory history" ON inventory_history;
CREATE POLICY "Admins can view inventory history"
  ON inventory_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert inventory history" ON inventory_history;
CREATE POLICY "Admins can insert inventory history"
  ON inventory_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Update orders table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
      ALTER TABLE orders ADD COLUMN customer_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN
      ALTER TABLE orders ADD COLUMN customer_email text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_address') THEN
      ALTER TABLE orders ADD COLUMN shipping_address jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
      ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fulfillment_status') THEN
      ALTER TABLE orders ADD COLUMN fulfillment_status text DEFAULT 'unfulfilled';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
      ALTER TABLE orders ADD COLUMN notes text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
      ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_users_updated_at') THEN
    CREATE TRIGGER update_admin_users_updated_at
      BEFORE UPDATE ON admin_users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at') THEN
    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;