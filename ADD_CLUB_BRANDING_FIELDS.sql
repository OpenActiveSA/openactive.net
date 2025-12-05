-- ============================================================================
-- Add Branding Fields (Logo and Colors) to Clubs Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

DO $$ 
BEGIN
    -- Add logo column if it doesn't exist (URL to logo image)
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

    -- Add primaryColor column if it doesn't exist (hex color code)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'primaryColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "primaryColor" TEXT;
        RAISE NOTICE 'Primary color column added successfully!';
    ELSE
        RAISE NOTICE 'Primary color column already exists.';
    END IF;

    -- Add secondaryColor column if it doesn't exist (hex color code)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Clubs' 
        AND column_name = 'secondaryColor'
    ) THEN
        ALTER TABLE "Clubs" ADD COLUMN "secondaryColor" TEXT;
        RAISE NOTICE 'Secondary color column added successfully!';
    ELSE
        RAISE NOTICE 'Secondary color column already exists.';
    END IF;

    -- Add backgroundColor column if it doesn't exist (hex color code)
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

    -- Add selectedColor column if it doesn't exist (hex color code)
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

    -- Add actionColor column if it doesn't exist (hex color code)
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
END $$;

