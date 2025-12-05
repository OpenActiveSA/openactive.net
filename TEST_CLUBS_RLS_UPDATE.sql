-- ============================================================================
-- Test and Debug Clubs RLS Update Policy
-- Run this in Supabase SQL Editor to test if updates work
-- ============================================================================

-- First, check if the helper function exists and works
SELECT 
    auth.uid() as current_user_id,
    is_super_admin() as is_super_admin_check;

-- Check your user role
SELECT 
    id,
    role,
    CASE 
        WHEN id = auth.uid() THEN 'ID matches (UUID)'
        WHEN id::text = auth.uid()::text THEN 'ID matches (text)'
        ELSE 'ID does not match'
    END as id_match
FROM "Users"
WHERE role = 'SUPER_ADMIN'
LIMIT 5;

-- Test if you can see clubs
SELECT id, name, "is_active" 
FROM "Clubs" 
LIMIT 5;

-- Try a test update (replace 'YOUR_CLUB_ID' with an actual club ID)
-- This will show if the RLS policy is blocking the update
-- Uncomment and run this to test:
/*
UPDATE "Clubs" 
SET "updatedAt" = NOW()
WHERE id = 'YOUR_CLUB_ID_HERE'
RETURNING id, name, "updatedAt";
*/

-- Check current RLS policies
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

