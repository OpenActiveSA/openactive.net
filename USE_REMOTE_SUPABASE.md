# Use Remote Supabase (Easier Setup!)

## Why Remote Supabase?

✅ **No Docker required** - Skip all the Docker setup  
✅ **No local environment issues** - No .env encoding problems  
✅ **Works immediately** - Just create project and get keys  
✅ **Free tier available** - Perfect for development  
✅ **Same experience** - Works exactly the same as local  

## Quick Setup (5 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `openactive-dev` (or any name)
   - **Database Password:** (choose a strong password - save it!)
   - **Region:** Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

### Step 2: Get Your Keys

Once project is ready:

1. Go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **anon public key** → `eyJ...` (long string)
   - **service_role key** → `eyJ...` (long string) - keep this secret!

### Step 3: Run Database Migrations

In your terminal:

```powershell
# Link to your remote project
npm run supabase:link

# When prompted, enter your project reference
# (found in your Supabase dashboard URL: https://supabase.com/dashboard/project/xxxxx)
```

Then push migrations:

```powershell
npm run supabase:db:push:remote
```

Or manually run the migration SQL in Supabase SQL Editor:
1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New query"**
3. Copy contents of `supabase/migrations/20251114190724_init_user_table.sql`
4. Paste and run
5. Copy contents of `supabase/migrations/20251115000000_allow_public_read_users.sql`
6. Paste and run

### Step 4: Seed the Database

Run the seed SQL in Supabase SQL Editor:
1. Go to **SQL Editor**
2. Copy contents of `supabase/seed.sql`
3. Paste and run

Or use Prisma:
```powershell
# Set DATABASE_URL in environment
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
npm run prisma:seed
```

### Step 5: Update Web App

Create/update `apps/web/.env.local`:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

### Step 6: Update Mobile App

Update `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

### Step 7: Test!

**Web:**
```powershell
npm run dev:web
```

**Mobile:**
```powershell
npm run mobile:android
```

## Benefits

- ✅ No Docker needed
- ✅ No local setup hassles
- ✅ Works on any device/network
- ✅ Easy to share with team
- ✅ Production-like environment
- ✅ Free tier: 500MB database, 50K API requests/month

## Database Connection String

For Prisma/other tools, use:
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

Find this in: **Settings → Database → Connection string → URI**

## That's It!

Much simpler than local setup. Just create project, get keys, update .env files, and you're done!

