-- ============================================================================
-- Create Club-Specific Roles System
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- 
-- This creates:
-- 1. ClubRole enum (VISITOR, MEMBER, CLUB_ADMIN) for club-specific roles
-- 2. UserClubRoles junction table to store user roles per club
-- 3. VISITOR is the default (no record needed - absence = visitor)
-- ============================================================================

BEGIN;

-- Step 1: Create ClubRole enum for club-specific roles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubRole') THEN
        CREATE TYPE "ClubRole" AS ENUM ('VISITOR', 'MEMBER', 'CLUB_ADMIN');
        RAISE NOTICE 'ClubRole enum created successfully!';
    ELSE
        RAISE NOTICE 'ClubRole enum already exists.';
    END IF;
END $$;

-- Step 2: Create UserClubRoles junction table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
        CREATE TABLE "UserClubRoles" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "userId" UUID NOT NULL,
            "clubId" UUID NOT NULL,
            "role" "ClubRole" NOT NULL DEFAULT 'VISITOR',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT "UserClubRoles_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "UserClubRoles_userId_clubId_key" UNIQUE ("userId", "clubId")
        );
        
        -- Create indexes for performance
        CREATE INDEX "UserClubRoles_userId_idx" ON "UserClubRoles"("userId");
        CREATE INDEX "UserClubRoles_clubId_idx" ON "UserClubRoles"("clubId");
        CREATE INDEX "UserClubRoles_role_idx" ON "UserClubRoles"("role");
        
        RAISE NOTICE 'UserClubRoles table created successfully!';
    ELSE
        RAISE NOTICE 'UserClubRoles table already exists.';
    END IF;
END $$;

-- Step 3: Add foreign key constraints if Users and Clubs tables exist
DO $$ 
BEGIN
    -- Add foreign key to Users table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
        -- Check if constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'UserClubRoles_userId_fkey'
        ) THEN
            ALTER TABLE "UserClubRoles" 
            ADD CONSTRAINT "UserClubRoles_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE;
            RAISE NOTICE 'Foreign key to Users table added.';
        END IF;
    END IF;
    
    -- Add foreign key to Clubs table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Clubs') THEN
        -- Check if constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'UserClubRoles_clubId_fkey'
        ) THEN
            ALTER TABLE "UserClubRoles" 
            ADD CONSTRAINT "UserClubRoles_clubId_fkey" 
            FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE CASCADE;
            RAISE NOTICE 'Foreign key to Clubs table added.';
        END IF;
    END IF;
END $$;

-- Step 4: Enable Row Level Security
ALTER TABLE "UserClubRoles" ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own club roles" ON "UserClubRoles";
        DROP POLICY IF EXISTS "Authenticated users can view all club roles" ON "UserClubRoles";
        DROP POLICY IF EXISTS "Club admins can manage club roles" ON "UserClubRoles";
        DROP POLICY IF EXISTS "Super admins can manage all club roles" ON "UserClubRoles";
        
        -- Users can view their own club roles
        CREATE POLICY "Users can view their own club roles" ON "UserClubRoles"
            FOR SELECT
            TO authenticated
            USING (auth.uid()::text = "userId"::text);
        
        -- Authenticated users can view all club roles (for now - can be restricted later)
        CREATE POLICY "Authenticated users can view all club roles" ON "UserClubRoles"
            FOR SELECT
            TO authenticated
            USING (true);
        
        -- Club admins can manage roles for their club
        CREATE POLICY "Club admins can manage club roles" ON "UserClubRoles"
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM "UserClubRoles" ucr
                    WHERE ucr."userId"::text = auth.uid()::text
                    AND ucr."clubId" = "UserClubRoles"."clubId"
                    AND ucr."role" = 'CLUB_ADMIN'
                )
            );
        
        -- Super admins can manage all club roles
        CREATE POLICY "Super admins can manage all club roles" ON "UserClubRoles"
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM "Users"
                    WHERE "Users".id::text = auth.uid()::text
                    AND "Users".role = 'SUPER_ADMIN'
                )
            );
        
        RAISE NOTICE 'RLS policies created successfully!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Usage Notes:
-- 
-- 1. DEFAULT BEHAVIOR: If no record exists in UserClubRoles for a user+club,
--    that user is considered a VISITOR at that club.
--
-- 2. TO SET A ROLE: Insert a record into UserClubRoles:
--    INSERT INTO "UserClubRoles" ("userId", "clubId", "role")
--    VALUES ('user-id-here', 'club-id-here', 'MEMBER');
--
-- 3. TO GET USER'S ROLE AT A CLUB:
--    SELECT COALESCE(role, 'VISITOR') 
--    FROM "UserClubRoles" 
--    WHERE "userId" = 'user-id' AND "clubId" = 'club-id';
--
-- 4. TO GET ALL CLUBS FOR A USER WITH ROLES:
--    SELECT c.*, COALESCE(ucr.role, 'VISITOR') as role
--    FROM "Clubs" c
--    LEFT JOIN "UserClubRoles" ucr ON c.id = ucr."clubId" AND ucr."userId" = 'user-id';
-- ============================================================================







