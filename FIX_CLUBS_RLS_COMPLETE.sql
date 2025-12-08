-- ============================================================================
-- Complete Fix for Clubs RLS Policies - Ensure Updates Work
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Create a helper function to check if current user is SUPER_ADMIN
-- This function handles UUID/text comparisons properly
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    current_user_uuid UUID;
    current_user_text TEXT;
BEGIN
    -- Get current authenticated user UUID
    current_user_uuid := auth.uid();
    
    -- If no user is authenticated, return false
    IF current_user_uuid IS NULL THEN
        RETURN false;
    END IF;
    
    -- Convert UUID to text for comparison
    current_user_text := current_user_uuid::text;
    
    -- Try Users table first (plural) - handle both UUID and text types
    SELECT role INTO user_role
    FROM "Users"
    WHERE (
        -- Try UUID comparison if id is UUID type
        (id::text = current_user_text)
        OR
        -- Try text comparison if id is text type
        (id = current_user_text)
    )
    LIMIT 1;
    
    -- If not found, try User table (singular)
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM "User"
        WHERE (
            (id::text = current_user_text)
            OR
            (id = current_user_text)
        )
        LIMIT 1;
    END IF;
    
    -- Return true if role is SUPER_ADMIN
    RETURN user_role = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop all existing policies on Clubs table
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated manage" ON "Clubs";

-- Step 3: Create new policies

-- Policy 1: Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow SUPER_ADMIN to manage clubs (INSERT, UPDATE, DELETE)
-- Using the helper function for better performance and reliability
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Policy 3: Allow public/anonymous users to read clubs (for public pages)
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- Step 4: Verify the policies were created
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

-- Step 5: Test the helper function (run this while logged in as SUPER_ADMIN)
-- This should return true if you're logged in as SUPER_ADMIN
SELECT 
    auth.uid() as current_user_id,
    auth.uid()::text as current_user_id_text,
    is_super_admin() as is_super_admin_check,
    u.id as user_id,
    u.role as user_role
FROM "Users" u
WHERE u.id::text = auth.uid()::text
LIMIT 1;

