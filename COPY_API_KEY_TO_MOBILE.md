# Copy API Key from Web App to Mobile App

## Problem
- ✅ Web app is working (loading name from database)
- ❌ Mobile app shows "Invalid API Key" error

## Solution: Copy the API Key

Since your web app is working, you already have the correct API key! Just copy it to the mobile app.

### Step 1: Get the API Key from Web App

The web app's API key is in: `apps/web/.env.local`

Open that file and find:
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy the entire key** (it's a long string starting with `eyJ...`)

### Step 2: Update Mobile App .env File

Open: `apps/mobile/.env`

It should currently have:
```env
EXPO_PUBLIC_SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Replace** `your-anon-key-here` with the actual key from the web app:
```env
EXPO_PUBLIC_SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (paste your key here)
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important:**
- Use the **same** `SUPABASE_ANON_KEY` from web app
- Make sure there are **no quotes** around the key
- Make sure there are **no spaces** around the `=` sign

### Step 3: Restart Metro Bundler

After updating `.env`:

1. **Stop Metro:** Press `Ctrl+C` in the Metro terminal
2. **Restart Metro:**
   ```powershell
   cd apps/mobile
   npx expo start
   ```
3. **Reload app:** Press `r` in Metro terminal, or press `a` to open Android

### Step 4: Verify It Works

After restarting, you should see:
- ✅ No error message
- ✅ App loads user data from database
- ✅ Shows the display name from database (not "OpenActive Demo")

## Quick Copy Method

If both files are open in VS Code:

1. Open `apps/web/.env.local`
2. Find `SUPABASE_ANON_KEY=...`
3. Copy the value (the part after `=`)
4. Open `apps/mobile/.env`
5. Replace `your-anon-key-here` with the copied value
6. Save both files
7. Restart Metro bundler

## Still Not Working?

1. **Check the key is correct:**
   - Should start with `eyJ...`
   - Should be very long (hundreds of characters)
   - No quotes, no spaces

2. **Verify .env file location:**
   - Should be: `apps/mobile/.env` (not `.env.local`)

3. **Make sure Metro was restarted:**
   - Environment variables are loaded when Metro starts
   - Just reloading the app (`r`) won't pick up new env vars

4. **Check Metro terminal:**
   - Should show: `[mobile] Supabase client initialized`
   - Should NOT show: "Invalid API key" error

