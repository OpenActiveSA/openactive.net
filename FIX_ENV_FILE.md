# Fix .env File Encoding Issue

## Problem
The `.env` file has encoding issues (unexpected character '»') that prevents Supabase from starting.

## Solution

The `.env` file in the root directory needs to be fixed. I've updated it to:
1. Fix encoding issues
2. Update database name from `penactive_dev` to `openactive_dev`

## If Supabase Still Won't Start

If you still get encoding errors, try:

1. **Close any editors** that have `.env` open
2. **Delete and recreate** the file:

```powershell
# Backup first
Copy-Item ".env" ".env.backup"

# Create new clean .env
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openactive_dev?schema=public
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/openactive_dev?schema=public
"@ | Out-File ".env" -Encoding utf8 -NoNewline
```

3. **Try starting Supabase again:**
```powershell
npm run supabase:start
```

## Alternative: Skip .env for Supabase

Supabase CLI doesn't actually need the root `.env` file - it uses its own config. You can:

1. **Rename the problematic .env:**
```powershell
Rename-Item ".env" ".env.old"
```

2. **Start Supabase:**
```powershell
npm run supabase:start
```

The root `.env` is mainly for Prisma, not Supabase CLI.

