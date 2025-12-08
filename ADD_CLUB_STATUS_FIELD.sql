-- ============================================================================
-- Add Club Status Field
-- This adds a status enum and column to the Clubs table
-- ============================================================================

BEGIN;

-- Step 1: Create ClubStatus enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubStatus') THEN
        CREATE TYPE "ClubStatus" AS ENUM (
            'ACTIVE_PAID',
            'ACTIVE_FREE',
            'FREE_TRIAL',
            'DISABLED'
        );
        RAISE NOTICE 'ClubStatus enum created successfully!';
    ELSE
        RAISE NOTICE 'ClubStatus enum already exists.';
    END IF;
END $$;

-- Step 2: Add status column to Clubs table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'status'
    ) THEN
        -- Add status column with default based on is_active
        ALTER TABLE "Clubs" 
        ADD COLUMN "status" "ClubStatus" DEFAULT 'ACTIVE_FREE';
        
        -- Migrate existing data: set status based on is_active
        UPDATE "Clubs" 
        SET "status" = CASE 
            WHEN "is_active" = true THEN 'ACTIVE_FREE'
            ELSE 'DISABLED'
        END;
        
        RAISE NOTICE 'Status column added successfully!';
    ELSE
        RAISE NOTICE 'Status column already exists.';
    END IF;
END $$;

COMMIT;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Clubs' 
AND column_name = 'status';

