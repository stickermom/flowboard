/*
  # Fix Infinite Recursion in admin_users RLS Policies

  The issue: admin_users table policies check admin_users table itself, causing infinite recursion.
  
  Solution: 
  - Use SECURITY DEFINER function to bypass RLS for the check
  - Fix policies to avoid self-referential queries
*/

-- Create a helper function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when checking admin status
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check super admin status
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when checking admin status
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = check_user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;

-- Create new policy using the helper function (avoids recursion)
CREATE POLICY "Super admins can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Also fix the "Admins can update own profile" policy to avoid issues
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_users;
CREATE POLICY "Admins can update own profile"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated, anon;


