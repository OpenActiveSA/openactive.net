# Test Your Web App

## ✅ Web App is Running!

Your Next.js app is running at:
- **Local:** http://localhost:3000
- **Network:** http://192.168.0.104:3000

## What to Check

### 1. Open the App

Open your browser and go to: **http://localhost:3000**

### 2. What You Should See

You should see:
- **Title:** "frontend"
- **Name:** "OpenActive Demo" (or name from database)
- **Username:** "@demo.user"
- **Version:** at the bottom

### 3. If You See an Error

**"Unable to load live data. Showing fallback content."**
- This means the app can't connect to Supabase
- Check that `apps/web/.env.local` has the correct keys
- Make sure you pasted the **anon key** and **service_role key**

**"Supabase configuration missing"**
- Check `apps/web/.env.local` exists
- Make sure all variables are set:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**"User not found"**
- Database might not have the demo user
- Run the SQL setup (see below)

### 4. Check Console Logs

In the terminal where the app is running, look for:
- `[Supabase] Mode: remote, Key: service role` ✅ Good!
- `[web] User found` ✅ Success!
- `[web] Database query failed` ❌ Check your keys

### 5. Set Up Database (If Not Done)

If you see "User not found", set up the database:

1. Go to: https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/sql
2. Click **"New query"**
3. Copy ALL contents from `SETUP_REMOTE_SUPABASE.sql`
4. Paste and click **"Run"**

This creates the User table and demo user.

## Next: Test Mobile App

Once web app is working, test mobile:

```powershell
npm run mobile:android
```

Make sure `apps/mobile/.env` has:
- `EXPO_PUBLIC_SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`

