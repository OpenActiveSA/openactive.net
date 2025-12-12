-- ============================================================================
-- Add Club Module Columns to Clubs Table
-- 
-- This script adds columns to store module enable/disable settings for clubs:
-- - moduleCourtBooking
-- - moduleMemberManager
-- - moduleWebsite
-- - moduleEmailers
-- - moduleVisitorPayment
-- - moduleFloodlightPayment
-- - moduleEvents
-- - moduleCoaching
-- - moduleLeague
-- - moduleAccessControl
-- - moduleFinanceIntegration
-- 
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

BEGIN;

-- Check if columns exist, if not, add them
DO $$ 
BEGIN
    -- Add moduleCourtBooking column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleCourtBooking'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleCourtBooking" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleCourtBooking column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleCourtBooking column already exists in Clubs table';
    END IF;

    -- Add moduleMemberManager column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleMemberManager'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleMemberManager" BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added moduleMemberManager column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleMemberManager column already exists in Clubs table';
    END IF;

    -- Add moduleWebsite column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleWebsite'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleWebsite" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleWebsite column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleWebsite column already exists in Clubs table';
    END IF;

    -- Add moduleEmailers column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleEmailers'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleEmailers" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleEmailers column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleEmailers column already exists in Clubs table';
    END IF;

    -- Add moduleVisitorPayment column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleVisitorPayment'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleVisitorPayment" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleVisitorPayment column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleVisitorPayment column already exists in Clubs table';
    END IF;

    -- Add moduleFloodlightPayment column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleFloodlightPayment'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleFloodlightPayment" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleFloodlightPayment column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleFloodlightPayment column already exists in Clubs table';
    END IF;

    -- Add moduleEvents column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleEvents'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleEvents" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleEvents column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleEvents column already exists in Clubs table';
    END IF;

    -- Add moduleCoaching column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleCoaching'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleCoaching" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleCoaching column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleCoaching column already exists in Clubs table';
    END IF;

    -- Add moduleLeague column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleLeague'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleLeague" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleLeague column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleLeague column already exists in Clubs table';
    END IF;

    -- Add moduleAccessControl column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleAccessControl'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleAccessControl" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleAccessControl column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleAccessControl column already exists in Clubs table';
    END IF;

    -- Add moduleFinanceIntegration column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'moduleFinanceIntegration'
    ) THEN
        ALTER TABLE "Clubs" 
        ADD COLUMN "moduleFinanceIntegration" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added moduleFinanceIntegration column to Clubs table';
    ELSE
        RAISE NOTICE 'moduleFinanceIntegration column already exists in Clubs table';
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
-- AND column_name LIKE 'module%'
-- ORDER BY column_name;

