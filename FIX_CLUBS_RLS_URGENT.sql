-- ============================================================================
-- URGENT: Fix Clubs RLS Policies - Allow All Authenticated Users to Read
-- Run this in Supabase SQL Editor immediately
-- ============================================================================

BEGIN;

-- Drop ALL existing policies on Clubs table
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated manage" ON "Clubs";

-- Policy 1: Allow ALL authenticated users to SELECT (read) clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow SUPER_ADMIN to manage clubs (insert, update, delete)
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM "Users"
            WHERE "Users".id = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM "Users"
            WHERE "Users".id = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
    );

-- Policy 3: Allow public/anonymous users to read clubs (for public pages)
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- Verify the policies were created
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


