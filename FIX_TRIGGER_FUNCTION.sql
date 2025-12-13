-- ============================================================================
-- Fix the handle_new_user() trigger function
-- This updates the trigger to handle both User and Users tables
-- and includes all required columns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_id_value TEXT;
  user_firstname TEXT;
  user_surname TEXT;
  insert_error TEXT;
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
  
  -- Try to insert into Users table first (plural)
  BEGIN
    INSERT INTO public."Users" (
      id, 
      email, 
      "Firstname", 
      "Surname", 
      role,
      "isActive",
      "createdAt", 
      "updatedAt"
    )
    VALUES (
      user_id_value,
      NEW.email,
      user_firstname,
      user_surname,
      'MEMBER'::"Role",
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      "Firstname" = COALESCE(EXCLUDED."Firstname", public."Users"."Firstname"),
      "Surname" = COALESCE(EXCLUDED."Surname", public."Users"."Surname"),
      "updatedAt" = NOW();
    
    -- Success, return
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    insert_error := SQLERRM;
    -- If Users table doesn't exist or insert failed, try User table (singular)
    BEGIN
      INSERT INTO public."User" (
        id, 
        email, 
        "Firstname", 
        "Surname", 
        role,
        "isActive",
        "createdAt", 
        "updatedAt"
      )
      VALUES (
        user_id_value,
        NEW.email,
        user_firstname,
        user_surname,
        'MEMBER'::"Role",
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        "Firstname" = COALESCE(EXCLUDED."Firstname", public."User"."Firstname"),
        "Surname" = COALESCE(EXCLUDED."Surname", public."User"."Surname"),
        "updatedAt" = NOW();
      
      -- Success with User table, return
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
      -- Both tables failed, log the error but don't fail the auth user creation
      -- This allows users to be created even if the trigger fails
      RAISE WARNING 'Failed to create user profile in both Users and User tables: %', SQLERRM;
      -- Still return NEW to allow auth user creation to succeed
      RETURN NEW;
    END;
  END;
END;
$function$;




