-- Add booking settings columns to Clubs table (Simplified version)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- Add openingTime column
ALTER TABLE "Clubs" 
ADD COLUMN IF NOT EXISTS "openingTime" TEXT DEFAULT '06:00';

-- Add closingTime column
ALTER TABLE "Clubs" 
ADD COLUMN IF NOT EXISTS "closingTime" TEXT DEFAULT '22:00';

-- Add bookingSlotInterval column
ALTER TABLE "Clubs" 
ADD COLUMN IF NOT EXISTS "bookingSlotInterval" INTEGER DEFAULT 60;

-- Verify columns were added
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name IN ('openingTime', 'closingTime', 'bookingSlotInterval')
ORDER BY column_name;

