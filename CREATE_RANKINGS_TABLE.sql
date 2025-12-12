-- ============================================================================
-- Create Rankings Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Create RankingCategory enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "RankingCategory" AS ENUM (
        'SINGLES_MENS',
        'SINGLES_LADIES',
        'DOUBLES_MENS',
        'DOUBLES_LADIES',
        'MIXED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 1: Create Rankings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Rankings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "userId" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
    
    -- Ranking details
    "category" "RankingCategory" NOT NULL,
    "startingRanking" DECIMAL(3,1) NOT NULL, -- Starting ranking (e.g., 3.0, 5.5, 7.0)
    "currentRanking" DECIMAL(3,1) NOT NULL, -- Current ranking (adjusted based on match results)
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Rankings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Rankings_user_club_category_unique" UNIQUE ("userId", "clubId", "category")
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Rankings_userId_idx" ON "Rankings"("userId");
CREATE INDEX IF NOT EXISTS "Rankings_clubId_idx" ON "Rankings"("clubId");
CREATE INDEX IF NOT EXISTS "Rankings_category_idx" ON "Rankings"("category");
CREATE INDEX IF NOT EXISTS "Rankings_club_category_ranking_idx" ON "Rankings"("clubId", "category", "currentRanking" DESC);

-- Step 3: Create updatedAt trigger
CREATE OR REPLACE FUNCTION update_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rankings_updated_at_trigger ON "Rankings";
CREATE TRIGGER update_rankings_updated_at_trigger
    BEFORE UPDATE ON "Rankings"
    FOR EACH ROW
    EXECUTE FUNCTION update_rankings_updated_at();

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE "Rankings" ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Policy: Users can view all rankings at their clubs
DROP POLICY IF EXISTS "Users can view rankings at their clubs" ON "Rankings";
CREATE POLICY "Users can view rankings at their clubs"
    ON "Rankings"
    FOR SELECT
    TO authenticated
    USING (true); -- All authenticated users can view rankings

-- Policy: Users can insert their own starting rankings
DROP POLICY IF EXISTS "Users can insert their own rankings" ON "Rankings";
CREATE POLICY "Users can insert their own rankings"
    ON "Rankings"
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = "userId");

-- Policy: Users can update their own rankings (for starting ranking)
DROP POLICY IF EXISTS "Users can update their own starting rankings" ON "Rankings";
CREATE POLICY "Users can update their own starting rankings"
    ON "Rankings"
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

-- Policy: System can update current rankings (for match result adjustments)
-- This would typically be done via a server-side function or admin role
-- For now, we'll allow users to update their own current ranking
-- In production, you might want to restrict this to admin/system functions

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- 
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name = 'Rankings'
-- ORDER BY ordinal_position;




