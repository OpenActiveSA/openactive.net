-- ============================================================================
-- Add Timezone Column to Clubs Table
--
-- This script adds the "timezone" column to the "Clubs" table.
-- This column stores the IANA timezone identifier (e.g., "America/New_York", 
-- "Europe/London", "Africa/Johannesburg") for the club's location.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Add "timezone" column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'Clubs'
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE "Clubs"
        ADD COLUMN "timezone" TEXT;

        RAISE NOTICE 'Added "timezone" column to "Clubs" table';
    ELSE
        RAISE NOTICE '"timezone" column already exists in "Clubs" table';
    END IF;
END
$$;

COMMIT;



