# Get Supabase Credentials from Dashboard

## Step 1: Go to Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project (or create a new one if needed)

## Step 2: Get Your Project URL and Keys

1. In your project dashboard, click **Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. You'll see:

### Project URL
```
https://xxxxx.supabase.co
```
Copy this - this is your `SUPABASE_URL`

### API Keys
You'll see two keys:

**1. anon public key** (safe for client-side)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.xxxxx
```
Copy this - this is your `SUPABASE_ANON_KEY`

**2. service_role key** (⚠️ KEEP SECRET - server-side only)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.xxxxx
```
Copy this - this is your `SUPABASE_SERVICE_ROLE_KEY` (for web app server-side)

## Step 3: Set Up Web App

Create/update `apps/web/.env.local`:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=paste-your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=paste-your-service-role-key-here
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

## Step 4: Set Up Mobile App

Create/update `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

## Step 5: Set Up Database

Make sure your database has the User table and demo data:

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy ALL contents from `SETUP_REMOTE_SUPABASE.sql`
4. Paste and click **"Run"**

This creates:
- User table
- Permissions
- Demo user (`demo.user`)

## Step 6: Test!

**Web:**
```powershell
npm run dev:web
```

**Mobile:**
```powershell
npm run mobile:android
```

## Quick Checklist

- [ ] Got Project URL from Supabase
- [ ] Got anon key from Supabase
- [ ] Got service_role key from Supabase
- [ ] Created `apps/web/.env.local` with all keys
- [ ] Created `apps/mobile/.env` with URL and anon key
- [ ] Ran SQL setup in Supabase SQL Editor
- [ ] Tested web app
- [ ] Tested mobile app

