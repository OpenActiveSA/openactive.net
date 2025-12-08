-- ============================================================================
-- Fix Courts RLS Policies to Allow Inserts
-- Run this if you can't create courts even though the table exists
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can view active courts" ON "Courts";
DROP POLICY IF EXISTS "Authenticated users can view all courts" ON "Courts";
DROP POLICY IF EXISTS "Club admins can manage club courts" ON "Courts";
DROP POLICY IF EXISTS "Super admins can manage all courts" ON "Courts";
DROP POLICY IF EXISTS "Super admins can insert courts" ON "Courts";
DROP POLICY IF EXISTS "Super admins can update courts" ON "Courts";
DROP POLICY IF EXISTS "Super admins can delete courts" ON "Courts";

-- Recreate policies with proper permissions
DO $$ 
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
    
    -- Super admins can do everything (SELECT, INSERT, UPDATE, DELETE)
    IF users_table_name IS NOT NULL THEN
        -- Build the policy SQL with proper escaping
        -- Using format with 6 placeholders: 4 for table name (%I), 2 for role string (%L)
        policy_sql := format(
            'CREATE POLICY "Super admins can manage all courts" ON "Courts"
                FOR ALL
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM %1$I
                        WHERE %1$I.id::text = auth.uid()::text
                        AND %1$I.role = %2$L
                    )
                )
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM %1$I
                        WHERE %1$I.id::text = auth.uid()::text
                        AND %1$I.role = %2$L
                    )
                )',
            users_table_name, 'SUPER_ADMIN'
        );
        EXECUTE policy_sql;
        RAISE NOTICE 'Super admin policy created for Courts using % table.', users_table_name;
    END IF;
    
    -- Club admins can manage courts for their clubs (if UserClubRoles table exists)
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
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "UserClubRoles" ucr
                    WHERE ucr."userId"::text = auth.uid()::text
                    AND ucr."clubId" = "Courts"."clubId"
                    AND ucr."role" = 'CLUB_ADMIN'
                )
            );
        RAISE NOTICE 'Club admin policy created for Courts.';
    END IF;
    
    RAISE NOTICE 'RLS policies updated successfully!';
END $$;

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'Courts'
ORDER BY policyname;

