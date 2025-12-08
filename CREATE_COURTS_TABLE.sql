-- ============================================================================
-- Create Courts Table with Sport Types
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- 
-- This creates:
-- 1. SportType enum with all supported sports
-- 2. Courts table with name and sport type
-- 3. Migration to update Bookings table to use courtId
-- ============================================================================

BEGIN;

-- Step 1: Create SportType enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SportType') THEN
        CREATE TYPE "SportType" AS ENUM (
            'TENNIS',
            'PICKLEBALL',
            'PADEL',
            'TABLE_TENNIS',
            'SQUASH',
            'BADMINTON',
            'BEACH_TENNIS',
            'RACQUETBALL',
            'REAL_TENNIS'
        );
        RAISE NOTICE 'SportType enum created successfully!';
    ELSE
        RAISE NOTICE 'SportType enum already exists.';
    END IF;
END $$;

-- Step 2: Create Courts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        CREATE TABLE "Courts" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
            "name" TEXT NOT NULL,
            "sportType" "SportType" NOT NULL DEFAULT 'TENNIS',
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT "Courts_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "Courts_clubId_name_key" UNIQUE ("clubId", "name")
        );
        
        -- Create indexes for performance
        CREATE INDEX "Courts_clubId_idx" ON "Courts"("clubId");
        CREATE INDEX "Courts_sportType_idx" ON "Courts"("sportType");
        CREATE INDEX "Courts_isActive_idx" ON "Courts"("isActive");
        CREATE INDEX "Courts_clubId_sportType_idx" ON "Courts"("clubId", "sportType");
        
        RAISE NOTICE 'Courts table created successfully!';
    ELSE
        RAISE NOTICE 'Courts table already exists.';
    END IF;
END $$;

-- Step 3: Add courtId column to Bookings table (if it doesn't exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Bookings') THEN
        -- Add courtId column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Bookings' AND column_name = 'courtId'
        ) THEN
            ALTER TABLE "Bookings" 
            ADD COLUMN "courtId" UUID REFERENCES "Courts"("id") ON DELETE SET NULL;
            
            -- Create index for courtId
            CREATE INDEX IF NOT EXISTS "Bookings_courtId_idx" ON "Bookings"("courtId");
            
            RAISE NOTICE 'courtId column added to Bookings table.';
        ELSE
            RAISE NOTICE 'courtId column already exists in Bookings table.';
        END IF;
    ELSE
        RAISE NOTICE 'Bookings table does not exist. Skipping courtId column addition.';
    END IF;
END $$;

-- Step 4: Create trigger to update updatedAt timestamp
-- Create function first (outside DO block to avoid delimiter conflicts)
CREATE OR REPLACE FUNCTION update_courts_updated_at()
RETURNS TRIGGER AS $function$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Create trigger in DO block
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        -- Create trigger
        DROP TRIGGER IF EXISTS "update_courts_updated_at" ON "Courts";
        CREATE TRIGGER "update_courts_updated_at"
            BEFORE UPDATE ON "Courts"
            FOR EACH ROW
            EXECUTE FUNCTION update_courts_updated_at();
        
        RAISE NOTICE 'UpdatedAt trigger created for Courts table.';
    END IF;
END $$;

-- Step 5: Enable Row Level Security and Create RLS Policies for Courts
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        -- Enable Row Level Security
        ALTER TABLE "Courts" ENABLE ROW LEVEL SECURITY;
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Public can view active courts" ON "Courts";
        DROP POLICY IF EXISTS "Authenticated users can view all courts" ON "Courts";
        DROP POLICY IF EXISTS "Club admins can manage club courts" ON "Courts";
        DROP POLICY IF EXISTS "Super admins can manage all courts" ON "Courts";
        
        -- Public can view active courts
        CREATE POLICY "Public can view active courts" ON "Courts"
            FOR SELECT
            TO anon
            USING ("isActive" = true);
        
        -- Authenticated users can view all courts
        CREATE POLICY "Authenticated users can view all courts" ON "Courts"
            FOR SELECT
            TO authenticated
            USING (true);
        
        -- Club admins can manage courts for their clubs (only if UserClubRoles table exists)
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
            CREATE POLICY "Club admins can manage club courts" ON "Courts"
                FOR ALL
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM "UserClubRoles" ucr
                        WHERE ucr."userId"::text = auth.uid()::text
                        AND ucr."clubId" = "Courts"."clubId"
                        AND ucr."role" = 'CLUB_ADMIN'
                    )
                );
        END IF;
        
        -- Super admins can manage all courts
        DECLARE
            users_table_name TEXT;
            policy_sql TEXT;
        BEGIN
            -- Determine which users table exists
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
                users_table_name := 'Users';
            ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
                users_table_name := 'User';
            ELSE
                users_table_name := NULL;
            END IF;
            
            -- Create policy only if users table exists
            IF users_table_name IS NOT NULL THEN
                policy_sql := format(
                    'CREATE POLICY "Super admins can manage all courts" ON "Courts"
                        FOR ALL
                        TO authenticated
                        USING (
                            EXISTS (
                                SELECT 1 FROM %I
                                WHERE %I.id::text = auth.uid()::text
                                AND %I.role = ''SUPER_ADMIN''
                            )
                        )',
                    users_table_name, users_table_name, users_table_name
                );
                EXECUTE policy_sql;
                RAISE NOTICE 'Super admin policy created for Courts using % table.', users_table_name;
            END IF;
        END;
        
        RAISE NOTICE 'RLS policies created for Courts table.';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Migration Helper: Migrate existing courtNumber to courtId
-- Run this AFTER creating courts for each club
-- ============================================================================
-- 
-- This script helps migrate existing bookings from courtNumber to courtId.
-- You'll need to create courts first, then run this migration.
--
-- Example: If you have a club with 4 courts, create 4 court records:
-- INSERT INTO "Courts" ("clubId", "name", "sportType") VALUES
--   ('club-id-here', 'Court 1', 'TENNIS'),
--   ('club-id-here', 'Court 2', 'TENNIS'),
--   ('club-id-here', 'Court 3', 'TENNIS'),
--   ('club-id-here', 'Court 4', 'TENNIS');
--
-- Then update bookings:
-- UPDATE "Bookings" b
-- SET "courtId" = c.id
-- FROM "Courts" c
-- WHERE b."clubId" = c."clubId"
--   AND b."courtNumber" = CAST(SUBSTRING(c.name FROM '(\d+)') AS INTEGER)
--   AND b."courtId" IS NULL;
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- 
-- View all courts:
-- SELECT c.*, cl.name as club_name 
-- FROM "Courts" c
-- JOIN "Clubs" cl ON c."clubId" = cl.id
-- ORDER BY cl.name, c.name;
--
-- View courts by sport type:
-- SELECT "sportType", COUNT(*) as count
-- FROM "Courts"
-- GROUP BY "sportType"
-- ORDER BY count DESC;
--
-- View courts for a specific club:
-- SELECT * FROM "Courts"
-- WHERE "clubId" = 'club-id-here'
-- ORDER BY name;
-- ============================================================================

