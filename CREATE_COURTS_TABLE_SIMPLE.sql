-- ============================================================================
-- Create Courts Table - SIMPLIFIED VERSION
-- Run this if the full migration keeps failing
-- This version is more defensive and handles errors better
-- ============================================================================

-- Step 1: Create SportType enum (if it doesn't exist)
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating SportType enum: %', SQLERRM;
END $$;

-- Step 2: Create Courts table (if it doesn't exist)
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
        
        -- Create indexes
        CREATE INDEX "Courts_clubId_idx" ON "Courts"("clubId");
        CREATE INDEX "Courts_sportType_idx" ON "Courts"("sportType");
        CREATE INDEX "Courts_isActive_idx" ON "Courts"("isActive");
        CREATE INDEX "Courts_clubId_sportType_idx" ON "Courts"("clubId", "sportType");
        
        RAISE NOTICE 'Courts table created successfully!';
    ELSE
        RAISE NOTICE 'Courts table already exists.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating Courts table: %', SQLERRM;
END $$;

-- Step 3: Enable RLS (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        ALTER TABLE "Courts" ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on Courts table.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error enabling RLS: %', SQLERRM;
END $$;

-- Step 4: Create basic RLS policies (only if table exists)
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
        
        -- Check if helper functions exist (from FIX_USERCLUBROLES_RLS_RECURSION.sql)
        -- If they exist, use them; otherwise create basic policies
        
        IF EXISTS (SELECT FROM pg_proc WHERE proname = 'is_club_admin_for_club' AND pronamespace = 'public'::regnamespace) THEN
            -- Use helper functions (preferred - no recursion)
            CREATE POLICY "Club admins can manage club courts" ON "Courts"
                FOR ALL
                TO authenticated
                USING (is_club_admin_for_club("clubId"))
                WITH CHECK (is_club_admin_for_club("clubId"));
            
            IF EXISTS (SELECT FROM pg_proc WHERE proname = 'is_super_admin' AND pronamespace = 'public'::regnamespace) THEN
                CREATE POLICY "Super admins can manage all courts" ON "Courts"
                    FOR ALL
                    TO authenticated
                    USING (is_super_admin())
                    WITH CHECK (is_super_admin());
            END IF;
        ELSE
            -- Fallback: Create basic policies without helper functions
            -- Super admins can manage all courts (check both Users and User tables)
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
                END IF;
            END;
        END IF;
        
        RAISE NOTICE 'RLS policies created for Courts table.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating RLS policies: %', SQLERRM;
END $$;

-- Step 5: Create trigger function for updatedAt
CREATE OR REPLACE FUNCTION update_courts_updated_at()
RETURNS TRIGGER AS $function$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Step 6: Create trigger (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        DROP TRIGGER IF EXISTS "update_courts_updated_at" ON "Courts";
        CREATE TRIGGER "update_courts_updated_at"
            BEFORE UPDATE ON "Courts"
            FOR EACH ROW
            EXECUTE FUNCTION update_courts_updated_at();
        RAISE NOTICE 'UpdatedAt trigger created for Courts table.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating trigger: %', SQLERRM;
END $$;

-- Verification
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') 
        THEN '✅ Courts table exists'
        ELSE '❌ Courts table does NOT exist'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SportType') 
        THEN '✅ SportType enum exists'
        ELSE '❌ SportType enum does NOT exist'
    END as enum_status;

