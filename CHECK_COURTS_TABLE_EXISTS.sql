-- ============================================================================
-- Check if Courts Table Exists
-- Run this to diagnose why the Courts table might not be visible
-- ============================================================================

-- Check if table exists
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'Courts';

-- Check if SportType enum exists
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname = 'SportType'
ORDER BY e.enumsortorder;

-- Check table structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Courts'
ORDER BY ordinal_position;

-- Check RLS policies
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
WHERE schemaname = 'public' 
AND tablename = 'Courts';

-- Try to query the table (will fail if it doesn't exist)
SELECT COUNT(*) as court_count FROM "Courts";

