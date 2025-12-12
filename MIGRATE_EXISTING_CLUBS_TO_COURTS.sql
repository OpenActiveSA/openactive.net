-- ============================================================================
-- Migrate Existing Clubs to Courts Table
-- Run this AFTER running CREATE_COURTS_TABLE.sql
-- 
-- This script creates default courts for existing clubs based on their
-- numberOfCourts value. Each court will be named "Court 1", "Court 2", etc.
-- and default to TENNIS sport type.
-- ============================================================================

BEGIN;

DO $$ 
DECLARE
    club_record RECORD;
    court_count INTEGER;
    i INTEGER;
    court_name TEXT;
BEGIN
    -- Loop through all clubs
    FOR club_record IN 
        SELECT id, name, "numberOfCourts" 
        FROM "Clubs"
        WHERE "numberOfCourts" > 0
    LOOP
        -- Check if courts already exist for this club
        SELECT COUNT(*) INTO court_count
        FROM "Courts"
        WHERE "clubId" = club_record.id;
        
        -- Only create courts if none exist
        IF court_count = 0 THEN
            -- Create courts based on numberOfCourts
            FOR i IN 1..club_record."numberOfCourts" LOOP
                court_name := 'Court ' || i;
                
                -- Insert court (ignore if duplicate name exists)
                INSERT INTO "Courts" ("clubId", "name", "sportType", "isActive")
                VALUES (club_record.id, court_name, 'TENNIS', true)
                ON CONFLICT ("clubId", "name") DO NOTHING;
            END LOOP;
            
            RAISE NOTICE 'Created % courts for club: %', club_record."numberOfCourts", club_record.name;
        ELSE
            RAISE NOTICE 'Club % already has % courts, skipping.', club_record.name, court_count;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- 
-- Check courts created:
-- SELECT 
--     c.name as club_name,
--     COUNT(cr.id) as court_count,
--     STRING_AGG(cr.name, ', ' ORDER BY cr.name) as court_names
-- FROM "Clubs" c
-- LEFT JOIN "Courts" cr ON c.id = cr."clubId" AND cr."isActive" = true
-- GROUP BY c.id, c.name
-- ORDER BY c.name;
-- ============================================================================








