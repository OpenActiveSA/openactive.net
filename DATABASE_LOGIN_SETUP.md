# Database Setup for Login/Authentication

This guide will help you set up your Supabase database for working login functionality.

## Quick Setup

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/sql
   - Click "New Query"

2. **Run the Setup Script**
   - Open `SETUP_LOGIN_DATABASE.sql`
   - Copy ALL contents
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

3. **Verify Setup**
   - Check if the User table exists and is linked to auth.users
   - Verify RLS policies are in place
   - Test creating a user via Supabase Auth

## What This Setup Does

### 1. Links Custom User Table with Supabase Auth
- Changes `User.id` to reference `auth.users(id)`
- Creates automatic sync between auth users and User profiles
- Triggers create/update User profile when auth user is created

### 2. Creates Helper Functions
- `handle_new_user()` - Auto-creates User profile when auth user signs up
- `update_last_login()` - Updates last login timestamp
- `get_user_by_email()` - Helper to fetch user by email
- `user_exists()` - Check if user exists

### 3. Sets Up Row Level Security (RLS)
- Users can view their own data
- Authenticated users can view all users (adjustable)
- Users can update their own data
- Service role bypasses RLS for server operations

### 4. Grants Permissions
- Authenticated users: SELECT, UPDATE
- Anonymous users: SELECT (for public read)
- Service role: Full access

## How Authentication Works

### Registration Flow
1. User signs up via `supabase.auth.signUp({ email, password })`
2. Supabase creates user in `auth.users` table
3. Trigger automatically creates User profile in `public."User"` table
4. User receives email confirmation (if enabled)

### Login Flow
1. User calls `supabase.auth.signInWithPassword({ email, password })`
2. Supabase validates credentials against `auth.users`
3. On success, returns session token
4. You can manually call `update_last_login()` to track login time

### User Profile Sync
- User profile is automatically synced with auth users
- Email, displayName, and username are synced on creation
- You can manually update profile via User table

## Testing the Setup

### 1. Create a Test User via Supabase Dashboard
- Go to Authentication → Users
- Click "Add User" → "Create new user"
- Enter email and password
- Check if User profile was auto-created

### 2. Test via API
```typescript
// Registration
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
});

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});
```

## Next Steps

1. ✅ Database is now ready for login
2. ⏭️ Update AuthScreen component to use Supabase Auth
3. ⏭️ Implement registration flow
4. ⏭️ Implement login flow
5. ⏭️ Add session management
6. ⏭️ Add protected routes

## Important Notes

- **Password Security**: Supabase handles password hashing automatically - never store plain passwords
- **User ID**: User.id now matches auth.users(id) - use this for linking
- **RLS Policies**: Adjust policies based on your app's security needs
- **Email Confirmation**: Can be enabled/disabled in Supabase Auth settings

## Troubleshooting

### User profile not created
- Check if trigger `on_auth_user_created` exists
- Verify function `handle_new_user()` is working
- Check Supabase logs for errors

### RLS blocking access
- Verify user is authenticated: `auth.uid()` should return user ID
- Check policy conditions match your use case
- Service role bypasses RLS - use for server-side operations

### Email already exists
- Check if user exists in both `auth.users` and `public."User"`
- Delete from both tables if needed for testing
- Supabase Auth has built-in duplicate prevention


