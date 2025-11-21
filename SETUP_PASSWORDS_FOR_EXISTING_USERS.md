# Setting Passwords for Existing Users

Since Supabase stores passwords in `auth.users` (not in the `User` table), we need to use the Supabase Admin API to set passwords for existing accounts.

## Method 1: Using Supabase Admin API (Recommended)

### Step 1: Create a Migration Script

Create a script to set passwords for existing users. You can run this as a one-time migration.

### Step 2: Use Supabase Dashboard

1. **Go to Supabase Dashboard** → **Authentication** → **Users**
2. Find the user you want to set a password for
3. Click on the user
4. Click **"Reset Password"** or **"Send Password Reset Email"**
5. User will receive an email to set their password

### Step 3: Or Use Admin API Directly

Use the Supabase Admin API to create/update auth users and set passwords programmatically.

## Method 2: SQL Script to Identify Users Without Auth Accounts

Run this SQL to see which users don't have corresponding auth.users entries:

```sql
-- Find users in User table without corresponding auth.users
SELECT 
    u.id,
    u.email,
    u."displayName",
    u.username,
    CASE 
        WHEN au.id IS NULL THEN 'No Auth Account'
        WHEN au.encrypted_password IS NULL THEN 'No Password Set'
        ELSE 'Password Set'
    END AS auth_status
FROM public."User" u
LEFT JOIN auth.users au ON u.id::text = au.id::text
ORDER BY u."createdAt" DESC;
```

## Method 3: Admin Script to Set Passwords

We'll create a Node.js script that uses the Supabase Admin API to set passwords for existing users.


