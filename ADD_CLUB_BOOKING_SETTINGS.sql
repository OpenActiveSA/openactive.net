-- Add booking settings columns to Clubs table
-- This migration adds openingTime, closingTime, and bookingSlotInterval fields

DO $$
BEGIN
  -- Add openingTime column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name = 'openingTime'
  ) THEN
    ALTER TABLE "Clubs" 
    ADD COLUMN "openingTime" TEXT DEFAULT '06:00';
    
    RAISE NOTICE 'Column openingTime added to Clubs table';
  ELSE
    RAISE NOTICE 'Column openingTime already exists in Clubs table';
  END IF;

  -- Add closingTime column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name = 'closingTime'
  ) THEN
    ALTER TABLE "Clubs" 
    ADD COLUMN "closingTime" TEXT DEFAULT '22:00';
    
    RAISE NOTICE 'Column closingTime added to Clubs table';
  ELSE
    RAISE NOTICE 'Column closingTime already exists in Clubs table';
  END IF;

  -- Add bookingSlotInterval column
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name = 'bookingSlotInterval'
  ) THEN
    ALTER TABLE "Clubs" 
    ADD COLUMN "bookingSlotInterval" INTEGER DEFAULT 60;
    
    RAISE NOTICE 'Column bookingSlotInterval added to Clubs table';
  ELSE
    RAISE NOTICE 'Column bookingSlotInterval already exists in Clubs table';
  END IF;
END $$;

