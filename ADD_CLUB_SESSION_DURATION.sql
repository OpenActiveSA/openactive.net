-- Add sessionDuration column to Clubs table
-- This migration adds a sessionDuration field for storing multiple session duration options
-- Stored as JSONB array to support multiple selections (e.g., [60, 90, 120])
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- Add sessionDuration column as JSONB to store array of numbers
ALTER TABLE "Clubs" 
ADD COLUMN IF NOT EXISTS "sessionDuration" JSONB DEFAULT '[60]'::jsonb;

-- Verify column was added
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'Clubs' 
    AND column_name = 'sessionDuration';

