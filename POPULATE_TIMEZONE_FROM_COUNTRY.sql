-- ============================================================================
-- Populate Timezone from Country
--
-- This script populates the "timezone" column based on the club's "country"
-- field. It uses a mapping of countries to IANA timezone identifiers.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Update timezone based on country (only for clubs where timezone is NULL or empty)
UPDATE "Clubs"
SET "timezone" = CASE
    WHEN "country" = 'South Africa' THEN 'Africa/Johannesburg'
    WHEN "country" = 'United States' THEN 'America/New_York'
    WHEN "country" = 'United Kingdom' THEN 'Europe/London'
    WHEN "country" = 'Australia' THEN 'Australia/Sydney'
    WHEN "country" = 'New Zealand' THEN 'Pacific/Auckland'
    WHEN "country" = 'Canada' THEN 'America/Toronto'
    WHEN "country" = 'France' THEN 'Europe/Paris'
    WHEN "country" = 'Germany' THEN 'Europe/Berlin'
    WHEN "country" = 'Spain' THEN 'Europe/Madrid'
    WHEN "country" = 'Italy' THEN 'Europe/Rome'
    WHEN "country" = 'Netherlands' THEN 'Europe/Amsterdam'
    WHEN "country" = 'Belgium' THEN 'Europe/Brussels'
    WHEN "country" = 'Switzerland' THEN 'Europe/Zurich'
    WHEN "country" = 'Portugal' THEN 'Europe/Lisbon'
    WHEN "country" = 'Greece' THEN 'Europe/Athens'
    WHEN "country" = 'Poland' THEN 'Europe/Warsaw'
    WHEN "country" = 'Czech Republic' THEN 'Europe/Prague'
    WHEN "country" = 'Austria' THEN 'Europe/Vienna'
    WHEN "country" = 'Sweden' THEN 'Europe/Stockholm'
    WHEN "country" = 'Norway' THEN 'Europe/Oslo'
    WHEN "country" = 'Denmark' THEN 'Europe/Copenhagen'
    WHEN "country" = 'Finland' THEN 'Europe/Helsinki'
    WHEN "country" = 'Ireland' THEN 'Europe/Dublin'
    WHEN "country" = 'Brazil' THEN 'America/Sao_Paulo'
    WHEN "country" = 'Argentina' THEN 'America/Argentina/Buenos_Aires'
    WHEN "country" = 'Chile' THEN 'America/Santiago'
    WHEN "country" = 'Mexico' THEN 'America/Mexico_City'
    WHEN "country" = 'Japan' THEN 'Asia/Tokyo'
    WHEN "country" = 'China' THEN 'Asia/Shanghai'
    WHEN "country" = 'India' THEN 'Asia/Kolkata'
    WHEN "country" = 'Singapore' THEN 'Asia/Singapore'
    WHEN "country" = 'Hong Kong' THEN 'Asia/Hong_Kong'
    WHEN "country" = 'Thailand' THEN 'Asia/Bangkok'
    WHEN "country" = 'Malaysia' THEN 'Asia/Kuala_Lumpur'
    WHEN "country" = 'Indonesia' THEN 'Asia/Jakarta'
    WHEN "country" = 'Philippines' THEN 'Asia/Manila'
    WHEN "country" = 'South Korea' THEN 'Asia/Seoul'
    WHEN "country" = 'Taiwan' THEN 'Asia/Taipei'
    WHEN "country" = 'United Arab Emirates' THEN 'Asia/Dubai'
    WHEN "country" = 'Saudi Arabia' THEN 'Asia/Riyadh'
    WHEN "country" = 'Israel' THEN 'Asia/Jerusalem'
    WHEN "country" = 'Turkey' THEN 'Europe/Istanbul'
    WHEN "country" = 'Russia' THEN 'Europe/Moscow'
    WHEN "country" = 'Egypt' THEN 'Africa/Cairo'
    WHEN "country" = 'Kenya' THEN 'Africa/Nairobi'
    WHEN "country" = 'Nigeria' THEN 'Africa/Lagos'
    WHEN "country" = 'Morocco' THEN 'Africa/Casablanca'
    ELSE NULL
END
WHERE ("timezone" IS NULL OR "timezone" = '')
  AND "country" IS NOT NULL
  AND "country" != '';

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- 
-- To verify the update, run:
-- SELECT id, name, country, timezone 
-- FROM "Clubs" 
-- WHERE "country" IS NOT NULL 
-- ORDER BY "country";

