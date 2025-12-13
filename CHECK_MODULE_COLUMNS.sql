-- ============================================================================
-- Check Module Settings Columns in Clubs Table
-- 
-- This script checks if all module settings columns exist in the Clubs table.
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Check which module columns exist
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Clubs'
AND column_name LIKE 'module%'
ORDER BY column_name;

-- Expected columns:
-- - moduleCourtBooking (BOOLEAN)
-- - moduleMemberManager (BOOLEAN)
-- - moduleWebsite (BOOLEAN)
-- - moduleEmailers (BOOLEAN)
-- - moduleVisitorPayment (BOOLEAN)
-- - moduleFloodlightPayment (BOOLEAN)
-- - moduleEvents (BOOLEAN)
-- - moduleCoaching (BOOLEAN)
-- - moduleLeague (BOOLEAN)
-- - moduleAccessControl (BOOLEAN)
-- - moduleFinanceIntegration (BOOLEAN)
--
-- Removed columns (should NOT exist or can be ignored):
-- - moduleRankings (removed)
-- - moduleMarketing (removed)
-- - moduleClubWallet (removed)

-- ============================================================================
-- Check if any clubs have module settings configured
-- ============================================================================
SELECT 
    id,
    name,
    "moduleCourtBooking",
    "moduleMemberManager",
    "moduleWebsite",
    "moduleEmailers",
    "moduleVisitorPayment",
    "moduleFloodlightPayment",
    "moduleEvents",
    "moduleCoaching",
    "moduleLeague",
    "moduleAccessControl",
    "moduleFinanceIntegration"
FROM "Clubs"
LIMIT 10;

-- ============================================================================
-- Count how many clubs have each module enabled
-- ============================================================================
SELECT 
    COUNT(*) FILTER (WHERE "moduleCourtBooking" = true) as court_booking_enabled,
    COUNT(*) FILTER (WHERE "moduleMemberManager" = true) as member_manager_enabled,
    COUNT(*) FILTER (WHERE "moduleWebsite" = true) as website_enabled,
    COUNT(*) FILTER (WHERE "moduleEmailers" = true) as emailers_enabled,
    COUNT(*) FILTER (WHERE "moduleVisitorPayment" = true) as visitor_payment_enabled,
    COUNT(*) FILTER (WHERE "moduleFloodlightPayment" = true) as floodlight_payment_enabled,
    COUNT(*) FILTER (WHERE "moduleEvents" = true) as events_enabled,
    COUNT(*) FILTER (WHERE "moduleCoaching" = true) as coaching_enabled,
    COUNT(*) FILTER (WHERE "moduleLeague" = true) as league_enabled,
    COUNT(*) FILTER (WHERE "moduleAccessControl" = true) as access_control_enabled,
    COUNT(*) FILTER (WHERE "moduleFinanceIntegration" = true) as finance_integration_enabled,
    COUNT(*) as total_clubs
FROM "Clubs";




