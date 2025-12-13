-- ============================================================================
-- Add Club Manager Booking Days Column to Clubs Table
-- 
-- This script adds a column to store the number of days in advance that
-- club managers can book courts. Super Admins will use the same setting.
-- ============================================================================

BEGIN;

-- Check if column exists, if not, add it
DO $$ 
BEGIN
    -- Add clubManagerBookingDays column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'clubManagerBookingDays'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "clubManagerBookingDays" INTEGER DEFAULT 30;
        
        RAISE NOTICE 'Added clubManagerBookingDays column to Clubs table';
    ELSE
        RAISE NOTICE 'clubManagerBookingDays column already exists in Clubs table';
    END IF;
END $$;

COMMIT;

-- ============================================================================




