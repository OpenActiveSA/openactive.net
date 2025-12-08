-- ============================================================================
-- Test Courts Insert - Diagnostic Script
-- Run this to test if you can insert courts and check permissions
-- ============================================================================

-- Check current user
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- Check if current user is SUPER_ADMIN
DO $$ 
DECLARE
    users_table_name TEXT;
    is_super_admin BOOLEAN := false;
    result_text TEXT;
BEGIN
    -- Check which table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
        users_table_name := 'Users';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        users_table_name := 'User';
    ELSE
        RAISE NOTICE 'Neither Users nor User table found.';
        RETURN;
    END IF;
    
    -- Check if user is SUPER_ADMIN using positional format specifiers
    EXECUTE format('
        SELECT EXISTS (
            SELECT 1 FROM %1$I
            WHERE %1$I.id::text = $1::text
            AND %1$I.role = ''SUPER_ADMIN''
        )',
        users_table_name
    ) INTO is_super_admin USING auth.uid();
    
    IF is_super_admin THEN
        result_text := format('✅ User is SUPER_ADMIN (checked in %s table)', users_table_name);
    ELSE
        result_text := format('❌ User is NOT SUPER_ADMIN (checked in %s table)', users_table_name);
    END IF;
    
    RAISE NOTICE '%', result_text;
END $$;

-- Also show the user's role directly
SELECT 
    'User Role Check' as test_type,
    id,
    role,
    CASE 
        WHEN role = 'SUPER_ADMIN' THEN '✅ This user is SUPER_ADMIN'
        ELSE '❌ This user is NOT SUPER_ADMIN'
    END as result
FROM "Users"
WHERE id::text = auth.uid()::text;

-- Get a club ID to test with
SELECT 
    'Available Clubs' as info,
    id,
    name
FROM "Clubs"
LIMIT 5;

-- Try to insert a test court (replace 'club-id-here' with an actual club ID from above)
-- Uncomment and run this after getting a club ID:
/*
INSERT INTO "Courts" ("clubId", "name", "sportType", "isActive")
VALUES (
    'club-id-here',  -- Replace with actual club ID
    'Test Court',
    'TENNIS',
    true
)
RETURNING *;
*/

-- Check RLS policies on Courts table
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'Courts'
ORDER BY policyname;

