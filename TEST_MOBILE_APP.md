# Test Mobile App - Step by Step

## Current Status ✅
- ✅ Pixel 7 emulator is running
- ✅ `.env` file exists
- ⚠️ Supabase needs to be started

## Step 1: Start Supabase (Database)

Open a new terminal and run:
```powershell
npm run supabase:start
```

Wait for it to finish (first time takes 5-10 minutes). Look for output like:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGc... (long string)
```

## Step 2: Get Supabase Keys

After Supabase starts, run:
```powershell
npm run supabase:status
```

Copy the **anon key** from the output.

## Step 3: Update Mobile App .env

Edit `apps/mobile/.env` and make sure it has:

```env
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important:** Use `10.0.2.2` for Android emulator (not `127.0.0.1`)

## Step 4: Build and Run the App

Once Supabase is running and `.env` is updated:

```powershell
npm run mobile:android
```

This will:
1. Build the native Android app (first time: 5-10 minutes)
2. Install it on your Pixel 7 emulator
3. Start Metro bundler
4. Launch the app

## Step 5: Verify It Works

You should see:
- App opens on emulator
- Shows "openactive" title
- Shows "OpenActive Demo" (or name from database)
- Shows "@demo.user"

If you see an error, check the Metro bundler terminal for details.

## Quick Commands

```powershell
# Check emulator
adb devices

# Start Supabase
npm run supabase:start

# Get Supabase keys
npm run supabase:status

# Build and run app
npm run mobile:android

# Just start Metro (after first build)
npm run dev:mobile
```

## Troubleshooting

**"Supabase configuration missing"**
- Check `apps/mobile/.env` exists
- Make sure anon key is set
- Restart Metro after changing .env

**"User not found"**
- Make sure Supabase is running
- Check database has seed data: Open Supabase Studio (http://localhost:54323)
- Run: `npm run supabase:reset` to reseed

**Build fails**
- Make sure emulator is fully booted
- Check Java is installed: `java -version`
- Clean build: `cd apps/mobile/android && .\gradlew clean`

