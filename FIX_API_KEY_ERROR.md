# Fix: "Invalid API key (undefined)" Error

## Problem
The mobile app shows an error: **"Database error: Invalid API key (undefined)"**

This happens because the `.env` file has a placeholder value instead of your actual Supabase API key.

## Quick Fix (2 minutes)

### Step 1: Get Your Supabase API Key

1. Go to your Supabase dashboard:
   **https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/settings/api**

2. Find the **"anon public"** key (it's a long string starting with `eyJ...`)

3. Copy the entire key

### Step 2: Update the .env File

1. Open `apps/mobile/.env` in a text editor

2. Replace this line:
   ```env
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   With your actual key:
   ```env
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (paste your full key here)

3. Save the file

### Step 3: Restart the App

**Important:** After updating `.env`, you MUST restart Expo:

1. Stop the Expo server (press `Ctrl+C` in the terminal)
2. Restart it:
   ```powershell
   npm run dev:mobile
   ```
3. Reload the app in the emulator (press `r` in the Expo terminal, or shake device and tap "Reload")

## Verify It's Working

After restarting, you should see:
- ✅ No error message
- ✅ The app displays user data from the database
- ✅ Console shows: `[mobile] User found`

## Still Having Issues?

1. **Check the .env file format:**
   - Make sure there are NO quotes around the key
   - Make sure there are NO spaces around the `=` sign
   - Example: `EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...` ✅
   - NOT: `EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."` ❌

2. **Make sure you're using the anon key, not service_role:**
   - ✅ Use: **anon public** key (safe for mobile apps)
   - ❌ Don't use: **service_role** key (server-side only)

3. **Check console logs:**
   - Look for: `[mobile] Supabase client initialized`
   - If you see an error about missing configuration, the .env file isn't being loaded

## Need Help?

- **Dashboard:** https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv
- **API Settings:** https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/settings/api

