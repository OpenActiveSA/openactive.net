-- ============================================================================
-- TEMPORARY: Allow All Authenticated Users to Update Clubs
-- ⚠️ WARNING: This is for testing only! Remove after fixing the RLS issue.
-- Run this in Supabase SQL Editor to temporarily allow updates
-- ============================================================================

BEGIN;

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";

-- Create a temporary permissive policy for testing
-- This allows ALL authenticated users to update clubs
CREATE POLICY "TEMP: Allow authenticated users to update clubs" ON "Clubs"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow insert and delete for testing
CREATE POLICY "TEMP: Allow authenticated users to insert clubs" ON "Clubs"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "TEMP: Allow authenticated users to delete clubs" ON "Clubs"
    FOR DELETE
    TO authenticated
    USING (true);

COMMIT;

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'Clubs'
ORDER BY policyname;

-- ⚠️ REMEMBER: After testing, run FIX_CLUBS_RLS_COMPLETE.sql to restore proper security!

