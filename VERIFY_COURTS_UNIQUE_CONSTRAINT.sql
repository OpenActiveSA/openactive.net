-- ============================================================================
-- Verify Courts Unique Constraint
-- This script checks if the unique constraint is set up correctly
-- ============================================================================

-- Check the constraint definition
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public."Courts"'::regclass
AND conname = 'Courts_clubId_name_key';

-- Check if we can have the same name on different clubs
-- This should work - same name, different clubId
SELECT 
    'Test: Can we have "Court 1" on multiple clubs?' AS test_description,
    COUNT(*) AS existing_courts_with_name,
    COUNT(DISTINCT "clubId") AS different_clubs_with_name
FROM "Courts"
WHERE "name" = 'Court 1';

-- Show all constraints on Courts table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE 'OTHER'
    END AS constraint_type_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public."Courts"'::regclass
ORDER BY contype, conname;





