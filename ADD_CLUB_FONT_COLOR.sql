-- ============================================================================
-- Add Font Color Field to Clubs Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

DO $$ 
BEGIN
    -- Add fontColor column if it doesn't exist (hex color code)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'fontColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "fontColor" TEXT DEFAULT '#052333';
        RAISE NOTICE 'Font color column added successfully!';
    ELSE
        RAISE NOTICE 'Font color column already exists.';
    END IF;
END $$;


