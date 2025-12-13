# Migration Instructions

## 1. Run Booking Days Migration Script

The booking days columns need to be added to your Supabase database. Follow these steps:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **"New query"**
5. Open the file `ADD_ALL_BOOKING_DAYS_COLUMNS.sql` from the project root
6. Copy the entire contents of the file
7. Paste into the SQL Editor
8. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

The script will add these columns to the `Clubs` table:
- `membersBookingDays` (default: 7)
- `visitorBookingDays` (default: 3)
- `coachBookingDays` (default: 14)
- `clubManagerBookingDays` (default: 30)

### Option B: Using Supabase CLI

If you have Supabase CLI linked to your project:

```bash
# Make sure you're in the project root
cd "E:\Open\Open Active\2026 Build\openactive.net"

# Link to your remote project (if not already linked)
npm run supabase:link

# Run the migration
# Note: You may need to copy the SQL to a migration file first
# Or run it directly via psql connection
```

### Verification

After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Clubs'
AND column_name IN ('membersBookingDays', 'visitorBookingDays', 'coachBookingDays', 'clubManagerBookingDays')
ORDER BY column_name;
```

You should see all 4 columns listed.

## 2. Code Changes Completed

The following improvements have been made:

### ✅ Error Handling Utilities Created
- `apps/web/src/lib/error-utils.ts` - Centralized error handling
- `apps/web/src/lib/logger.ts` - Development-only logging utilities

### ✅ Console Logs Gated
- All `console.log`, `console.warn`, and `console.error` statements have been replaced with:
  - `logDebug()` - Only logs in development
  - `logWarning()` - Only logs in development
  - `logError()` - Logs with consistent formatting

### ✅ Files Updated
- `apps/web/src/app/club/[slug]/page.tsx`
- `apps/web/src/app/club/[slug]/ClubPageClient.tsx`
- Additional files will be updated in subsequent commits

## 3. Next Steps

After running the migration:

1. **Refresh your admin page** - The booking days settings should now work correctly
2. **Test the date scroller** - It should respect the booking days settings
3. **Verify settings persist** - Change a booking days setting and refresh to confirm it saves

## Notes

- The migration script is **idempotent** - safe to run multiple times
- It checks if columns exist before adding them
- Default values are set for all columns
- Existing data is preserved




