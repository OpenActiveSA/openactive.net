# Adding Passwords to Existing Users

If you have existing users in your `User` table but they don't have passwords set (or don't have auth accounts), you can add passwords using one of the methods below.

## Quick Method: Using the Script

### Step 1: Install Dependencies (if needed)

```bash
cd apps/web
npm install dotenv @supabase/supabase-js
```

### Step 2: Set Password for a Single User

```bash
node ../../scripts/set-user-password-simple.js <email> <password>
```

**Example:**
```bash
node ../../scripts/set-user-password-simple.js demo.user@example.com MyPassword123
```

### Step 3: Verify Password Works

The user can now login at `/login/email` with their email and the password you set.

## Method 2: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** if the user doesn't exist in auth.users
3. Enter the email address
4. Enter a temporary password
5. Check **"Auto Confirm User"**
6. Click **"Create User"**

Or for existing auth users:
1. Find the user in the list
2. Click on the user
3. Click **"Reset Password"** or use **"Update User"** to set password
4. Enter new password

## Method 3: SQL Query to Check User Status

Run this SQL in Supabase SQL Editor to see which users need passwords:

```sql
-- Check which users don't have auth accounts or passwords
SELECT 
    u.id,
    u.email,
    u."displayName",
    u.username,
    CASE 
        WHEN au.id IS NULL THEN '❌ No Auth Account'
        WHEN au.encrypted_password IS NULL THEN '⚠️ No Password Set'
        ELSE '✅ Password Set'
    END AS auth_status
FROM public."User" u
LEFT JOIN auth.users au ON u.id::text = au.id::text
ORDER BY u."createdAt" DESC;
```

## Understanding the Flow

1. **User Table (`public."User"`)**: Stores user profiles (display name, username, etc.)
2. **Auth Table (`auth.users`)**: Stores authentication data (email, password hash, etc.)
3. **The Connection**: When a user signs up, a trigger creates a profile in the `User` table

For existing users:
- If they exist in `User` table but not in `auth.users`: Create auth account
- If they exist in both but no password: Update auth account with password
- Our script handles both cases automatically

## Troubleshooting

### Error: "User not found in database"
- Make sure the user exists in the `User` table first
- Check the email spelling (it's case-insensitive)

### Error: "Invalid email or password" when logging in
- Make sure you set the password correctly
- Check that email confirmation is enabled (the script does this automatically)
- Try resetting the password again

### Error: "User already exists"
- The user already has an auth account
- Use the update function instead, or reset password via dashboard

## Security Notes

- **Service Role Key**: The script uses the service role key which has full access
- **Keep it Secret**: Never commit `.env.local` to git
- **Passwords**: Users should change passwords after first login
- **Password Reset**: Users can use "Forgot Password" to reset their own passwords later


