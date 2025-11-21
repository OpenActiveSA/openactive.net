-- ============================================================================
-- Migration: Replace displayName with name and surname
-- ============================================================================
-- This script updates the User table to use separate name and surname fields
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Step 1: Add new columns (name and surname) to User table
DO $$ 
BEGIN
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'name') THEN
    ALTER TABLE public."User" ADD COLUMN "name" TEXT;
    RAISE NOTICE 'Added name column';
  END IF;
  
  -- Add surname column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'User' 
                 AND column_name = 'surname') THEN
    ALTER TABLE public."User" ADD COLUMN "surname" TEXT;
    RAISE NOTICE 'Added surname column';
  END IF;
END $$;

-- Step 2: Migrate existing displayName data to name and surname
-- This splits displayName on the last space (first word = name, rest = surname)
UPDATE public."User"
SET 
  "name" = CASE 
    WHEN "displayName" IS NULL OR "displayName" = '' THEN split_part("email", '@', 1)
    WHEN position(' ' in "displayName") = 0 THEN "displayName"
    ELSE left("displayName", position(' ' in reverse("displayName")) - 2)
  END,
  "surname" = CASE 
    WHEN "displayName" IS NULL OR "displayName" = '' THEN ''
    WHEN position(' ' in "displayName") = 0 THEN ''
    ELSE right("displayName", length("displayName") - length(left("displayName", position(' ' in reverse("displayName")) - 2)) - 1)
  END
WHERE "name" IS NULL OR "surname" IS NULL;

-- Better migration: Split on first space (simpler approach)
UPDATE public."User"
SET 
  "name" = CASE 
    WHEN "displayName" IS NULL OR "displayName" = '' THEN split_part("email", '@', 1)
    WHEN position(' ' in "displayName") = 0 THEN "displayName"
    ELSE split_part("displayName", ' ', 1)
  END,
  "surname" = CASE 
    WHEN "displayName" IS NULL OR "displayName" = '' THEN ''
    WHEN position(' ' in "displayName") = 0 THEN ''
    ELSE substring("displayName" from position(' ' in "displayName") + 1)
  END
WHERE "name" IS NULL OR ("name" = '' AND "displayName" IS NOT NULL);

-- Step 3: Make name and surname NOT NULL for new records
-- But allow NULL for migration period
DO $$
BEGIN
  -- First, set default values for any remaining NULL values
  UPDATE public."User"
  SET 
    "name" = COALESCE("name", split_part("email", '@', 1)),
    "surname" = COALESCE("surname", '')
  WHERE "name" IS NULL;
END $$;

-- Step 4: Update the handle_new_user function to use name and surname
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_id_value TEXT;
  user_name TEXT;
  user_surname TEXT;
BEGIN
  -- Convert UUID to TEXT if needed
  user_id_value := NEW.id::text;
  
  -- Extract name and surname from user metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.raw_user_meta_data->>'displayName', ''), ' ', 1),
    split_part(NEW.email, '@', 1)
  );
  
  user_surname := COALESCE(
    NEW.raw_user_meta_data->>'surname',
    CASE 
      WHEN NEW.raw_user_meta_data->>'displayName' IS NOT NULL 
           AND position(' ' in NEW.raw_user_meta_data->>'displayName') > 0
      THEN substring(NEW.raw_user_meta_data->>'displayName' from position(' ' in NEW.raw_user_meta_data->>'displayName') + 1)
      ELSE ''
    END,
    ''
  );
  
  INSERT INTO public."User" (id, email, name, surname, username, "createdAt", "updatedAt")
  VALUES (
    user_id_value,
    NEW.email,
    user_name,
    user_surname,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public."User".name),
    surname = COALESCE(EXCLUDED.surname, public."User".surname),
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: (Optional) Drop displayName column after verifying migration
-- Uncomment the following line AFTER you've verified everything works:
-- ALTER TABLE public."User" DROP COLUMN IF EXISTS "displayName";

RAISE NOTICE 'Migration complete! displayName has been migrated to name and surname.';
RAISE NOTICE 'You can drop the displayName column later after verifying everything works.';
RAISE NOTICE 'To drop it, run: ALTER TABLE public."User" DROP COLUMN IF EXISTS "displayName";';


