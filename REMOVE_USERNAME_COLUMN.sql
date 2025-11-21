-- ============================================================================
-- Migration: Remove username column from User table
-- ============================================================================
-- This script removes the username column since email will serve as the identifier
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Step 1: Drop the unique index on username if it exists
DROP INDEX IF EXISTS public."User_username_key";

-- Step 2: Drop the get_user_by_email function to allow return type change
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);

-- Step 3: Remove username column from User table
ALTER TABLE public."User" DROP COLUMN IF EXISTS "username";

-- Step 4: Recreate get_user_by_email function without username
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  "Firstname" TEXT,
  "Surname" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  role "Role",
  "isActive" BOOLEAN,
  "lastLoginAt" TIMESTAMP,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u."Firstname",
    u."Surname",
    u."displayName",
    u."avatarUrl",
    u.role,
    u."isActive",
    u."lastLoginAt",
    u."createdAt",
    u."updatedAt"
  FROM public."User" u
  WHERE LOWER(u.email) = LOWER(user_email)
    AND u."isActive" = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete! Username column has been removed and functions have been updated.
DO $$ 
BEGIN
  RAISE NOTICE 'Migration complete! Username column has been removed and functions have been updated.';
END $$;

