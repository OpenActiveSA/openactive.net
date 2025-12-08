-- ============================================================================
-- Create Dummy Users for Each Role Type
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- 
-- This script creates:
-- 1. One SUPER_ADMIN user (global role)
-- 2. Multiple regular users with different club-specific roles
-- 3. Sample clubs for testing
-- 4. Club role assignments in UserClubRoles table
-- ============================================================================

BEGIN;

-- Step 1: Determine which users table exists and get its structure
DO $$ 
DECLARE
    users_table_name TEXT;
    has_firstname BOOLEAN := false;
    has_displayname BOOLEAN := false;
    has_username BOOLEAN := false;
BEGIN
    -- Check which table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
        users_table_name := 'Users';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        users_table_name := 'User';
    ELSE
        RAISE EXCEPTION 'Neither Users nor User table found. Please create the users table first.';
    END IF;
    
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = users_table_name AND column_name = 'Firstname'
    ) INTO has_firstname;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = users_table_name AND column_name = 'displayName'
    ) INTO has_displayname;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = users_table_name AND column_name = 'username'
    ) INTO has_username;
    
    RAISE NOTICE 'Using table: %, Firstname: %, displayName: %, username: %', 
        users_table_name, has_firstname, has_displayname, has_username;
END $$;

-- Step 2: Create sample clubs if they don't exist
DO $$ 
BEGIN
    -- Create Club 1: Tennis Club
    IF NOT EXISTS (SELECT 1 FROM "Clubs" WHERE "name" = 'Tennis Club Alpha') THEN
        INSERT INTO "Clubs" ("name", "numberOfCourts", "country", "province", "is_active")
        VALUES ('Tennis Club Alpha', 4, 'United States', 'California', true);
        RAISE NOTICE 'Created club: Tennis Club Alpha';
    END IF;
    
    -- Create Club 2: Badminton Club
    IF NOT EXISTS (SELECT 1 FROM "Clubs" WHERE "name" = 'Badminton Club Beta') THEN
        INSERT INTO "Clubs" ("name", "numberOfCourts", "country", "province", "is_active")
        VALUES ('Badminton Club Beta', 6, 'United States', 'New York', true);
        RAISE NOTICE 'Created club: Badminton Club Beta';
    END IF;
    
    -- Create Club 3: Squash Club
    IF NOT EXISTS (SELECT 1 FROM "Clubs" WHERE "name" = 'Squash Club Gamma') THEN
        INSERT INTO "Clubs" ("name", "numberOfCourts", "country", "province", "is_active")
        VALUES ('Squash Club Gamma', 3, 'United States', 'Texas', true);
        RAISE NOTICE 'Created club: Squash Club Gamma';
    END IF;
END $$;

-- Step 3: Create dummy users with different roles
DO $$ 
DECLARE
    users_table_name TEXT;
    has_firstname BOOLEAN;
    has_displayname BOOLEAN;
    has_username BOOLEAN;
    super_admin_id TEXT;
    club_admin_id TEXT;
    member1_id TEXT;
    member2_id TEXT;
    coach1_id TEXT;
    coach2_id TEXT;
    visitor_id TEXT;
    club1_id UUID;
    club2_id UUID;
    club3_id UUID;
    insert_sql TEXT;
