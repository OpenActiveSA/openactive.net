# Quick Setup: Remote Supabase (5 Minutes)

## Step 1: Create Supabase Project

1. Go to: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `openactive-dev`
   - **Database Password:** (save this!)
   - **Region:** Closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes

## Step 2: Run Database Setup

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy **ALL** contents from `SETUP_REMOTE_SUPABASE.sql`
4. Paste into SQL Editor
5. Click **"Run"** (or press F5)

This creates:
- User table
- Permissions
- Demo user data

## Step 3: Get Your Keys

1. Go to **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJ...` (long string)

## Step 4: Update Mobile App

Edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

## Step 5: Update Web App (Optional)

Edit `apps/web/.env.local`:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

## Step 6: Test!

**Mobile:**
```powershell
npm run mobile:android
```

**Web:**
```powershell
npm run dev:web
```

## That's It! 🎉

No Docker, no local setup, just works!

