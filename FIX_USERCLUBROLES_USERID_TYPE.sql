-- ============================================================================
-- Fix UserClubRoles userId Column Type
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- 
-- This migration fixes the userId column type from UUID to TEXT to match
-- the Users/User table id column type.
-- ============================================================================

BEGIN;

-- Step 1: Drop foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'UserClubRoles_userId_fkey'
    ) THEN
        ALTER TABLE "UserClubRoles" 
        DROP CONSTRAINT "UserClubRoles_userId_fkey";
        RAISE NOTICE 'Dropped existing foreign key constraint.';
    END IF;
END $$;

-- Step 2: Drop unique constraint if it exists (needed before altering column)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'UserClubRoles_userId_clubId_key'
    ) THEN
        ALTER TABLE "UserClubRoles" 
        DROP CONSTRAINT "UserClubRoles_userId_clubId_key";
        RAISE NOTICE 'Dropped unique constraint temporarily.';
    END IF;
END $$;

-- Step 3: Alter userId column type from UUID to TEXT
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
        -- Check current column type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'UserClubRoles' 
            AND column_name = 'userId' 
            AND data_type = 'uuid'
        ) THEN
            -- Convert UUID to TEXT
            ALTER TABLE "UserClubRoles" 
            ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
            RAISE NOTICE 'Changed userId column from UUID to TEXT.';
        ELSE
            RAISE NOTICE 'userId column is already TEXT or does not exist.';
        END IF;
    ELSE
        RAISE NOTICE 'UserClubRoles table does not exist.';
    END IF;
END $$;

-- Step 4: Recreate unique constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'UserClubRoles_userId_clubId_key'
        ) THEN
            ALTER TABLE "UserClubRoles" 
            ADD CONSTRAINT "UserClubRoles_userId_clubId_key" 
            UNIQUE ("userId", "clubId");
            RAISE NOTICE 'Recreated unique constraint.';
        END IF;
    END IF;
END $$;

-- Step 5: Recreate foreign key constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
        -- Try Users table (plural) first
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'UserClubRoles_userId_fkey'
            ) THEN
                ALTER TABLE "UserClubRoles" 
                ADD CONSTRAINT "UserClubRoles_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
                RAISE NOTICE 'Recreated foreign key to Users table.';
            END IF;
        -- Try User table (singular) if Users doesn't exist
        ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'UserClubRoles_userId_fkey'
            ) THEN
                ALTER TABLE "UserClubRoles" 
                ADD CONSTRAINT "UserClubRoles_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
                RAISE NOTICE 'Recreated foreign key to User table.';
            END IF;
        ELSE
            RAISE NOTICE 'Neither Users nor User table found. Foreign key not created.';
        END IF;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- Run this to verify the column types:
-- ============================================================================
-- SELECT 
--     column_name, 
--     data_type, 
--     character_maximum_length
-- FROM information_schema.columns 
-- WHERE table_name = 'UserClubRoles' 
-- AND column_name IN ('id', 'userId', 'clubId')
-- ORDER BY column_name;
-- 
-- Expected output:
-- clubId | uuid | null
-- id     | uuid | null
-- userId | text | null
-- ============================================================================

