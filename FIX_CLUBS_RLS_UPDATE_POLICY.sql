-- ============================================================================
-- Fix Clubs RLS Update Policy - Ensure SUPER_ADMIN can update clubs
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Drop existing update policy
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";

-- Create a more robust policy that handles UUID comparisons correctly
-- This policy allows SUPER_ADMIN users to INSERT, UPDATE, and DELETE clubs
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM "Users"
            WHERE (
                -- Handle both UUID and text comparisons
                "Users".id::text = auth.uid()::text
                OR "Users".id = auth.uid()
            )
            AND "Users".role = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM "Users"
            WHERE (
                -- Handle both UUID and text comparisons
                "Users".id::text = auth.uid()::text
                OR "Users".id = auth.uid()
            )
            AND "Users".role = 'SUPER_ADMIN'
        )
    );

COMMIT;

-- Verify the policy was created
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

-- Test query to check if current user is SUPER_ADMIN
SELECT 
    auth.uid() as current_user_id,
    u.id as user_table_id,
    u.role as user_role,
    CASE 
        WHEN u.id::text = auth.uid()::text THEN 'ID matches (text)'
        WHEN u.id = auth.uid() THEN 'ID matches (UUID)'
        ELSE 'ID does not match'
    END as id_match_status
FROM "Users" u
WHERE u.role = 'SUPER_ADMIN'
LIMIT 1;


