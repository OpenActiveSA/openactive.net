# Quick Start: Test Mobile App

## Fixed Issues ✅
- ✅ Renamed problematic `.env` file (Supabase CLI doesn't need it)
- ✅ Supabase is starting in the background

## Next Steps

### 1. Wait for Supabase to Start

Supabase is starting in the background. Wait 1-2 minutes, then check:

```powershell
npm run supabase:status
```

Look for:
- **API URL:** `http://127.0.0.1:54321`
- **anon key:** `eyJ...` (long string)

### 2. Update Mobile App .env

Once you have the anon key, update `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important:** Use `10.0.2.2` for Android emulator.

### 3. Build and Run App

```powershell
npm run mobile:android
```

This will:
- Build the app (first time: 5-10 minutes)
- Install on Pixel 7 emulator
- Launch the app

### 4. What You Should See

- App opens on emulator
- Shows "openactive" title
- Shows "OpenActive Demo" (from database)
- Shows "@demo.user"

## Quick Commands

```powershell
# Check Supabase status
npm run supabase:status

# Build and run app
npm run mobile:android

# Just start Metro (after first build)
npm run dev:mobile
```

## Troubleshooting

**"Supabase configuration missing"**
- Make sure `apps/mobile/.env` has the anon key
- Restart Metro after changing .env

**"User not found"**
- Check Supabase is running: `npm run supabase:status`
- Open Supabase Studio: http://localhost:54323
- Check User table has `demo.user`
- If empty, run: `npm run supabase:reset`

