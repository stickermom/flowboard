/*
  # Create User Profiles with Supabase Auth Integration
  
  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `phone` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Updates to Existing Tables
    - Support both authenticated users (UUID) and guest users (text) in user_id fields
    - Add RLS policies for authenticated users
  
  3. Functions
    - Auto-create user profile on signup
    - Handle user deletion
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile when auth user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar'
    ),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update profile on user update
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Update RLS policies to support authenticated users
-- Orders: authenticated users can only see their own
DROP POLICY IF EXISTS "Authenticated users can view own orders" ON orders;
CREATE POLICY "Authenticated users can view own orders"
  ON orders FOR SELECT
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

DROP POLICY IF EXISTS "Authenticated users can create own orders" ON orders;
CREATE POLICY "Authenticated users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

-- Addresses: authenticated users can only see their own
DROP POLICY IF EXISTS "Authenticated users can view own addresses" ON addresses;
CREATE POLICY "Authenticated users can view own addresses"
  ON addresses FOR SELECT
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

DROP POLICY IF EXISTS "Authenticated users can manage own addresses" ON addresses;
CREATE POLICY "Authenticated users can manage own addresses"
  ON addresses FOR ALL
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  )
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

-- User preferences: authenticated users can only see their own
DROP POLICY IF EXISTS "Authenticated users can view own preferences" ON user_preferences;
CREATE POLICY "Authenticated users can view own preferences"
  ON user_preferences FOR SELECT
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

DROP POLICY IF EXISTS "Authenticated users can manage own preferences" ON user_preferences;
CREATE POLICY "Authenticated users can manage own preferences"
  ON user_preferences FOR ALL
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  )
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

-- Cart items: authenticated users can only see their own
DROP POLICY IF EXISTS "Authenticated users can view own cart items" ON cart_items;
CREATE POLICY "Authenticated users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

DROP POLICY IF EXISTS "Authenticated users can manage own cart items" ON cart_items;
CREATE POLICY "Authenticated users can manage own cart items"
  ON cart_items FOR ALL
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  )
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

-- Favorites: authenticated users can only see their own
DROP POLICY IF EXISTS "Authenticated users can view own favorites" ON favorites;
CREATE POLICY "Authenticated users can view own favorites"
  ON favorites FOR SELECT
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

DROP POLICY IF EXISTS "Authenticated users can manage own favorites" ON favorites;
CREATE POLICY "Authenticated users can manage own favorites"
  ON favorites FOR ALL
  USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  )
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()::text
      ELSE true
    END
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_auth ON orders(user_id) WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

