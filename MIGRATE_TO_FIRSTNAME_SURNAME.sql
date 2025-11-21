-- ============================================================================
-- Migration: Add Firstname and Surname columns to User table
-- ============================================================================
-- This script updates the User table to use Firstname and Surname columns
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Step 1: Add Firstname and Surname columns if they don't exist
DO $$ 
BEGIN
  -- Add Firstname column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'Firstname') THEN
    ALTER TABLE public."User" ADD COLUMN "Firstname" TEXT;
    RAISE NOTICE 'Added Firstname column';
  END IF;
  
  -- Add Surname column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'Surname') THEN
    ALTER TABLE public."User" ADD COLUMN "Surname" TEXT;
    RAISE NOTICE 'Added Surname column';
  END IF;
END $$;

-- Step 2: Migrate existing displayName data to Firstname/Surname
-- Split displayName on the first space (first word = Firstname, rest = Surname)
UPDATE public."User"
SET 
  "Firstname" = CASE 
    WHEN "Firstname" IS NOT NULL THEN "Firstname"
    WHEN "displayName" IS NULL OR "displayName" = '' THEN split_part("email", '@', 1)
    WHEN position(' ' in "displayName") = 0 THEN "displayName"
    ELSE split_part("displayName", ' ', 1)
  END,
  "Surname" = CASE 
    WHEN "Surname" IS NOT NULL THEN "Surname"
    WHEN "displayName" IS NULL OR "displayName" = '' THEN ''
    WHEN position(' ' in "displayName") = 0 THEN ''
    ELSE substring("displayName" from position(' ' in "displayName") + 1)
  END
WHERE "Firstname" IS NULL;


-- Step 4: Update the handle_new_user function to use Firstname and Surname
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_id_value TEXT;
  user_firstname TEXT;
  user_surname TEXT;
BEGIN
  -- Convert UUID to TEXT if needed
  user_id_value := NEW.id::text;
  
  -- Extract Firstname and Surname from user metadata
  user_firstname := COALESCE(
    NEW.raw_user_meta_data->>'Firstname',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.raw_user_meta_data->>'displayName', ''), ' ', 1),
    split_part(NEW.email, '@', 1)
  );
  
  user_surname := COALESCE(
    NEW.raw_user_meta_data->>'Surname',
    NEW.raw_user_meta_data->>'surname',
    CASE 
      WHEN NEW.raw_user_meta_data->>'displayName' IS NOT NULL 
           AND position(' ' in NEW.raw_user_meta_data->>'displayName') > 0
      THEN substring(NEW.raw_user_meta_data->>'displayName' from position(' ' in NEW.raw_user_meta_data->>'displayName') + 1)
      ELSE ''
    END,
    ''
  );
  
  INSERT INTO public."User" (id, email, "Firstname", "Surname", "createdAt", "updatedAt")
  VALUES (
    user_id_value,
    NEW.email,
    user_firstname,
    user_surname,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    "Firstname" = COALESCE(EXCLUDED."Firstname", public."User"."Firstname"),
    "Surname" = COALESCE(EXCLUDED."Surname", public."User"."Surname"),
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Drop displayName column (optional - uncomment after verifying migration worked)
-- Uncomment the following line AFTER you've verified everything works:
ALTER TABLE public."User" DROP COLUMN IF EXISTS "displayName";

-- Migration complete! Firstname and Surname columns have been added, displayName has been removed, and handle_new_user function has been updated.
DO $$ 
BEGIN
  RAISE NOTICE 'Migration complete! Firstname and Surname columns have been added and handle_new_user function has been updated.';
END $$;

