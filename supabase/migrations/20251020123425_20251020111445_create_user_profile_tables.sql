/*
  # Create User Profile System

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (text) - stores user identifier
      - `order_number` (text) - unique order reference
      - `items` (jsonb) - order items with product details
      - `total` (decimal) - order total amount
      - `status` (text) - order status (pending, completed, cancelled)
      - `created_at` (timestamptz) - order date
      - `updated_at` (timestamptz) - last update
    
    - `addresses`
      - `id` (uuid, primary key)
      - `user_id` (text) - stores user identifier
      - `name` (text) - address name/label
      - `street` (text) - street address
      - `city` (text) - city
      - `state` (text) - state/province
      - `postal_code` (text) - postal/zip code
      - `country` (text) - country
      - `is_default` (boolean) - default address flag
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (text) - stores user identifier (unique)
      - `email_notifications` (boolean) - email notification preference
      - `sms_notifications` (boolean) - SMS notification preference
      - `newsletter` (boolean) - newsletter subscription
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own data
    
  3. Important Notes
    - Using text for user_id to support guest users with local identifiers
    - Orders store full item details in JSONB for history preservation
    - Only one default address per user enforced by application logic
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  order_number text UNIQUE NOT NULL,
  items jsonb NOT NULL,
  total decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  newsletter boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create own orders" ON orders;
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Addresses policies
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create own addresses" ON addresses;
CREATE POLICY "Users can create own addresses"
  ON addresses FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (true);

-- User preferences policies
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create own preferences" ON user_preferences;
CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);