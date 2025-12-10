-- ============================================================================
-- Add bio column to Users table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Add bio column to Users table (if it doesn't exist)
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- If your table is named "User" (singular), use this instead:
-- ALTER TABLE "User" 
-- ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('Users', 'User')
  AND column_name = 'bio';


