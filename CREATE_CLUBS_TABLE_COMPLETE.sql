-- ============================================================================
-- Complete Clubs Table Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Step 1: Rename Club (singular) to Clubs (plural) if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Club') THEN
        -- Rename the table
        ALTER TABLE "Club" RENAME TO "Clubs";
        
        -- Rename indexes
        ALTER INDEX IF EXISTS "Club_pkey" RENAME TO "Clubs_pkey";
        ALTER INDEX IF EXISTS "Club_name_idx" RENAME TO "Clubs_name_idx";
        ALTER INDEX IF EXISTS "Club_is_active_idx" RENAME TO "Clubs_is_active_idx";
        
        RAISE NOTICE 'Club table renamed to Clubs successfully!';
    END IF;
END $$;

-- Step 2: Create Clubs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Clubs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "numberOfCourts" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Clubs_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add country column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "country" TEXT;
        RAISE NOTICE 'Country column added successfully!';
    END IF;
END $$;

-- Step 4: Add province column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'province'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "province" TEXT;
        RAISE NOTICE 'Province column added successfully!';
    END IF;
END $$;

-- Step 5: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Clubs_name_idx" ON "Clubs"("name");
CREATE INDEX IF NOT EXISTS "Clubs_is_active_idx" ON "Clubs"("is_active");

-- Step 6: Enable Row Level Security
ALTER TABLE "Clubs" ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";

-- Step 8: Create RLS Policies
-- Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow SUPER_ADMIN to insert, update, and delete clubs
-- Note: This checks the Users table (assuming it's been renamed from User)
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "Users"
            WHERE "Users".id = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
    );

-- If Users table doesn't exist, try User table (singular)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
        -- Drop the policy we just created
        DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
        
        -- Create policy using User table (singular)
        CREATE POLICY "Super admins can manage clubs" ON "Clubs"
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM "User"
                    WHERE "User".id = auth.uid()::text
                    AND "User".role = 'SUPER_ADMIN'
                )
            );
    END IF;
END $$;

-- Allow public read access (for now, can be restricted later)
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Clubs'
ORDER BY ordinal_position;

