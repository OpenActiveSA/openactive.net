-- ============================================================================
-- Add City Column to Clubs Table
-- 
-- This script adds a 'city' column to the Clubs table to store the city/town
-- where the club is located.
-- ============================================================================

BEGIN;

-- Check if city column exists, if not, add it
DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'city'
    ) THEN
        -- Add the city column
        ALTER TABLE "Clubs" 
        ADD COLUMN "city" TEXT;
        
        RAISE NOTICE 'Added city column to Clubs table';
    ELSE
        RAISE NOTICE 'City column already exists in Clubs table';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- 
-- To verify the column was added, run:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name = 'Clubs'
-- AND column_name = 'city';





