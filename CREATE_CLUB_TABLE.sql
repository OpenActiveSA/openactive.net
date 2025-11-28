-- ============================================================================
-- Create Club Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Check if Club table exists and create if needed
DO $$ 
BEGIN
    -- If Club table doesn't exist, create it
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Club') THEN
        CREATE TABLE "Club" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "name" TEXT NOT NULL,
            "numberOfCourts" INTEGER NOT NULL DEFAULT 1,
            "is_active" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
        );
        
        -- Create indexes
        CREATE INDEX "Club_name_idx" ON "Club"("name");
        CREATE INDEX "Club_is_active_idx" ON "Club"("is_active");
        
        RAISE NOTICE 'Club table created successfully!';
    ELSE
        RAISE NOTICE 'Club table already exists.';
    END IF;
END $$;

-- Enable Row Level Security and create policies
DO $$ 
BEGIN
    -- Only proceed if Club table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Club') THEN
        -- Enable Row Level Security
        ALTER TABLE "Club" ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist (to avoid conflicts)
        DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Club";
        DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Club";
        DROP POLICY IF EXISTS "Public can view clubs" ON "Club";

        -- Create RLS Policies
        -- Allow authenticated users to view all clubs
        CREATE POLICY "Authenticated users can view all clubs" ON "Club"
            FOR SELECT
            TO authenticated
            USING (true);

        -- Allow SUPER_ADMIN to insert, update, and delete clubs
        CREATE POLICY "Super admins can manage clubs" ON "Club"
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM "User"
                    WHERE "User".id = auth.uid()::text
                    AND "User".role = 'SUPER_ADMIN'
                )
            );

        -- Allow public read access (for now, can be restricted later)
        CREATE POLICY "Public can view clubs" ON "Club"
            FOR SELECT
            TO anon
            USING (true);
    END IF;
END $$;

