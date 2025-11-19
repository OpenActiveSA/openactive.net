# Simple Setup Guide - OpenActive

**Goal:** One page pulling one name from the database.

## Quick Start

### 1. Start Local Database

```bash
# Start local Supabase (includes database)
npm run supabase:start
```

Wait for it to finish, then get your local credentials:
```bash
npm run supabase:status
```

Copy the **anon key** and **service_role key** from the output.

### 2. Configure Web App (Local)

Create `apps/web/.env.local`:

```env
# Use local Supabase
USE_LOCAL_SUPABASE=true

# Local Supabase URL (default)
SUPABASE_LOCAL_URL=http://127.0.0.1:54321

# Get these from: npm run supabase:status
SUPABASE_LOCAL_ANON_KEY=your-local-anon-key-here
SUPABASE_LOCAL_SERVICE_ROLE_KEY=your-local-service-role-key-here

# Optional: which user to display
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

### 3. Run Web App (Local)

```bash
npm run dev:web
```

Open http://localhost:3000 - you should see the name from the database!

### 4. Configure Mobile App (Local)

Create `apps/mobile/.env`:

```env
# For Expo Go on same computer or emulator
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321

# For physical phone, use your computer's local IP
# EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.XXX:54321

# Get this from: npm run supabase:status
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key-here

# Optional: which user to display
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important for Physical Phone:**
- Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Use that IP instead of `127.0.0.1`
- Make sure your phone and computer are on the same WiFi network

### 5. Run Mobile App

```bash
# Install dependencies first
cd apps/mobile
npm install
cd ../..

# Start Expo
npm run dev:mobile
```

- **Expo Go:** Scan QR code with Expo Go app
- **Phone Build:** Build APK/IPA and install on device

---

## Live/Production Setup

### 1. Create Remote Supabase Project

1. Go to https://supabase.com/dashboard
2. Create new project (e.g., `openactive-prod`)
3. Wait for project to be ready
4. Go to **Settings > API**
5. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Run Migrations on Remote Database

```bash
# Link to your remote project
npm run supabase:link <your-project-ref>

# Push migrations
npm run supabase:db:push:remote

# Seed the database
npm run supabase:db:push:remote
# Then manually run the seed SQL in Supabase SQL Editor, or:
npm run prisma:seed  # if using Prisma
```

### 3. Configure Web App (Live)

**For Vercel/Netlify/etc:**
Set these environment variables in your hosting platform:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

**For local testing with remote database:**
Create `apps/web/.env.local`:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key
NEXT_PUBLIC_DEMO_USERNAME=demo.user
```

### 4. Configure Mobile App (Live)

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**For EAS Build (phone builds):**
These environment variables will be included in your build automatically.

---

## Verify Everything Works

### Web App
1. Start: `npm run dev:web`
2. Open: http://localhost:3000
3. Should see: "OpenActive Demo" (or the name from database)
4. Check console for: `[web] User found`

### Mobile App (Expo Go)
1. Start: `npm run dev:mobile`
2. Scan QR code with Expo Go
3. Should see: "OpenActive Demo" (or the name from database)
4. Check console for: `[mobile] User found`

### Mobile App (Phone Build)
1. Build: `npm run mobile:android` or `npm run mobile:ios`
2. Install APK/IPA on device
3. Open app
4. Should see: name from database

---

## Troubleshooting

### "Supabase configuration missing"
- Check your `.env.local` file exists
- Verify all required variables are set
- Restart dev server after changing env vars

### "User not found"
- Check database has seed data: `npm run supabase:status` → open Studio
- Verify username matches: `demo.user`
- Check RLS policies allow reading

### Mobile app can't connect (Expo Go)
- **Same computer/emulator:** Use `http://127.0.0.1:54321`
- **Physical phone:** Use your computer's local IP (e.g., `http://192.168.1.100:54321`)
- Make sure phone and computer are on same WiFi
- Check firewall isn't blocking port 54321

### Mobile app can't connect (Phone Build)
- Make sure you're using remote Supabase URL (not localhost)
- Verify `EXPO_PUBLIC_*` variables are set
- Rebuild app after changing env vars

---

## Database Seed Data

The seed data creates a demo user:
- **Email:** `demo@openactive.local`
- **Username:** `demo.user`
- **Display Name:** `OpenActive Demo`

To verify seed data exists:
```bash
npm run supabase:status
# Open Supabase Studio URL
# Check "User" table
```

To reset and reseed:
```bash
npm run supabase:reset
```

---

## Summary

✅ **Web App** → Connects directly to Supabase database  
✅ **Mobile App** → Connects directly to Supabase database  
✅ **Local** → Uses local Supabase instance  
✅ **Live** → Uses remote Supabase project  
✅ **One Page** → Shows one name from database  

That's it! Simple and working. 🎉



