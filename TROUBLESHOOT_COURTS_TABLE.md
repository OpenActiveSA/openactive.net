# Troubleshooting Courts Table Creation

If you're getting "Courts table does not exist" errors even after running the migration, follow these steps:

## Step 1: Check Current Status

Run `CHECK_COURTS_TABLE_EXISTS.sql` to see what's actually in your database.

## Step 2: Run Step-by-Step Migration

Run `CREATE_COURTS_TABLE_STEP_BY_STEP.sql` - this version:
- Has better error messages
- Shows verification after each step
- Won't fail silently

## Step 3: Common Issues

### Issue: Transaction Rollback
**Symptom**: Migration runs but table doesn't appear
**Solution**: The step-by-step version doesn't use a transaction, so each step commits independently

### Issue: Permission Denied
**Symptom**: Error about permissions
**Solution**: Make sure you're running as a user with CREATE TABLE permissions (usually the postgres user or service role)

### Issue: Clubs Table Doesn't Exist
**Symptom**: Foreign key constraint error
**Solution**: Make sure the Clubs table exists first. Run:
```sql
SELECT * FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Clubs';
```

### Issue: Table Created But Not Visible
**Symptom**: Table exists but queries fail
**Possible Causes**:
1. **Schema issue**: Table might be in a different schema
   ```sql
   SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'Courts';
   ```

2. **RLS blocking access**: Check RLS policies
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'Courts';
   ```

3. **Case sensitivity**: PostgreSQL is case-sensitive with quoted identifiers
   - Table name must be exactly `"Courts"` (with quotes) or `courts` (without quotes)
   - Check: `SELECT * FROM "Courts";` vs `SELECT * FROM courts;`

## Step 4: Manual Creation (Last Resort)

If all else fails, try creating the table manually:

```sql
-- 1. Create enum
CREATE TYPE "SportType" AS ENUM (
    'TENNIS', 'PICKLEBALL', 'PADEL', 'TABLE_TENNIS', 
    'SQUASH', 'BADMINTON', 'BEACH_TENNIS', 'RACQUETBALL', 'REAL_TENNIS'
);

-- 2. Create table
CREATE TABLE "Courts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clubId" UUID NOT NULL REFERENCES "Clubs"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "sportType" "SportType" NOT NULL DEFAULT 'TENNIS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Courts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Courts_clubId_name_key" UNIQUE ("clubId", "name")
);

-- 3. Create indexes
CREATE INDEX "Courts_clubId_idx" ON "Courts"("clubId");
CREATE INDEX "Courts_sportType_idx" ON "Courts"("sportType");
CREATE INDEX "Courts_isActive_idx" ON "Courts"("isActive");

-- 4. Enable RLS
ALTER TABLE "Courts" ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policy
CREATE POLICY "Authenticated users can view all courts" ON "Courts"
    FOR SELECT
    TO authenticated
    USING (true);
```

## Step 5: Verify It Works

After creation, test with:
```sql
-- Should return 0 (no courts yet, but table exists)
SELECT COUNT(*) FROM "Courts";

-- Should show the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Courts';
```





