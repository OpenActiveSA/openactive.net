# Fix: White Screen with Arrow Icon

## Problem
The app shows a white screen with an upward-pointing arrow icon instead of the app content.

## What This Means
This is typically the **Expo splash screen**, which means:
- The app hasn't loaded yet, OR
- The app crashed during initialization, OR
- Metro bundler isn't running or connected

## Quick Fixes

### 1. Check Metro Bundler is Running
Make sure you have a terminal running:
```powershell
npm run dev:mobile
```

You should see:
- Metro bundler starting
- "Metro waiting on..."
- QR code or connection info

### 2. Reload the App
In the Expo terminal, press:
- `r` - Reload the app
- `m` - Toggle menu
- `Ctrl+C` - Stop and restart

Or in the emulator:
- Shake the device (or press `Ctrl+M` in emulator)
- Tap "Reload"

### 3. Clear Cache and Restart
```powershell
# Stop Metro (Ctrl+C)
# Then:
cd apps/mobile
npx expo start --clear
```

### 4. Check Console Logs
Look at the Metro bundler terminal for errors:
- Red error messages
- Yellow warnings
- Connection issues

### 5. Verify Environment Variables
Make sure `apps/mobile/.env` exists and has valid values:
```env
EXPO_PUBLIC_SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Important:** After updating `.env`, you MUST restart Metro bundler!

### 6. Check for JavaScript Errors
The app should show:
- Dark blue background
- "OPENACTIVE" title
- "MOBILE" subtitle
- Loading spinner or error message

If you see white screen, check Metro terminal for:
- Syntax errors
- Import errors
- Module not found errors

### 7. Rebuild if Needed
If nothing works, try a clean rebuild:
```powershell
cd apps/mobile
npx expo start --clear
# Then in emulator, reload the app
```

## What to Look For

**Good signs:**
- Metro bundler shows "Bundling..." then "Bundled"
- App shows dark blue screen with "OPENACTIVE" text
- Console shows `[mobile] App component mounted`

**Bad signs:**
- White screen stays forever
- Metro shows red errors
- "Unable to connect" messages
- App crashes immediately

## Still Not Working?

1. **Check the Metro terminal** - Look for error messages
2. **Check Android logcat** - Run: `adb logcat | grep -i error`
3. **Try Expo Go** - Install Expo Go app and scan QR code instead of emulator
4. **Restart everything:**
   - Close emulator
   - Stop Metro
   - Restart Metro: `npm run dev:mobile`
   - Reopen emulator

