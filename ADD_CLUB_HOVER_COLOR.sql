-- ============================================================================
-- Add Hover Color Column to Clubs Table
-- Run this in Supabase SQL Editor if hoverColor column is missing
-- ============================================================================

DO $$ 
BEGIN
    -- Add hoverColor column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'hoverColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "hoverColor" TEXT DEFAULT '#f0f0f0';
        RAISE NOTICE 'Hover color column added successfully!';
    ELSE
        RAISE NOTICE 'Hover color column already exists.';
    END IF;
END $$;

-- Verify column exists
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Clubs'
AND column_name = 'hoverColor';

