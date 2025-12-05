-- Script to create your first admin user
-- Run this in Supabase SQL Editor or via CLI: supabase db execute < scripts/create-admin-user.sql

-- Replace these values with your actual admin credentials
DO $$
DECLARE
  admin_email text := 'admin@example.com';
  admin_password text := 'ChangeThisPassword123!';
  admin_name text := 'Admin User';
  admin_role text := 'super_admin';
BEGIN
  -- Insert admin user with hashed password
  INSERT INTO admin_users (email, password_hash, name, role)
  VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    admin_name,
    admin_role
  )
  ON CONFLICT (email) DO NOTHING;
  
  RAISE NOTICE 'Admin user created successfully!';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Password: % (change this after first login!)', admin_password;
END $$;

-- Verify the user was created
SELECT id, email, name, role, created_at 
FROM admin_users 
WHERE email = 'admin@example.com';

