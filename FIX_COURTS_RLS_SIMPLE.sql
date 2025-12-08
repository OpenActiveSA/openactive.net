-- ============================================================================
-- Fix Courts RLS Policies - SIMPLE VERSION
-- This version avoids dynamic SQL and should work more reliably
-- ============================================================================

-- Drop all existing policies
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

-- Super admins can manage all courts (try Users table first)
DO $$ 
BEGIN
    -- Try Users table (plural)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Users') THEN
        CREATE POLICY "Super admins can manage all courts" ON "Courts"
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM "Users"
                    WHERE "Users".id::text = auth.uid()::text
                    AND "Users".role = 'SUPER_ADMIN'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "Users"
                    WHERE "Users".id::text = auth.uid()::text
                    AND "Users".role = 'SUPER_ADMIN'
                )
            );
        RAISE NOTICE 'Super admin policy created using Users table.';
    -- Try User table (singular)
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        CREATE POLICY "Super admins can manage all courts" ON "Courts"
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM "User"
                    WHERE "User".id::text = auth.uid()::text
                    AND "User".role = 'SUPER_ADMIN'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "User"
                    WHERE "User".id::text = auth.uid()::text
                    AND "User".role = 'SUPER_ADMIN'
                )
            );
        RAISE NOTICE 'Super admin policy created using User table.';
    ELSE
        RAISE NOTICE 'Neither Users nor User table found. Super admin policy not created.';
    END IF;
END $$;

-- Club admins can manage courts for their clubs (if UserClubRoles table exists)
DO $$ 
BEGIN
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
        RAISE NOTICE 'Club admin policy created.';
    ELSE
        RAISE NOTICE 'UserClubRoles table not found. Club admin policy not created.';
    END IF;
END $$;

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'Courts'
ORDER BY policyname;

