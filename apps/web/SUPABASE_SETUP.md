# Supabase Environment Setup Guide

This guide explains how to manage separate Supabase projects for local/test and production environments using the free tier.

## Strategy Overview

**Free Tier Approach:**
- Create **separate Supabase projects** for development and production
- Use **environment variables** to switch between them
- Each project gets its own database, auth, and storage

## Step 1: Create Supabase Projects

1. **Development/Test Project:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project (e.g., `openactive-dev` or `openactive-test`)
   - Note: Free tier allows multiple projects

2. **Production Project:**
   - Create another project (e.g., `openactive-prod`)
   - This will be used for your live application

## Step 2: Get Your Credentials

For each project, get the following from **Settings > API**:

- **Project URL** → `SUPABASE_URL`
- **anon/public key** → `SUPABASE_ANON_KEY` (safe for client-side)
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ **KEEP SECRET!** - server-side only)

## Step 3: Configure Environment Variables

### Local Development

Create `apps/web/.env.local`:

```env
# Development/Test Supabase Project
SUPABASE_URL=https://your-dev-project-id.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key-here

NODE_ENV=development
```

### Production

Set these in your hosting platform (Vercel, Netlify, etc.):

```env
# Production Supabase Project
SUPABASE_URL=https://your-prod-project-id.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key-here

NODE_ENV=production
```

## Step 4: Using the Supabase Client

### Server-Side (API Routes, Server Components)

```typescript
import { getSupabaseServerClient } from '@/lib/supabase';

const supabase = getSupabaseServerClient();
// Uses SERVICE_ROLE_KEY - bypasses Row Level Security
```

### Client-Side (Browser Components)

```typescript
import { getSupabaseClientClient } from '@/lib/supabase';

const supabase = getSupabaseClientClient();
// Uses ANON_KEY - respects Row Level Security
```

## Best Practices

### 1. **Never Commit Secrets**
- Add `.env.local` to `.gitignore`
- Use `.env.example` as a template (without real keys)

### 2. **Use Service Role Key Carefully**
- Only use `SUPABASE_SERVICE_ROLE_KEY` on the server
- It bypasses Row Level Security (RLS)
- Never expose it in client-side code

### 3. **Row Level Security (RLS)**
- Enable RLS on your tables in Supabase
- Use policies to control access
- Test RLS policies in your dev project

### 4. **Database Migrations**
- Use Prisma for schema management
- Run migrations on both dev and prod projects
- Keep schemas in sync

### 5. **Testing**
- Use your dev/test project for all testing
- Never run tests against production
- Consider a third project for CI/CD if needed

## Environment Detection

The `getSupabaseClient()` function automatically:
- Uses the correct credentials based on environment variables
- Logs which environment is being used (development only)
- Throws clear errors if configuration is missing

## Troubleshooting

### "Supabase configuration missing" Error
- Check that all environment variables are set
- Verify `.env.local` exists in `apps/web/`
- Restart your dev server after changing env vars

### Wrong Project Being Used
- Verify `SUPABASE_URL` matches the project you want
- Check that you're using the correct `.env` file
- Clear Next.js cache: `rm -rf .next`

### RLS Policies Not Working
- Ensure you're using `ANON_KEY` on client-side
- Check RLS is enabled in Supabase Dashboard
- Verify policies are correctly configured

## Free Tier Limits

- **Projects:** Multiple projects allowed
- **Database Size:** 500 MB per project
- **Bandwidth:** 5 GB per month per project
- **API Requests:** 50,000 per month per project

For production, monitor usage and upgrade if needed.


