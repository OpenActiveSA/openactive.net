# Copy Supabase Credentials from Web to Mobile

## If Web App is Working

If your web app is already working with Supabase, you already have the credentials! Just copy them to the mobile app.

## Step 1: Check Web App .env.local

Open `apps/web/.env.local` and look for:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ... (long string)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (long string)
```

## Step 2: Copy to Mobile App

Create/update `apps/mobile/.env` with the **same** URL and **anon key**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ... (same anon key from web)
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important:**
- Use the **same** `SUPABASE_URL` from web app
- Use the **same** `SUPABASE_ANON_KEY` from web app (not service_role)
- Mobile app uses `EXPO_PUBLIC_` prefix (required for Expo)

## Step 3: Verify Database Has Data

Make sure your Supabase database has the demo user:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** → **User** table
4. Should see a user with username `demo.user`

If not, run the seed SQL (see `SETUP_REMOTE_SUPABASE.sql`)

## Step 4: Test Mobile App

```powershell
npm run mobile:android
```

## That's It!

Since web app is already working, mobile app should work too with the same credentials!

