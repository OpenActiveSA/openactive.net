-- Add hoverColor column to Clubs table
-- This migration adds a hoverColor field for customizing hover states in the club branding

DO $$
BEGIN
  -- Check if the column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name = 'hoverColor'
  ) THEN
    -- Add the hoverColor column
    ALTER TABLE "Clubs" 
    ADD COLUMN "hoverColor" TEXT;
    
    RAISE NOTICE 'Column hoverColor added to Clubs table';
  ELSE
    RAISE NOTICE 'Column hoverColor already exists in Clubs table';
  END IF;
END $$;

