-- ============================================================================
-- Add All Club Branding Columns
-- Run this in Supabase SQL Editor to add all branding-related columns at once
-- ============================================================================

DO $$ 
BEGIN
    -- Add logo column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'logo'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "logo" TEXT;
        RAISE NOTICE 'Logo column added successfully!';
    ELSE
        RAISE NOTICE 'Logo column already exists.';
    END IF;

    -- Add backgroundImage column if it doesn't exist
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

    -- Add backgroundColor column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'backgroundColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "backgroundColor" TEXT;
        RAISE NOTICE 'Background color column added successfully!';
    ELSE
        RAISE NOTICE 'Background color column already exists.';
    END IF;

    -- Add selectedColor column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'selectedColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "selectedColor" TEXT;
        RAISE NOTICE 'Selected color column added successfully!';
    ELSE
        RAISE NOTICE 'Selected color column already exists.';
    END IF;

    -- Add actionColor column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'actionColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "actionColor" TEXT;
        RAISE NOTICE 'Action color column added successfully!';
    ELSE
        RAISE NOTICE 'Action color column already exists.';
    END IF;

    -- Add fontColor column if it doesn't exist
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

-- Verify columns were added
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Clubs'
AND column_name IN ('logo', 'backgroundImage', 'backgroundColor', 'selectedColor', 'actionColor', 'fontColor', 'hoverColor')
ORDER BY column_name;


