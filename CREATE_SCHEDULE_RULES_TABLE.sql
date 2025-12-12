-- ============================================================================
-- Create ScheduleRules Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Create ScheduleRuleRecurring enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ScheduleRuleRecurring" AS ENUM ('none', 'daily', 'weekly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ScheduleRuleStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ScheduleRuleStatus" AS ENUM ('active', 'pause');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ScheduleRuleSetting enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ScheduleRuleSetting" AS ENUM (
        'blocked',
        'blocked-coaching',
        'blocked-tournament',
        'blocked-maintenance',
        'blocked-social',
        'members-only',
        'members-only-bookings',
        'open-doubles-singles',
        'doubles-only',
        'singles-only'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 1: Create ScheduleRules table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ScheduleRules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
    
    -- Rule details
    "name" TEXT NOT NULL,
    "courts" INTEGER[] NOT NULL DEFAULT '{}', -- Array of court numbers
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "reason" TEXT,
    "recurring" "ScheduleRuleRecurring" NOT NULL DEFAULT 'none',
    "recurringDays" INTEGER[], -- Array of day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    "status" "ScheduleRuleStatus" NOT NULL DEFAULT 'active',
    "setting" "ScheduleRuleSetting" NOT NULL DEFAULT 'blocked',
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ScheduleRules_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "ScheduleRules_clubId_idx" ON "ScheduleRules"("clubId");
CREATE INDEX IF NOT EXISTS "ScheduleRules_status_idx" ON "ScheduleRules"("status");
CREATE INDEX IF NOT EXISTS "ScheduleRules_clubId_status_idx" ON "ScheduleRules"("clubId", "status");
CREATE INDEX IF NOT EXISTS "ScheduleRules_date_range_idx" ON "ScheduleRules"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "ScheduleRules_clubId_date_range_idx" ON "ScheduleRules"("clubId", "startDate", "endDate");

-- Step 3: Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_schedule_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS "update_schedule_rules_updated_at_trigger" ON "ScheduleRules";
CREATE TRIGGER "update_schedule_rules_updated_at_trigger"
    BEFORE UPDATE ON "ScheduleRules"
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_rules_updated_at();

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE "ScheduleRules" ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Allow club admins to manage rules for their clubs
CREATE POLICY "Club admins can manage schedule rules for their clubs"
    ON "ScheduleRules"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "UserClubRoles" ucr
            WHERE ucr."userId" = auth.uid()::TEXT
            AND ucr."clubId" = "ScheduleRules"."clubId"
            AND ucr."role" = 'CLUB_ADMIN'
        )
    );

-- Allow super admins to manage all schedule rules
CREATE POLICY "Super admins can manage all schedule rules"
    ON "ScheduleRules"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Users" u
            WHERE u."id" = auth.uid()::TEXT
            AND u."role" = 'SUPER_ADMIN'
        )
    );

-- Allow authenticated users to read active schedule rules for clubs they have access to
CREATE POLICY "Users can read active schedule rules"
    ON "ScheduleRules"
    FOR SELECT
    USING (
        "status" = 'active'
        AND (
            -- User is a member, coach, or admin of the club
            EXISTS (
                SELECT 1 FROM "UserClubRoles" ucr
                WHERE ucr."userId" = auth.uid()::TEXT
                AND ucr."clubId" = "ScheduleRules"."clubId"
            )
            -- Or user is a super admin
            OR EXISTS (
                SELECT 1 FROM "Users" u
                WHERE u."id" = auth.uid()::TEXT
                AND u."role" = 'SUPER_ADMIN'
            )
        )
    );

COMMIT;

