-- ============================================================================
-- Add Background Image Field to Clubs Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

DO $$ 
BEGIN
    -- Add backgroundImage column if it doesn't exist (URL to background image for clubs list)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'backgroundImage'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "backgroundImage" TEXT;
        RAISE NOTICE 'Background image column added successfully!';
    ELSE
        RAISE NOTICE 'Background image column already exists.';
    END IF;
END $$;

