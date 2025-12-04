-- ============================================================================
-- Create Clubs Table Migration
-- This migration creates the Clubs table with all necessary fields
-- ============================================================================

-- Create Clubs table (using plural name to match the code)
CREATE TABLE IF NOT EXISTS "Clubs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "numberOfCourts" INTEGER NOT NULL DEFAULT 1,
    "country" TEXT,
    "province" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Clubs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Clubs_name_idx" ON "Clubs"("name");
CREATE INDEX IF NOT EXISTS "Clubs_is_active_idx" ON "Clubs"("is_active");

-- Enable Row Level Security
ALTER TABLE "Clubs" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view all clubs" ON "Clubs";
DROP POLICY IF EXISTS "Super admins can manage clubs" ON "Clubs";
DROP POLICY IF EXISTS "Public can view clubs" ON "Clubs";

-- Create RLS Policies
-- Allow authenticated users to view all clubs
CREATE POLICY "Authenticated users can view all clubs" ON "Clubs"
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow SUPER_ADMIN to insert, update, and delete clubs
-- Note: This checks the Users table (plural) as per the renamed table
CREATE POLICY "Super admins can manage clubs" ON "Clubs"
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "Users"
            WHERE "Users".id = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
    );

-- Allow public read access (for now, can be restricted later)
CREATE POLICY "Public can view clubs" ON "Clubs"
    FOR SELECT
    TO anon
    USING (true);

