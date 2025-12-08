-- ============================================================================
-- Create Courts Table - STEP BY STEP (Run each section separately if needed)
-- This version breaks down the migration into smaller, testable steps
-- ============================================================================

-- ============================================================================
-- STEP 1: Create SportType Enum
-- ============================================================================
-- Run this first and check for success
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
        RAISE NOTICE '✅ SportType enum created successfully!';
    ELSE
        RAISE NOTICE 'ℹ️ SportType enum already exists.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error creating SportType enum: %', SQLERRM;
END $$;

-- Verify enum was created
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SportType') 
        THEN '✅ SportType enum EXISTS'
        ELSE '❌ SportType enum DOES NOT EXIST'
    END as enum_status;

-- ============================================================================
-- STEP 2: Create Courts Table
-- ============================================================================
-- Run this second and check for success
DO $$ 
BEGIN
    -- Check if Clubs table exists first
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Clubs') THEN
        RAISE EXCEPTION '❌ Clubs table does not exist! Please create the Clubs table first.';
    END IF;

    -- Create Courts table if it doesn't exist
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
        
        RAISE NOTICE '✅ Courts table created successfully!';
    ELSE
        RAISE NOTICE 'ℹ️ Courts table already exists.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error creating Courts table: %', SQLERRM;
END $$;

-- Create indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        CREATE INDEX IF NOT EXISTS "Courts_clubId_idx" ON "Courts"("clubId");
        CREATE INDEX IF NOT EXISTS "Courts_sportType_idx" ON "Courts"("sportType");
        CREATE INDEX IF NOT EXISTS "Courts_isActive_idx" ON "Courts"("isActive");
        CREATE INDEX IF NOT EXISTS "Courts_clubId_sportType_idx" ON "Courts"("clubId", "sportType");
        RAISE NOTICE '✅ Indexes created successfully!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error creating indexes: %', SQLERRM;
END $$;

-- Verify table was created
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') 
        THEN '✅ Courts table EXISTS'
        ELSE '❌ Courts table DOES NOT EXIST'
    END as table_status;

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        ALTER TABLE "Courts" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on Courts table.';
    ELSE
        RAISE NOTICE '⚠️ Courts table does not exist. Skipping RLS enablement.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error enabling RLS: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Public can view active courts" ON "Courts";
        DROP POLICY IF EXISTS "Authenticated users can view all courts" ON "Courts";
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
        
        -- Super admins can manage all courts
        DECLARE
            users_table_name TEXT;
            policy_sql TEXT;
        BEGIN
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
                users_table_name := 'Users';
            ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
                users_table_name := 'User';
            ELSE
                users_table_name := NULL;
            END IF;
            
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
                RAISE NOTICE '✅ Super admin policy created.';
            ELSE
                RAISE NOTICE '⚠️ Users table not found. Skipping super admin policy.';
            END IF;
        END;
        
        RAISE NOTICE '✅ RLS policies created successfully!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error creating RLS policies: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 5: Create Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_courts_updated_at()
RETURNS TRIGGER AS $function$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Create Trigger
-- ============================================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        DROP TRIGGER IF EXISTS "update_courts_updated_at" ON "Courts";
        CREATE TRIGGER "update_courts_updated_at"
            BEFORE UPDATE ON "Courts"
            FOR EACH ROW
            EXECUTE FUNCTION update_courts_updated_at();
        RAISE NOTICE '✅ Trigger created successfully!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error creating trigger: %', SQLERRM;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
SELECT 
    'Courts Table Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') 
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as status
UNION ALL
SELECT 
    'SportType Enum Status',
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SportType') 
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END
UNION ALL
SELECT 
    'RLS Enabled',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE t.schemaname = 'public' 
            AND t.tablename = 'Courts'
            AND c.relrowsecurity = true
        )
        THEN '✅ ENABLED'
        ELSE '❌ NOT ENABLED'
    END;

