# Troubleshooting Emulator Errors

## Common Issues and Solutions

### 1. "Something went wrong" Error

This usually means:
- Missing environment variables
- Can't connect to Supabase
- Database query failed

### 2. Check Environment Variables

Make sure you have `apps/mobile/.env` file with:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important:** After creating/updating `.env` file:
1. Stop Expo (Ctrl+C)
2. Restart: `npm run dev:mobile`
3. Reload app in emulator (press `r` in Expo terminal)

### 3. Android Emulator Special Case

**Android emulator cannot use `127.0.0.1` or `localhost`!**

The code now automatically converts `127.0.0.1` to `10.0.2.2` for Android emulators.

If you're still having issues, try:
```env
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
```

### 4. Get Your Supabase Keys

Run this to get your local Supabase credentials:
```bash
npm run supabase:status
```

Look for:
- **API URL:** `http://127.0.0.1:54321`
- **anon key:** `eyJ...` (long string)
- **service_role key:** `eyJ...` (long string)

Copy the **anon key** to your `.env` file.

### 5. Check Supabase is Running

```bash
npm run supabase:status
```

If it's not running:
```bash
npm run supabase:start
```

Wait for it to finish (first time takes 5-10 minutes).

### 6. Check Database Has Data

1. Run: `npm run supabase:status`
2. Open **Supabase Studio** URL (usually `http://localhost:54323`)
3. Go to **Table Editor** → **User** table
4. Should see a user with username `demo.user`

If no data:
```bash
npm run supabase:reset
```

### 7. Check Console Logs

In Expo terminal, look for:
- `[mobile] Supabase client initialized` - ✅ Config OK
- `[mobile] Fetching user from database` - ✅ Query started
- `[mobile] User found` - ✅ Success!
- `[mobile] Database query failed` - ❌ Check error details

### 8. Common Error Messages

**"Supabase configuration missing: EXPO_PUBLIC_SUPABASE_URL"**
- Create `apps/mobile/.env` file
- Add the environment variables
- Restart Expo

**"Database error: relation 'User' does not exist"**
- Run migrations: `npm run supabase:migration:up`
- Or reset: `npm run supabase:reset`

**"User not found: demo.user"**
- Check database has seed data
- Run: `npm run supabase:reset`

**"Network request failed" or "Connection refused"**
- Check Supabase is running: `npm run supabase:status`
- For Android emulator, make sure using `10.0.2.2` (auto-handled now)
- Check firewall isn't blocking port 54321

### 9. Step-by-Step Debug

1. **Verify Supabase is running:**
   ```bash
   npm run supabase:status
   ```

2. **Check environment variables:**
   ```bash
   # Make sure apps/mobile/.env exists
   cat apps/mobile/.env
   ```

3. **Verify database has data:**
   - Open Supabase Studio
   - Check User table has `demo.user`

4. **Check Expo logs:**
   - Look for error messages
   - Check what URL it's trying to connect to

5. **Try manual connection test:**
   - Open browser: `http://127.0.0.1:54321/rest/v1/User?username=eq.demo.user`
   - Should return JSON (might need auth header)

### 10. Still Not Working?

1. **Clear Expo cache:**
   ```bash
   cd apps/mobile
   npx expo start -c
   ```

2. **Reinstall dependencies:**
   ```bash
   cd apps/mobile
   rm -rf node_modules
   npm install
   ```

3. **Reset everything:**
   ```bash
   npm run supabase:stop
   npm run supabase:start
   npm run supabase:reset
   ```

4. **Check the error message in the app:**
   - The app now shows detailed error messages
   - Look at what it says on screen
   - Check console logs for more details

## Quick Checklist

- [ ] Supabase is running (`npm run supabase:status`)
- [ ] `apps/mobile/.env` file exists
- [ ] Environment variables are set correctly
- [ ] Database has seed data (check Supabase Studio)
- [ ] Expo restarted after creating `.env`
- [ ] App reloaded in emulator
- [ ] Checked console logs for errors

## Need More Help?

Check the console output - the app now shows detailed error messages that will help identify the exact problem!



