-- ============================================================================
-- Fix UserClubRoles RLS Infinite Recursion
-- The issue: Policies that check UserClubRoles create infinite recursion
-- Solution: Use SECURITY DEFINER functions to bypass RLS for checks
-- ============================================================================

BEGIN;

-- Step 1: Create helper function to check if user is CLUB_ADMIN for a club
-- This function uses SECURITY DEFINER to bypass RLS when checking UserClubRoles
CREATE OR REPLACE FUNCTION is_club_admin_for_club(check_club_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Check UserClubRoles directly (bypasses RLS due to SECURITY DEFINER)
    SELECT ucr."role" INTO user_role
    FROM "UserClubRoles" ucr
    WHERE ucr."userId"::text = auth.uid()::text
    AND ucr."clubId" = check_club_id
    AND ucr."role" = 'CLUB_ADMIN'
    LIMIT 1;
    
    RETURN user_role = 'CLUB_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Create helper function to check if user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try Users table first (plural)
    SELECT role INTO user_role
    FROM "Users"
    WHERE id::text = auth.uid()::text
    LIMIT 1;
    
    -- If not found, try User table (singular)
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM "User"
        WHERE id::text = auth.uid()::text
        LIMIT 1;
    END IF;
    
    RETURN user_role = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Drop existing policies on UserClubRoles
DROP POLICY IF EXISTS "Users can view their own club roles" ON "UserClubRoles";
DROP POLICY IF EXISTS "Authenticated users can view all club roles" ON "UserClubRoles";
DROP POLICY IF EXISTS "Club admins can manage club roles" ON "UserClubRoles";
DROP POLICY IF EXISTS "Super admins can manage all club roles" ON "UserClubRoles";

-- Step 4: Recreate policies using the helper functions (no recursion!)

-- Users can view their own club roles
CREATE POLICY "Users can view their own club roles" ON "UserClubRoles"
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = "userId"::text);

-- Authenticated users can view all club roles (for now - can be restricted later)
CREATE POLICY "Authenticated users can view all club roles" ON "UserClubRoles"
    FOR SELECT
    TO authenticated
    USING (true);

-- Club admins can manage roles for their club (using helper function - no recursion!)
CREATE POLICY "Club admins can manage club roles" ON "UserClubRoles"
    FOR ALL
    TO authenticated
    USING (is_club_admin_for_club("clubId"))
    WITH CHECK (is_club_admin_for_club("clubId"));

-- Super admins can manage all club roles (using helper function)
CREATE POLICY "Super admins can manage all club roles" ON "UserClubRoles"
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Step 5: Fix Courts policies to use helper functions too
DROP POLICY IF EXISTS "Club admins can manage club courts" ON "Courts";

-- Recreate Courts policy using helper function (no recursion!)
CREATE POLICY "Club admins can manage club courts" ON "Courts"
    FOR ALL
    TO authenticated
    USING (is_club_admin_for_club("clubId"))
    WITH CHECK (is_club_admin_for_club("clubId"));

COMMIT;

-- Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
AND (tablename = 'UserClubRoles' OR tablename = 'Courts')
ORDER BY tablename, policyname;








