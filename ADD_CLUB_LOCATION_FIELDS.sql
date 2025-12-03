-- ============================================================================
-- Add Country and Province/State Fields to Club Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

DO $$ 
BEGIN
    -- Add Country column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Club' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE "Club" ADD COLUMN "country" TEXT;
        RAISE NOTICE 'Country column added successfully!';
    ELSE
        RAISE NOTICE 'Country column already exists.';
    END IF;

    -- Add Province/State column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Club' 
        AND column_name = 'province'
    ) THEN
        ALTER TABLE "Club" ADD COLUMN "province" TEXT;
        RAISE NOTICE 'Province column added successfully!';
    ELSE
        RAISE NOTICE 'Province column already exists.';
    END IF;
END $$;





