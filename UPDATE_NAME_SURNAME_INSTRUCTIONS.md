# Update Database: Replace displayName with name and surname

## Step 1: Run the Migration SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file `MIGRATE_DISPLAYNAME_TO_NAME_SURNAME.sql`
3. Copy all the contents
4. Paste into SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)

This migration will:
- Add `name` and `surname` columns to the User table
- Migrate existing `displayName` data (splits on first space)
- Update the trigger function to use name and surname
- Keep `displayName` column for backward compatibility (you can drop it later)

## Step 2: Verify the Migration

Run this SQL to check the migration:

```sql
SELECT 
    id,
    email,
    name,
    surname,
    "displayName" as old_display_name,
    CASE 
        WHEN name IS NOT NULL AND surname IS NOT NULL THEN '✅ Migrated'
        ELSE '⚠️ Needs Migration'
    END AS status
FROM public."User"
LIMIT 10;
```

## Step 3: Test Registration

1. Go to `/login` in your app
2. Click "Continue with email"
3. Enter a new email
4. You should see **two fields**: "Name" and "Surname" (instead of "Display name")
5. Fill them in and register

## Step 4: (Optional) Drop Old Column

After verifying everything works, you can remove the old `displayName` column:

```sql
ALTER TABLE public."User" DROP COLUMN IF EXISTS "displayName";
```

## What Changed

### Database Schema
- ❌ Removed: `displayName TEXT`
- ✅ Added: `name TEXT` (required for new users)
- ✅ Added: `surname TEXT` (optional)

### Registration Form
- Before: One "Display name" field
- After: Two fields - "Name" (required) and "Surname" (optional)

### Components Updated
- ✅ `EmailAuth.tsx` - Registration form now has name and surname fields
- ✅ `page.tsx` - Home page displays full name (name + surname)
- ✅ `api/users/[username]/route.ts` - API returns name and surname

## Notes

- Existing users: Their `displayName` will be split into name (first word) and surname (rest)
- New users: Will enter name and surname separately
- The trigger function automatically creates user profiles with name and surname
- Name is required, surname is optional (can be empty)


