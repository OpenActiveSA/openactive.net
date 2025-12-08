-- ============================================================================
-- TEMPORARY: Fix Clubs Table RLS Policies for Testing
-- This allows all authenticated users to insert clubs (for testing only)
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Drop all existing policies on Clubs table
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated manage" ON "Clubs";

-- Policy 1: Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: TEMPORARY - Allow all authenticated users to insert/update/delete
-- REMOVE THIS AFTER TESTING and use the SUPER_ADMIN policy instead
CREATE POLICY "Allow authenticated manage" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

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