BEGIN
    -- Determine table name and structure
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
        users_table_name := 'Users';
    ELSE
        users_table_name := 'User';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = users_table_name AND column_name = 'Firstname'
    ) INTO has_firstname;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = users_table_name AND column_name = 'displayName'
    ) INTO has_displayname;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = users_table_name AND column_name = 'username'
    ) INTO has_username;
    
    -- Get club IDs
    SELECT "id" INTO club1_id FROM "Clubs" WHERE "name" = 'Tennis Club Alpha' LIMIT 1;
    SELECT "id" INTO club2_id FROM "Clubs" WHERE "name" = 'Badminton Club Beta' LIMIT 1;
    SELECT "id" INTO club3_id FROM "Clubs" WHERE "name" = 'Squash Club Gamma' LIMIT 1;
    
    -- Generate user IDs (using simple text IDs for demo)
    super_admin_id := 'super-admin-' || gen_random_uuid()::text;
    club_admin_id := 'club-admin-' || gen_random_uuid()::text;
    member1_id := 'member-1-' || gen_random_uuid()::text;
    member2_id := 'member-2-' || gen_random_uuid()::text;
    coach1_id := 'coach-1-' || gen_random_uuid()::text;
    coach2_id := 'coach-2-' || gen_random_uuid()::text;
    visitor_id := 'visitor-1-' || gen_random_uuid()::text;
    
    -- 1. SUPER_ADMIN (Global role - can manage all clubs)
    IF has_firstname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, super_admin_id, 'superadmin@example.com', 'Super', 'Admin', 'SUPER_ADMIN', true
        );
        EXECUTE insert_sql;
    ELSIF has_displayname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, super_admin_id, 'superadmin@example.com', 'Super Admin', 'superadmin', 'SUPER_ADMIN', true
        );
        EXECUTE insert_sql;
    ELSE
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, super_admin_id, 'superadmin@example.com', 'SUPER_ADMIN', true
        );
        EXECUTE insert_sql;
    END IF;
    RAISE NOTICE 'Created SUPER_ADMIN user: %', super_admin_id;
    
    -- 2. CLUB_ADMIN (Club-specific role - will be assigned via UserClubRoles)
    IF has_firstname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, club_admin_id, 'clubadmin@example.com', 'Club', 'Administrator', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSIF has_displayname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, club_admin_id, 'clubadmin@example.com', 'Club Administrator', 'clubadmin', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSE
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, club_admin_id, 'clubadmin@example.com', 'MEMBER', true
        );
        EXECUTE insert_sql;
    END IF;
    RAISE NOTICE 'Created CLUB_ADMIN user: %', club_admin_id;
    
    -- 3. MEMBER users
    IF has_firstname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, member1_id, 'member1@example.com', 'John', 'Member', 'MEMBER', true
        );
        EXECUTE insert_sql;
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, member2_id, 'member2@example.com', 'Jane', 'Member', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSIF has_displayname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, member1_id, 'member1@example.com', 'John Member', 'member1', 'MEMBER', true
        );
        EXECUTE insert_sql;
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, member2_id, 'member2@example.com', 'Jane Member', 'member2', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSE
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, member1_id, 'member1@example.com', 'MEMBER', true
        );
        EXECUTE insert_sql;
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, member2_id, 'member2@example.com', 'MEMBER', true
        );
        EXECUTE insert_sql;
    END IF;
    RAISE NOTICE 'Created MEMBER users: %, %', member1_id, member2_id;
    
    -- 4. COACH users
    IF has_firstname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, coach1_id, 'coach1@example.com', 'Mike', 'Coach', 'MEMBER', true
        );
        EXECUTE insert_sql;
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, coach2_id, 'coach2@example.com', 'Sarah', 'Coach', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSIF has_displayname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, coach1_id, 'coach1@example.com', 'Mike Coach', 'coach1', 'MEMBER', true
        );
        EXECUTE insert_sql;
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, coach2_id, 'coach2@example.com', 'Sarah Coach', 'coach2', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSE
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, coach1_id, 'coach1@example.com', 'MEMBER', true
        );
        EXECUTE insert_sql;
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, coach2_id, 'coach2@example.com', 'MEMBER', true
        );
        EXECUTE insert_sql;
    END IF;
    RAISE NOTICE 'Created COACH users: %, %', coach1_id, coach2_id;
    
    -- 5. VISITOR user (no explicit role record needed - default role)
    IF has_firstname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "Firstname", "Surname", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, visitor_id, 'visitor@example.com', 'Tom', 'Visitor', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSIF has_displayname THEN
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "displayName", "username", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, visitor_id, 'visitor@example.com', 'Tom Visitor', 'visitor', 'MEMBER', true
        );
        EXECUTE insert_sql;
    ELSE
        insert_sql := format(
            'INSERT INTO %I ("id", "email", "role", "isActive", "createdAt", "updatedAt")
             VALUES (%L, %L, %L, %L, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING',
            users_table_name, visitor_id, 'visitor@example.com', 'MEMBER', true
        );
        EXECUTE insert_sql;
    END IF;
    RAISE NOTICE 'Created VISITOR user: %', visitor_id;
    
    -- Step 4: Assign club-specific roles via UserClubRoles table
    -- (Only if UserClubRoles table exists)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserClubRoles') THEN
        -- Club Admin at Club 1
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (club_admin_id, club1_id, 'CLUB_ADMIN', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'CLUB_ADMIN', "updatedAt" = NOW();
        
        -- Member 1 at Club 1 and Club 2
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (member1_id, club1_id, 'MEMBER', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'MEMBER', "updatedAt" = NOW();
        
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (member1_id, club2_id, 'MEMBER', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'MEMBER', "updatedAt" = NOW();
        
        -- Member 2 at Club 2
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (member2_id, club2_id, 'MEMBER', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'MEMBER', "updatedAt" = NOW();
        
        -- Coach 1 at Club 1
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (coach1_id, club1_id, 'COACH', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'COACH', "updatedAt" = NOW();
        
        -- Coach 2 at Club 2 and Club 3
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (coach2_id, club2_id, 'COACH', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'COACH', "updatedAt" = NOW();
        
        INSERT INTO "UserClubRoles" ("userId", "clubId", "role", "createdAt", "updatedAt")
        VALUES (coach2_id, club3_id, 'COACH', NOW(), NOW())
        ON CONFLICT ("userId", "clubId") DO UPDATE SET "role" = 'COACH', "updatedAt" = NOW();
        
        -- Visitor has no records (default role at all clubs)
        -- No insert needed - absence = VISITOR
        
        RAISE NOTICE 'Assigned club roles to users';
    ELSE
        RAISE NOTICE 'UserClubRoles table does not exist. Skipping club role assignments.';
    END IF;
    
    RAISE NOTICE 'Dummy users created successfully!';
    RAISE NOTICE 'User IDs:';
    RAISE NOTICE '  SUPER_ADMIN: %', super_admin_id;
    RAISE NOTICE '  CLUB_ADMIN: %', club_admin_id;
    RAISE NOTICE '  MEMBER 1: %', member1_id;
    RAISE NOTICE '  MEMBER 2: %', member2_id;
    RAISE NOTICE '  COACH 1: %', coach1_id;
    RAISE NOTICE '  COACH 2: %', coach2_id;
    RAISE NOTICE '  VISITOR: %', visitor_id;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- Run these to verify the dummy users were created:
-- ============================================================================

-- View all users with their global roles
-- SELECT "id", "email", "Firstname", "Surname", "role" 
-- FROM "Users" 
-- WHERE "email" LIKE '%@example.com'
-- ORDER BY "role", "email";

-- View all club role assignments
-- SELECT 
--     u."email",
--     u."Firstname" || ' ' || u."Surname" as name,
--     c."name" as club_name,
--     ucr."role" as club_role
-- FROM "UserClubRoles" ucr
-- JOIN "Users" u ON u."id" = ucr."userId"
-- JOIN "Clubs" c ON c."id" = ucr."clubId"
-- ORDER BY u."email", c."name";

-- View users by club with their roles (including VISITORS)
-- SELECT 
--     c."name" as club_name,
--     u."email",
--     u."Firstname" || ' ' || u."Surname" as name,
--     COALESCE(ucr."role", 'VISITOR') as role
-- FROM "Clubs" c
-- CROSS JOIN "Users" u
-- LEFT JOIN "UserClubRoles" ucr ON ucr."clubId" = c."id" AND ucr."userId" = u."id"
-- WHERE u."email" LIKE '%@example.com'
-- ORDER BY c."name", COALESCE(ucr."role", 'VISITOR"), u."email";
-- ============================================================================

