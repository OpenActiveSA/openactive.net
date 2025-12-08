-- ============================================================================
-- Fix Clubs Table RLS Policies (Improved Version)
-- Run this in Supabase SQL Editor to fix the timeout issue
-- This version uses a helper function for better performance
-- ============================================================================

BEGIN;

-- Step 1: Create a helper function to check if current user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try Users table first (plural)
    SELECT role INTO user_role
    FROM "Users"
    WHERE id::text = COALESCE(auth.uid()::text, '')
    LIMIT 1;
    
    -- If not found, try User table (singular)
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM "User"
        WHERE id::text = COALESCE(auth.uid()::text, '')
        LIMIT 1;
    END IF;
    
    RETURN user_role = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop all existing policies on Clubs table
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "Clubs";

-- Step 3: Create new policies

-- Policy 1: Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow SUPER_ADMIN to manage clubs (insert, update, delete)
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Policy 3: Allow public read access
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'Clubs'
ORDER BY policyname;

-- Test the function (optional - remove after testing)
-- SELECT is_super_admin() AS is_admin;


