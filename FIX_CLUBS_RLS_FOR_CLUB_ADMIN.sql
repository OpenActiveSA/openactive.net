-- ============================================================================
-- Fix Clubs RLS Policies for Club Admin Access
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";

-- Policy 1: Allow all authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow SUPER_ADMIN to manage clubs
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

-- Policy 3: Allow public read access (optional - for public club pages)
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- Verify policies
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


