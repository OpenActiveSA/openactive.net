-- ============================================================================
-- Fix Clubs Table RLS Policies
-- Run this in Supabase SQL Editor to fix the timeout issue
-- ============================================================================

BEGIN;

-- Drop all existing policies on Clubs table
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "Clubs";

-- Policy 1: Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow SUPER_ADMIN to manage clubs (insert, update, delete)
-- This checks both Users and User table names (in case table wasn't renamed)
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM (
                SELECT id, role FROM "Users"
                UNION ALL
                SELECT id, role FROM "User"
            ) AS all_users
            WHERE all_users.id::text = COALESCE(auth.uid()::text, '')
            AND all_users.role = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM (
                SELECT id, role FROM "Users"
                UNION ALL
                SELECT id, role FROM "User"
            ) AS all_users
            WHERE all_users.id::text = COALESCE(auth.uid()::text, '')
            AND all_users.role = 'SUPER_ADMIN'
        )
    );

-- Policy 3: Allow public read access
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

-- TEMPORARY: For testing, allow all authenticated users to insert
-- Remove this policy once you confirm SUPER_ADMIN policy works
-- Uncomment the lines below if you want to test without SUPER_ADMIN check:
/*
CREATE POLICY "Allow authenticated insert" ON "Clubs"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
*/

COMMIT;

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'Clubs'
ORDER BY policyname;

