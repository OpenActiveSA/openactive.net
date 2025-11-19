# Supabase CLI Setup Guide

This project uses the Supabase CLI for managing database schema, local development, and deployment.

## Prerequisites

- Docker Desktop installed and running (Supabase CLI uses Docker)
- Node.js 18.17+ installed
- Supabase CLI is installed as a dev dependency (`npm install`)

## Quick Start

### 1. Start Local Supabase

```bash
npm run supabase:start
```

This will:
- Start a local Supabase instance with all services
- Run migrations from `supabase/migrations/`
- Seed the database with `supabase/seed.sql`
- Display local credentials and URLs

**First run takes time** - Docker images are downloaded (~5-10 minutes).

### 2. Check Status

```bash
npm run supabase:status
```

This shows:
- All service URLs (API, DB, Studio, etc.)
- **Local credentials** (anon key, service role key)
- Database connection strings

**Important:** Copy the local keys to your `.env.local` if using `USE_LOCAL_SUPABASE=true`.

### 3. Configure Environment

Create `apps/web/.env.local`:

```env
USE_LOCAL_SUPABASE=true
SUPABASE_LOCAL_URL=http://127.0.0.1:54321
SUPABASE_LOCAL_ANON_KEY=eyJ... # from supabase:status
SUPABASE_LOCAL_SERVICE_ROLE_KEY=eyJ... # from supabase:status
```

Or use remote Supabase:

```env
USE_LOCAL_SUPABASE=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Access Services

After starting, you can access:

- **Supabase Studio**: http://localhost:54323 (Database GUI)
- **API**: http://127.0.0.1:54321
- **Database**: localhost:54322
- **Email Testing**: http://localhost:54324 (Inbucket)

## Project Structure

```
supabase/
├── config.toml          # Supabase configuration
├── migrations/          # Database migrations (SQL)
│   └── *.sql
├── seed.sql            # Seed data (runs on reset)
└── .gitignore         # Git ignore for Supabase
```

## Available Commands

### Local Development

```bash
# Start local Supabase
npm run supabase:start

# Stop local Supabase
npm run supabase:stop

# Check status and get credentials
npm run supabase:status

# Reset database (run migrations + seed)
npm run supabase:reset
```

### Migrations

```bash
# Create a new migration
npm run supabase:migration:new migration_name

# Apply pending migrations locally
npm run supabase:migration:up

# Apply migrations to remote (after linking)
npm run supabase:db:push:remote
```

### Linking to Remote Projects

```bash
# Link to a remote Supabase project
npm run supabase:link <project-ref>

# Push migrations to remote
npm run supabase:db:push:remote

# Or push to local
npm run supabase:db:push
```

## Workflow: Local Development

### Recommended Workflow

1. **Start local Supabase:**
   ```bash
   npm run supabase:start
   ```

2. **Set environment variables:**
   - Copy keys from `supabase:status` output
   - Add to `apps/web/.env.local`
   - Set `USE_LOCAL_SUPABASE=true`

3. **Develop your app:**
   ```bash
   npm run dev:web
   ```

4. **Make database changes:**
   ```bash
   # Create migration
   npm run supabase:migration:new add_user_preferences
   
   # Edit the migration file in supabase/migrations/
   # Then apply it
   npm run supabase:migration:up
   ```

5. **Sync with Prisma (if using both):**
   - Supabase migrations handle schema
   - Prisma handles ORM/type generation
   - Keep both in sync manually or use a sync script

## Workflow: Remote Projects

### Creating Remote Projects

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Create projects:**
   - `openactive-dev` (for development/testing)
   - `openactive-prod` (for production)

### Linking and Deploying

1. **Link to remote project:**
   ```bash
   npm run supabase:link <project-ref>
   ```
   Find `<project-ref>` in your Supabase Dashboard URL:
   `https://supabase.com/dashboard/project/<project-ref>`

2. **Push migrations:**
   ```bash
   npm run supabase:db:push:remote
   ```

3. **Get credentials:**
   - Go to Settings > API in Supabase Dashboard
   - Copy Project URL, anon key, service_role key
   - Set in your environment (`.env.local` for dev, hosting platform for prod)

## Integration with Prisma

This project uses both Supabase CLI and Prisma:

- **Supabase CLI**: Manages database schema, migrations, and Supabase-specific features (Auth, Storage, RLS)
- **Prisma**: Provides type-safe database access and ORM features

### Keeping Them in Sync

**Option 1: Supabase First (Recommended)**
1. Make schema changes in Supabase migrations
2. Run migrations: `npm run supabase:migration:up`
3. Update Prisma schema to match
4. Generate Prisma client: `npm run prisma:generate`

**Option 2: Prisma First**
1. Update `prisma/schema.prisma`
2. Generate migration: `npm run prisma:migrate`
3. Copy SQL to Supabase migration
4. Apply both

### Current Schema Alignment

The Supabase migration `20251114190724_init_user_table.sql` matches the Prisma schema `User` model, including:
- User table with all fields
- Role enum
- Indexes and constraints
- Row Level Security policies

## Troubleshooting

### Docker Not Running
```
Error: Docker is not running
```
**Solution:** Start Docker Desktop.

### Port Already in Use
```
Error: Port 54321 is already in use
```
**Solution:** 
- Stop existing Supabase: `npm run supabase:stop`
- Or change ports in `supabase/config.toml`

### Local Keys Not Working
**Solution:**
1. Check Supabase is running: `npm run supabase:status`
2. Copy fresh keys from status output
3. Update `.env.local`
4. Restart your app

### Migration Conflicts
**Solution:**
1. Check migration order (timestamps)
2. Review conflicts manually
3. Reset if needed: `npm run supabase:reset` (⚠️ deletes local data)

### Can't Connect to Local Supabase
**Solution:**
1. Verify Supabase is running: `npm run supabase:status`
2. Check `USE_LOCAL_SUPABASE=true` in `.env.local`
3. Verify URLs match (should be `http://127.0.0.1:54321`)

## Free Tier Strategy

Supabase free tier allows multiple projects:

1. **Local Development**: Use `supabase start` (unlimited)
2. **Test/Staging**: Create a free Supabase project
3. **Production**: Create another free Supabase project

Switch between them using environment variables:
- `USE_LOCAL_SUPABASE=true` → local instance
- `USE_LOCAL_SUPABASE=false` + `SUPABASE_URL=...` → remote project

## Next Steps

1. ✅ Supabase CLI installed
2. ✅ Project initialized
3. ✅ Migration created (aligned with Prisma)
4. ✅ Seed file created
5. ✅ NPM scripts added
6. 🔲 Start local Supabase: `npm run supabase:start`
7. 🔲 Link to remote projects: `npm run supabase:link`
8. 🔲 Deploy migrations: `npm run supabase:db:push:remote`

## Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
- [Migration Guide](https://supabase.com/docs/guides/cli/managing-environments)




