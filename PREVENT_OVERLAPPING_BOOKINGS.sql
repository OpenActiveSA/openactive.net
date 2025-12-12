-- ============================================================================
-- Prevent Overlapping Bookings Trigger
-- 
-- This script creates a database trigger that prevents overlapping bookings
-- for the same court on the same date. This provides a database-level safety
-- check in addition to application-level validation.
-- ============================================================================

BEGIN;

-- Create function to check for overlapping bookings
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
DECLARE
    overlapping_count INTEGER;
BEGIN
    -- Check if there are any existing bookings that overlap with the new/updated booking
    -- Two time slots overlap if: new start < existing end AND new end > existing start
    SELECT COUNT(*) INTO overlapping_count
    FROM "Bookings"
    WHERE "clubId" = NEW."clubId"
      AND "courtNumber" = NEW."courtNumber"
      AND "bookingDate" = NEW."bookingDate"
      AND "id" != COALESCE(NEW."id", '00000000-0000-0000-0000-000000000000'::UUID) -- Exclude the current booking on update
      AND "status" IN ('pending', 'confirmed')
      AND (
          -- Check for overlap: new start < existing end AND new end > existing start
          (NEW."startTime" < "endTime" AND NEW."endTime" > "startTime")
      );
    
    -- If there's an overlap, raise an error
    IF overlapping_count > 0 THEN
        RAISE EXCEPTION 'Booking overlaps with an existing booking. This time slot is already booked for this court.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS "prevent_overlapping_bookings_trigger" ON "Bookings";

-- Create trigger that fires before insert or update
CREATE TRIGGER "prevent_overlapping_bookings_trigger"
    BEFORE INSERT OR UPDATE ON "Bookings"
    FOR EACH ROW
    WHEN (NEW."status" IN ('pending', 'confirmed'))
    EXECUTE FUNCTION check_booking_overlap();

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
-- 
-- To verify the trigger is working, you can test with:
-- 
-- 1. Create a booking:
-- INSERT INTO "Bookings" ("clubId", "userId", "courtNumber", "bookingDate", "startTime", "endTime", "duration", "status")
-- VALUES ('<club-id>', '<user-id>', 1, '2024-01-01', '10:00', '11:00', 60, 'pending');
-- 
-- 2. Try to create an overlapping booking (should fail):
-- INSERT INTO "Bookings" ("clubId", "userId", "courtNumber", "bookingDate", "startTime", "endTime", "duration", "status")
-- VALUES ('<club-id>', '<user-id>', 1, '2024-01-01', '10:30', '11:30', 60, 'pending');
-- 
-- 3. Try to create a non-overlapping booking (should succeed):
-- INSERT INTO "Bookings" ("clubId", "userId", "courtNumber", "bookingDate", "startTime", "endTime", "duration", "status")
-- VALUES ('<club-id>', '<user-id>', 1, '2024-01-01', '11:00', '12:00', 60, 'pending');




