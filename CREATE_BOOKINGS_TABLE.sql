-- ============================================================================
-- Create Bookings Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Create BookingStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create BookingType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "BookingType" AS ENUM ('singles', 'doubles');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 1: Create Bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE, -- Users.id is TEXT, not UUID
    
    -- Booking details
    "courtNumber" INTEGER NOT NULL,
    "bookingDate" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "duration" INTEGER NOT NULL, -- Duration in minutes
    "endTime" TIME NOT NULL, -- Calculated: startTime + duration
    
    -- Booking type and players
    "bookingType" "BookingType" NOT NULL DEFAULT 'singles',
    "player1Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL, -- Primary player (booker)
    "player2Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL, -- For singles: null, for doubles: second player
    "player3Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL, -- For doubles: third player (optional)
    "player4Id" TEXT REFERENCES "Users"("id") ON DELETE SET NULL, -- For doubles: fourth player (optional)
    
    -- Guest players (for non-registered users)
    "guestPlayer1Name" TEXT,
    "guestPlayer2Name" TEXT,
    "guestPlayer3Name" TEXT,
    
    -- Status and metadata
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT, -- Additional notes or special requests
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT REFERENCES "Users"("id") ON DELETE SET NULL,
    "cancellationReason" TEXT,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Bookings_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS "Bookings_clubId_idx" ON "Bookings"("clubId");
CREATE INDEX IF NOT EXISTS "Bookings_userId_idx" ON "Bookings"("userId");
CREATE INDEX IF NOT EXISTS "Bookings_bookingDate_idx" ON "Bookings"("bookingDate");
CREATE INDEX IF NOT EXISTS "Bookings_courtNumber_idx" ON "Bookings"("courtNumber");
CREATE INDEX IF NOT EXISTS "Bookings_status_idx" ON "Bookings"("status");
CREATE INDEX IF NOT EXISTS "Bookings_clubId_date_idx" ON "Bookings"("clubId", "bookingDate");
CREATE INDEX IF NOT EXISTS "Bookings_clubId_court_date_idx" ON "Bookings"("clubId", "courtNumber", "bookingDate");

-- Composite index for checking availability (club, court, date, time range)
CREATE INDEX IF NOT EXISTS "Bookings_availability_idx" ON "Bookings"("clubId", "courtNumber", "bookingDate", "startTime", "endTime", "status")
WHERE "status" IN ('pending', 'confirmed');

-- Step 3: Create function to automatically calculate endTime
CREATE OR REPLACE FUNCTION calculate_booking_end_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate endTime = startTime + duration (in minutes)
    NEW."endTime" := (NEW."startTime" + (NEW."duration" || ' minutes')::INTERVAL)::TIME;
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically update endTime and updatedAt
DROP TRIGGER IF EXISTS "calculate_booking_end_time_trigger" ON "Bookings";
CREATE TRIGGER "calculate_booking_end_time_trigger"
    BEFORE INSERT OR UPDATE OF "startTime", "duration" ON "Bookings"
    FOR EACH ROW
    EXECUTE FUNCTION calculate_booking_end_time();

-- Step 5: Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS "update_bookings_updated_at" ON "Bookings";
CREATE TRIGGER "update_bookings_updated_at"
    BEFORE UPDATE ON "Bookings"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Enable Row Level Security
ALTER TABLE "Bookings" ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own bookings" ON "Bookings";
DROP POLICY IF EXISTS "Users can create their own bookings" ON "Bookings";
DROP POLICY IF EXISTS "Users can update their own bookings" ON "Bookings";
DROP POLICY IF EXISTS "Users can cancel their own bookings" ON "Bookings";
DROP POLICY IF EXISTS "Club admins can view all club bookings" ON "Bookings";
DROP POLICY IF EXISTS "Club admins can manage all club bookings" ON "Bookings";
DROP POLICY IF EXISTS "Public can view confirmed bookings" ON "Bookings";

-- Step 9: Create RLS Policies

-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings" ON "Bookings"
    FOR SELECT
    TO authenticated
    USING (
        "userId" = auth.uid()::text
        OR "player1Id" = auth.uid()::text
        OR "player2Id" = auth.uid()::text
        OR "player3Id" = auth.uid()::text
        OR "player4Id" = auth.uid()::text
    );

-- Users can create their own bookings
CREATE POLICY "Users can create their own bookings" ON "Bookings"
    FOR INSERT
    TO authenticated
    WITH CHECK ("userId" = auth.uid()::text);

-- Users can update their own bookings (only if pending or confirmed)
CREATE POLICY "Users can update their own bookings" ON "Bookings"
    FOR UPDATE
    TO authenticated
    USING (
        "userId" = auth.uid()::text
        AND "status" IN ('pending', 'confirmed')
    )
    WITH CHECK (
        "userId" = auth.uid()::text
        AND "status" IN ('pending', 'confirmed')
    );

-- Users can cancel their own bookings
CREATE POLICY "Users can cancel their own bookings" ON "Bookings"
    FOR UPDATE
    TO authenticated
    USING (
        "userId" = auth.uid()::text
        AND "status" IN ('pending', 'confirmed')
    )
    WITH CHECK (
        "userId" = auth.uid()::text
        AND "status" = 'cancelled'
    );

-- Club admins can view all bookings for their clubs
-- Handle both UserClubRoles table (if exists) and direct Users table check
CREATE POLICY "Club admins can view all club bookings" ON "Bookings"
    FOR SELECT
    TO authenticated
    USING (
        -- Check if user is SUPER_ADMIN
        EXISTS (
            SELECT 1 FROM "Users"
            WHERE "Users".id::text = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
        -- Note: UserClubRoles table check removed as table doesn't exist
        -- Add back when UserClubRoles table is created
    );

-- Club admins can manage all bookings for their clubs
CREATE POLICY "Club admins can manage all club bookings" ON "Bookings"
    FOR ALL
    TO authenticated
    USING (
        -- Check if user is SUPER_ADMIN
        EXISTS (
            SELECT 1 FROM "Users"
            WHERE "Users".id::text = auth.uid()::text
            AND "Users".role = 'SUPER_ADMIN'
        )
        -- Note: UserClubRoles table check removed as table doesn't exist
        -- Add back when UserClubRoles table is created
    );

-- Public can view confirmed bookings (for availability checking)
CREATE POLICY "Public can view confirmed bookings" ON "Bookings"
    FOR SELECT
    TO anon
    USING ("status" = 'confirmed');

COMMIT;

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Bookings'
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'Bookings';

