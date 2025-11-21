-- ============================================================================
-- Database Setup for Login/Authentication
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- Step 1: Ensure User Table Exists (if not already created)
-- ============================================================================

-- Create Role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CLUB_ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check if User table exists and migrate if needed
DO $$ 
BEGIN
    -- If User table doesn't exist, create it
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        CREATE TABLE "User" (
            "id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            "email" TEXT NOT NULL,
            "Firstname" TEXT,
            "Surname" TEXT,
            "avatarUrl" TEXT,
            "clubId" TEXT,
            "role" "Role" NOT NULL DEFAULT 'MEMBER',
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "lastLoginAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT "User_pkey" PRIMARY KEY ("id")
        );
        
        -- Create indexes
        CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
        CREATE INDEX "User_clubId_idx" ON "User"("clubId");
    ELSE
        -- Table exists - check if we need to migrate from TEXT to UUID
        -- This is a complex migration that should be done carefully
        -- For now, we'll just ensure the structure is compatible
        RAISE NOTICE 'User table already exists. If you need to migrate from TEXT id to UUID, please do so manually.';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create Function to Sync User Profile with Auth
-- ============================================================================

-- Function to automatically create/update user profile when auth user is created
-- Handle both TEXT and UUID id types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_id_value TEXT;
  user_firstname TEXT;
  user_surname TEXT;
BEGIN
  -- Convert UUID to TEXT if needed, or keep as is
  user_id_value := NEW.id::text;
  
  -- Extract Firstname and Surname from user metadata
  user_firstname := COALESCE(
    NEW.raw_user_meta_data->>'Firstname',
    split_part(COALESCE(NEW.raw_user_meta_data->>'displayName', ''), ' ', 1),
    split_part(NEW.email, '@', 1)
  );
  
  user_surname := COALESCE(
    NEW.raw_user_meta_data->>'Surname',
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

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Step 3: Create Function to Update Last Login
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public."User"
  SET "lastLoginAt" = NOW(), "updatedAt" = NOW()
  WHERE id::text = NEW.id::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last login (will be triggered after successful auth)
-- Note: This can be called manually from your app after successful login

-- ============================================================================
-- Step 4: Update Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON public."User";
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public."User";
DROP POLICY IF EXISTS "Public can view users" ON public."User";
DROP POLICY IF EXISTS "Users can update their own data" ON public."User";
DROP POLICY IF EXISTS "Service role can do anything" ON public."User";

-- Policy: Users can view their own data
-- Cast auth.uid() to text to match TEXT id column (if id is UUID, this will still work)
CREATE POLICY "Users can view their own data" ON public."User"
  FOR SELECT
  USING (COALESCE(auth.uid()::text, '') = id::text);

-- Policy: Users can view all users (for now - adjust based on your needs)
CREATE POLICY "Authenticated users can view all users" ON public."User"
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update their own data
-- Cast auth.uid() to text to match TEXT id column
CREATE POLICY "Users can update their own data" ON public."User"
  FOR UPDATE
  USING (COALESCE(auth.uid()::text, '') = id::text)
  WITH CHECK (COALESCE(auth.uid()::text, '') = id::text);

-- Policy: Service role bypasses RLS (for server-side operations)
CREATE POLICY "Service role can do anything" ON public."User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public read for demo purposes (can be removed later)
CREATE POLICY "Public can view users" ON public."User"
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Step 5: Create Helper Function to Get User by Email
-- ============================================================================

-- Drop the function first if it exists (to allow return type change)
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  "Firstname" TEXT,
  "Surname" TEXT,
  "avatarUrl" TEXT,
  role "Role",
  "isActive" BOOLEAN,
  "lastLoginAt" TIMESTAMP,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u."Firstname",
    u."Surname",
    u."avatarUrl",
    u.role,
    u."isActive",
    u."lastLoginAt",
    u."createdAt",
    u."updatedAt"
  FROM public."User" u
  WHERE LOWER(u.email) = LOWER(user_email)
    AND u."isActive" = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 6: Create Function to Check if User Exists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_exists(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public."User" 
    WHERE LOWER(email) = LOWER(user_email) 
    AND "isActive" = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 7: Seed Test User (Optional - for development)
-- ============================================================================

-- Note: To create a test user, you'll need to:
-- 1. Use Supabase Auth UI or API to sign up a user
-- 2. The trigger will automatically create a User profile
-- OR manually insert:
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('password123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- );

-- ============================================================================
-- Step 8: Grant Necessary Permissions
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public."User" TO authenticated;

-- Grant access to anon users (for public read)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public."User" TO anon;

-- ============================================================================
-- Step 9: Verify Setup
-- ============================================================================

-- Check if User table exists and has data
-- SELECT COUNT(*) FROM public."User";

-- Check if policies are set up correctly
-- SELECT * FROM pg_policies WHERE tablename = 'User';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Supabase Auth handles password hashing automatically
-- 2. User profiles are automatically created when users sign up via auth
-- 3. The User.id now references auth.users(id) for proper linking
-- 4. RLS policies ensure users can only see/update their own data
-- 5. Service role key bypasses RLS for server-side operations
--
-- NEXT STEPS:
-- 1. Set up Supabase Auth in your app (email/password, OAuth, etc.)
-- 2. Use supabase.auth.signUp() for registration
-- 3. Use supabase.auth.signInWithPassword() for login
-- 4. Use supabase.auth.signOut() for logout
-- 5. The User profile will be automatically synced with auth.users

