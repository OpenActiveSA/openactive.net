-- Check if booking settings columns exist in Clubs table
-- Run this first to see what columns are missing

SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name IN ('openingTime', 'closingTime', 'bookingSlotInterval')
ORDER BY column_name;

