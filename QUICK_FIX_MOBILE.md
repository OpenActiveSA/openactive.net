# Quick Fix: Mobile App "Something went wrong" Error

## Problem
The mobile app shows "Something went wrong" because it's missing environment variables.

## Solution

### Step 1: Get Supabase Keys

First, we need to check if Supabase is running and get the keys. There's a .env file encoding issue, so let's try a different approach:

**Option A: Check if Supabase is running**
```powershell
# Check if Supabase is running on port 54321
Test-NetConnection -ComputerName localhost -Port 54321
```

**Option B: Start Supabase if not running**
```powershell
npm run supabase:start
```

Wait for it to finish, then look for the output that shows:
- API URL: `http://127.0.0.1:54321`
- anon key: `eyJ...` (long string starting with eyJ)

### Step 2: Update the .env File

I've created `apps/mobile/.env` for you. Now you need to:

1. **Get your Supabase anon key:**
   - If Supabase is running, check the terminal output from `supabase:start`
   - Or open Supabase Studio: http://localhost:54323
   - Go to Settings > API
   - Copy the "anon public" key

2. **Edit `apps/mobile/.env`:**
   - Open `apps/mobile/.env`
   - Replace `your-anon-key-here` with your actual anon key

### Step 3: Restart Expo

After updating `.env`:
```powershell
# Stop Expo if running (Ctrl+C)
# Then restart:
npm run dev:mobile
```

### Step 4: Reload App in Emulator

- Press `r` in the Expo terminal to reload
- Or shake the emulator and tap "Reload"

## Alternative: Use Remote Supabase

If local Supabase isn't working, you can use a remote Supabase project:

1. Create a project at https://supabase.com/dashboard
2. Get your project URL and anon key
3. Update `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
   ```

## Verify It's Working

After restarting, check:
1. The app should show "OpenActive Demo" (or the name from database)
2. Check Expo terminal for: `[mobile] User found`
3. No error messages on screen

## Still Not Working?

Check the error message on screen - the app now shows detailed errors that will help identify the problem!



