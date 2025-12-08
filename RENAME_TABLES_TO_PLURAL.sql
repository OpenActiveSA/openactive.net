-- ============================================================================
-- Rename Tables to Plural Forms
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This renames "User" to "Users" and "Club" to "Clubs"
-- ============================================================================

BEGIN;

-- Rename User table to Users
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        -- Rename the table
        ALTER TABLE "User" RENAME TO "Users";
        
        -- Rename indexes
        ALTER INDEX IF EXISTS "User_pkey" RENAME TO "Users_pkey";
        ALTER INDEX IF EXISTS "User_email_key" RENAME TO "Users_email_key";
        ALTER INDEX IF EXISTS "User_clubId_idx" RENAME TO "Users_clubId_idx";
        
        -- Drop old policies (they will need to be recreated for the new table name)
        DROP POLICY IF EXISTS "Users can view their own data" ON "Users";
        DROP POLICY IF EXISTS "Authenticated users can view all users" ON "Users";
        DROP POLICY IF EXISTS "Public can view users" ON "Users";
        
        -- Recreate policies with correct table name
        CREATE POLICY "Users can view their own data" ON "Users"
            FOR SELECT
            USING (auth.uid()::text = id);
        
        CREATE POLICY "Authenticated users can view all users" ON "Users"
            FOR SELECT
            TO authenticated
            USING (true);
        
        CREATE POLICY "Public can view users" ON "Users"
            FOR SELECT
            TO anon
            USING (true);
        
        RAISE NOTICE 'User table renamed to Users successfully!';
    ELSE
        RAISE NOTICE 'User table does not exist.';
    END IF;
END $$;

-- Rename Club table to Clubs
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Club') THEN
        -- Rename the table
        ALTER TABLE "Club" RENAME TO "Clubs";
        
        -- Rename indexes
        ALTER INDEX IF EXISTS "Club_pkey" RENAME TO "Clubs_pkey";
        ALTER INDEX IF EXISTS "Club_name_idx" RENAME TO "Clubs_name_idx";
        ALTER INDEX IF EXISTS "Club_is_active_idx" RENAME TO "Clubs_is_active_idx";
        
        -- Drop old policies (they will need to be recreated for the new table name)
        DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
        DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
        DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";
        
        -- Recreate policies with correct table name
        CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
            FOR SELECT
            TO authenticated
            USING (true);
        
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
        
        CREATE POLICY "Public can view clubs" ON "Clubs"
            FOR SELECT
            TO anon
            USING (true);
        
        RAISE NOTICE 'Club table renamed to Clubs successfully!';
    ELSE
        RAISE NOTICE 'Club table does not exist.';
    END IF;
END $$;

COMMIT;








