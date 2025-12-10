-- ============================================================================
-- Add COACH Role to ClubRole Enum
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- 
-- This migration adds the COACH role to the existing ClubRole enum.
-- If the enum doesn't exist yet, run CREATE_CLUB_ROLES_SYSTEM.sql first.
-- ============================================================================

BEGIN;

-- Add COACH to ClubRole enum if it doesn't already exist
DO $$ 
BEGIN
    -- Check if ClubRole enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClubRole') THEN
        -- Check if COACH value already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_enum 
            WHERE enumlabel = 'COACH' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ClubRole')
        ) THEN
            -- Add COACH to the enum
            ALTER TYPE "ClubRole" ADD VALUE IF NOT EXISTS 'COACH';
            RAISE NOTICE 'COACH role added to ClubRole enum successfully!';
        ELSE
            RAISE NOTICE 'COACH role already exists in ClubRole enum.';
        END IF;
    ELSE
        RAISE NOTICE 'ClubRole enum does not exist. Please run CREATE_CLUB_ROLES_SYSTEM.sql first.';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- Run this to verify the enum values:
-- ============================================================================
-- SELECT enumlabel 
-- FROM pg_enum 
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ClubRole')
-- ORDER BY enumsortorder;
-- 
-- Expected output:
-- VISITOR
-- MEMBER
-- COACH
-- CLUB_ADMIN
-- ============================================================================







