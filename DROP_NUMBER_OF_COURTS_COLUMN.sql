-- ============================================================================
-- Drop numberOfCourts Column from Clubs Table
-- 
-- This column is no longer needed since we're using the Courts table
-- to manage courts. The code has fallbacks in place, so this is safe.
-- ============================================================================

BEGIN;

-- Step 1: Verify the column exists before attempting to drop it
DO $$ 
BEGIN
    -- Check if numberOfCourts column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'numberOfCourts'
    ) THEN
        -- Drop the column
        ALTER TABLE "Clubs" DROP COLUMN "numberOfCourts";
        RAISE NOTICE '✅ numberOfCourts column dropped successfully from Clubs table.';
    ELSE
        RAISE NOTICE 'ℹ️ numberOfCourts column does not exist in Clubs table. Nothing to drop.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error dropping numberOfCourts column: %', SQLERRM;
        -- Don't fail the transaction, just log the error
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- 
-- Verify the column was dropped:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'Clubs' 
-- AND column_name = 'numberOfCourts';
-- 
-- Should return 0 rows if successful.

-- List all columns in Clubs table:
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Clubs'
ORDER BY ordinal_position;

