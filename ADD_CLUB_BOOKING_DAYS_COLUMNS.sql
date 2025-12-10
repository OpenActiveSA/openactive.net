-- ============================================================================
-- Add Booking Days Columns to Clubs Table
-- 
-- This script adds columns to store the number of days in advance that
-- members, visitors, and coaches can book courts.
-- ============================================================================

BEGIN;

-- Check if columns exist, if not, add them
DO $$ 
BEGIN
    -- Add membersBookingDays column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'membersBookingDays'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "membersBookingDays" INTEGER DEFAULT 7;
        
        RAISE NOTICE 'Added membersBookingDays column to Clubs table';
    ELSE
        RAISE NOTICE 'membersBookingDays column already exists in Clubs table';
    END IF;

    -- Add visitorBookingDays column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'visitorBookingDays'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "visitorBookingDays" INTEGER DEFAULT 3;
        
        RAISE NOTICE 'Added visitorBookingDays column to Clubs table';
    ELSE
        RAISE NOTICE 'visitorBookingDays column already exists in Clubs table';
    END IF;

    -- Add coachBookingDays column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'coachBookingDays'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "coachBookingDays" INTEGER DEFAULT 14;
        
        RAISE NOTICE 'Added coachBookingDays column to Clubs table';
    ELSE
        RAISE NOTICE 'coachBookingDays column already exists in Clubs table';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- 
-- To verify the columns were added, run:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name = 'Clubs'
-- AND column_name IN ('membersBookingDays', 'visitorBookingDays', 'coachBookingDays')
-- ORDER BY column_name;


