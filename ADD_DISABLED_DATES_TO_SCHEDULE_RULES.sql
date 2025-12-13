-- ============================================================================
-- Add disabledDates Column to ScheduleRules Table
-- 
-- This script adds the disabledDates column to the ScheduleRules table
-- for supporting disabling specific dates in recurring rules (breaks/vacations)
-- 
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Check if column exists, if not, add it
DO $$ 
BEGIN
    -- Check if ScheduleRules table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ScheduleRules'
    ) THEN
        -- Add disabledDates column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ScheduleRules' 
            AND column_name = 'disabledDates'
        ) THEN
            ALTER TABLE "ScheduleRules" 
            ADD COLUMN "disabledDates" TEXT[] DEFAULT '{}';
            
            RAISE NOTICE 'Added disabledDates column to ScheduleRules table';
        ELSE
            RAISE NOTICE 'disabledDates column already exists in ScheduleRules table';
        END IF;
    ELSE
        RAISE NOTICE 'ScheduleRules table does not exist. Run CREATE_SCHEDULE_RULES_TABLE.sql first.';
    END IF;
END $$;

COMMIT;

-- Verification query (optional - run separately to verify)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name = 'ScheduleRules'
-- AND column_name = 'disabledDates';



