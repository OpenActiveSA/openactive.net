-- ============================================================================
-- Simple Fix for Clubs RLS Policies - Direct Policy Without Function
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Drop all existing policies on Clubs table
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "Clubs";
DROP POLICY IF EXISTS "Allow authenticated manage" ON "Clubs";
DROP POLICY IF EXISTS "TEMP: Allow authenticated users to update clubs" ON "Clubs";
DROP POLICY IF EXISTS "TEMP: Allow authenticated users to insert clubs" ON "Clubs";
DROP POLICY IF EXISTS "TEMP: Allow authenticated users to delete clubs" ON "Clubs";

-- Step 2: Create new policies

-- Policy 1: Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow SUPER_ADMIN to manage clubs (INSERT, UPDATE, DELETE)
-- Direct comparison without function - handles both UUID and text types
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM "Users"
            WHERE (
                -- Handle text ID column
                "Users".id::text = auth.uid()::text
                OR
                -- Handle UUID ID column (if it exists)
                "Users".id::uuid = auth.uid()
            )
            AND "Users".role = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM "Users"
            WHERE (
                -- Handle text ID column
                "Users".id::text = auth.uid()::text
                OR
                -- Handle UUID ID column (if it exists)
                "Users".id::uuid = auth.uid()
            )
            AND "Users".role = 'SUPER_ADMIN'
        )
    );

-- Policy 3: Allow public/anonymous users to read clubs (for public pages)
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- Step 3: Verify the policies were created
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

-- Step 4: Test query to verify your user can be found
SELECT 
    auth.uid() as current_user_id,
    auth.uid()::text as current_user_id_text,
    u.id as user_id,
    u.id::text as user_id_text,
    u.role as user_role,
    CASE 
        WHEN u.id::text = auth.uid()::text THEN 'MATCH (text)'
        WHEN u.id::uuid = auth.uid() THEN 'MATCH (uuid)'
        ELSE 'NO MATCH'
    END as match_status
FROM "Users" u
WHERE u.role = 'SUPER_ADMIN'
ORDER BY u.id
LIMIT 5;

