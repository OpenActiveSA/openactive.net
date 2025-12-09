-- ============================================================================
-- Check Users Table Structure and Data
-- Run this in Supabase SQL Editor to see what columns exist and what data is stored
-- ============================================================================

-- Step 1: Check if the table exists and what columns it has
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('Users', 'User')
ORDER BY ordinal_position;

-- Step 2: Check what data is actually in the table (showing first 5 rows)
-- This will show you what values are stored for name-related fields
SELECT 
    id,
    email,
    "Firstname",
    "Surname",
    "avatarUrl",
    role,
    "createdAt"
FROM "Users"
LIMIT 5;

-- If the table is named "User" (singular), use this instead:
-- SELECT 
--     id,
--     email,
--     "Firstname",
--     "Surname",
--     "avatarUrl",
--     role,
--     "createdAt"
-- FROM "User"
-- LIMIT 5;

-- Step 3: Check all columns in the table (to see the full structure)
SELECT *
FROM "Users"
LIMIT 1;

-- If the table is named "User" (singular), use this instead:
-- SELECT *
-- FROM "User"
-- LIMIT 1;

