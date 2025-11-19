# Your Supabase Setup

## Your Project Details

From your connection string, I can see:
- **Project Reference:** `buahkjwwahvnpjlkvnjv`
- **Project URL:** `https://buahkjwwahvnpjlkvnjv.supabase.co`
- **Database Host:** `db.buahkjwwahvnpjlkvnjv.supabase.co`

## Next Steps

### 1. Get Your API Keys

1. Go to: https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv
2. Click **Settings** (gear icon) → **API**
3. Copy:
   - **anon public key** (for both web and mobile)
   - **service_role key** (for web app server-side only)

### 2. Update Web App Config

Edit `apps/web/.env.local`:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co
SUPABASE_ANON_KEY=paste-your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=paste-your-service-role-key-here
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

### 3. Update Mobile App Config

Edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

### 4. Set Up Database

1. Go to: https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv
2. Click **SQL Editor** → **New Query**
3. Copy ALL contents from `SETUP_REMOTE_SUPABASE.sql`
4. Paste and click **"Run"**

This creates:
- User table
- Permissions
- Demo user (`demo.user`)

### 5. Test!

**Web:**
```powershell
npm run dev:web
```

**Mobile:**
```powershell
npm run mobile:android
```

## Quick Links

- **Dashboard:** https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv
- **API Settings:** https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/settings/api
- **SQL Editor:** https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/sql

