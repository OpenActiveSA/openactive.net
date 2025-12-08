-- ============================================================================
-- Add CLUB_ADMIN Policy for Courts
-- This allows club admins to manage courts for their clubs
-- ============================================================================

BEGIN;

-- Check if helper function exists (from FIX_USERCLUBROLES_RLS_RECURSION.sql)
-- If it doesn't exist, create it first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'is_club_admin_for_club' AND pronamespace = 'public'::regnamespace) THEN
        -- Create helper function to check if user is CLUB_ADMIN for a club
        CREATE OR REPLACE FUNCTION is_club_admin_for_club(check_club_id UUID)
        RETURNS BOOLEAN AS $$
        DECLARE
            user_role TEXT;
        BEGIN
            -- Check UserClubRoles directly (bypasses RLS due to SECURITY DEFINER)
            SELECT ucr."role" INTO user_role
            FROM "UserClubRoles" ucr
            WHERE ucr."userId"::text = auth.uid()::text
            AND ucr."clubId" = check_club_id
            AND ucr."role" = 'CLUB_ADMIN'
            LIMIT 1;
            
            RETURN user_role = 'CLUB_ADMIN';
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
        
        RAISE NOTICE 'Created is_club_admin_for_club helper function.';
    ELSE
        RAISE NOTICE 'is_club_admin_for_club helper function already exists.';
    END IF;
END $$;

-- Add CLUB_ADMIN policy for Courts if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Courts') THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Club admins can manage club courts" ON "Courts";
        
        -- Create CLUB_ADMIN policy using helper function
        CREATE POLICY "Club admins can manage club courts" ON "Courts"
            FOR ALL
            TO authenticated
            USING (is_club_admin_for_club("clubId"))
            WITH CHECK (is_club_admin_for_club("clubId"));
        
        RAISE NOTICE 'CLUB_ADMIN policy created for Courts table.';
    ELSE
        RAISE NOTICE 'Courts table does not exist. Please run CREATE_COURTS_TABLE_SIMPLE.sql first.';
    END IF;
END $$;

COMMIT;

-- Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'Courts'
ORDER BY policyname;

