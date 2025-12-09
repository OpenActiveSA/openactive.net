-- ============================================================================
-- Create MatchResults Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Step 1: Create MatchResults table if it doesn't exist
CREATE TABLE IF NOT EXISTS "MatchResults" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "bookingId" UUID NOT NULL REFERENCES "Bookings"("id") ON DELETE CASCADE,
    "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
    "submittedBy" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE SET NULL,
    
    -- Team A players (for doubles, this will be 2 players; for singles, 1 player)
    "teamAPlayer1Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL,
    "teamAPlayer2Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL,
    "teamAGuest1Name" TEXT, -- For guest players
    "teamAGuest2Name" TEXT,
    
    -- Team B players (for doubles, this will be 2 players; for singles, 1 player)
    "teamBPlayer1Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL,
    "teamBPlayer2Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL,
    "teamBGuest1Name" TEXT, -- For guest players
    "teamBGuest2Name" TEXT,
    
    -- Scores stored as JSONB array: [set1TeamA, set2TeamA, ...], [set1TeamB, set2TeamB, ...]
    "teamAScores" JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of scores for each set: [6, 3, 5]
    "teamBScores" JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of scores for each set: [4, 6, 7]
    
    -- Match metadata
    "matchDate" DATE NOT NULL,
    "matchTime" TIME NOT NULL,
    "duration" INTEGER, -- Duration in minutes (optional)
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "MatchResults_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MatchResults_bookingId_unique" UNIQUE ("bookingId") -- One result per booking
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS "MatchResults_bookingId_idx" ON "MatchResults"("bookingId");
CREATE INDEX IF NOT EXISTS "MatchResults_clubId_idx" ON "MatchResults"("clubId");
CREATE INDEX IF NOT EXISTS "MatchResults_submittedBy_idx" ON "MatchResults"("submittedBy");
CREATE INDEX IF NOT EXISTS "MatchResults_matchDate_idx" ON "MatchResults"("matchDate");
CREATE INDEX IF NOT EXISTS "MatchResults_clubId_date_idx" ON "MatchResults"("clubId", "matchDate");

-- Step 3: Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_match_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS "update_match_results_updated_at" ON "MatchResults";
CREATE TRIGGER "update_match_results_updated_at"
    BEFORE UPDATE ON "MatchResults"
    FOR EACH ROW
    EXECUTE FUNCTION update_match_results_updated_at();

-- Step 5: Enable Row Level Security
ALTER TABLE "MatchResults" ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view match results for their bookings" ON "MatchResults";
DROP POLICY IF EXISTS "Users can create match results for their bookings" ON "MatchResults";
DROP POLICY IF EXISTS "Users can update their own match results" ON "MatchResults";
DROP POLICY IF EXISTS "Club admins can view all club match results" ON "MatchResults";
DROP POLICY IF EXISTS "Public can view match results" ON "MatchResults";

-- Step 7: Create RLS Policies

-- Users can view match results for bookings they're involved in
CREATE POLICY "Users can view match results for their bookings" ON "MatchResults"
    FOR SELECT
    TO authenticated
    USING (
        -- User is the submitter
        "submittedBy" = auth.uid()::text
        -- Or user is a player in the match
        OR "teamAPlayer1Id" = auth.uid()::text
        OR "teamAPlayer2Id" = auth.uid()::text
        OR "teamBPlayer1Id" = auth.uid()::text
        OR "teamBPlayer2Id" = auth.uid()::text
        -- Or user is the booking owner (check via booking)
        OR EXISTS (
            SELECT 1 FROM "Bookings"
            WHERE "Bookings".id = "MatchResults"."bookingId"
            AND ("Bookings"."userId" = auth.uid()::text
                 OR "Bookings"."player1Id" = auth.uid()::text
                 OR "Bookings"."player2Id" = auth.uid()::text
                 OR "Bookings"."player3Id" = auth.uid()::text
                 OR "Bookings"."player4Id" = auth.uid()::text)
        )
    );

-- Users can create match results for bookings they're involved in
CREATE POLICY "Users can create match results for their bookings" ON "MatchResults"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User is involved in the booking
        EXISTS (
            SELECT 1 FROM "Bookings"
            WHERE "Bookings".id = "MatchResults"."bookingId"
            AND ("Bookings"."userId" = auth.uid()::text
                 OR "Bookings"."player1Id" = auth.uid()::text
                 OR "Bookings"."player2Id" = auth.uid()::text
                 OR "Bookings"."player3Id" = auth.uid()::text
                 OR "Bookings"."player4Id" = auth.uid()::text)
        )
    );

-- Users can update match results they submitted (within a time window, e.g., 24 hours)
CREATE POLICY "Users can update their own match results" ON "MatchResults"
    FOR UPDATE
    TO authenticated
    USING ("submittedBy" = auth.uid()::text)
    WITH CHECK ("submittedBy" = auth.uid()::text);

-- Club admins can view all match results for their clubs
CREATE POLICY "Club admins can view all club match results" ON "MatchResults"
    FOR SELECT
    TO authenticated
    USING (
        -- Check if user is SUPER_ADMIN
        EXISTS (
            SELECT 1 FROM "Users"
            WHERE "Users".id::text = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
        -- Note: Add UserClubRoles check when that table is available
    );

-- Public can view match results (for statistics/leaderboards)
CREATE POLICY "Public can view match results" ON "MatchResults"
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'MatchResults'
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'MatchResults';





