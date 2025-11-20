# Connect App to Metro Bundler

## Current Status ✅
- Metro bundler is running successfully
- Android emulator is open
- App is showing splash screen (waiting to connect)

## Quick Fix

In the Metro terminal (where you see the QR code), press:

**`a`** - This will open/connect the app on Android

## What Should Happen

After pressing `a`:
1. Metro will try to connect to the Android emulator
2. You'll see "Bundling..." in the terminal
3. Then "Bundled" when done
4. The app should load in the emulator

## If Pressing 'a' Doesn't Work

### Option 1: Reload the App
In the Metro terminal, press:
- **`r`** - Reload the app

### Option 2: Open Developer Menu
In the emulator:
- Press `Ctrl+M` (or shake the device)
- Tap "Reload"

### Option 3: Check Connection
Make sure the emulator can see Metro:
1. In Metro terminal, you should see connection attempts
2. Check for any error messages
3. The URL should match: `http://192.168.0.104:8081`

## Troubleshooting

If the app still shows white screen after pressing `a`:

1. **Check Metro terminal for errors:**
   - Look for red error messages
   - Check if bundling completed

2. **Try manual reload:**
   - In Metro: Press `r`
   - In emulator: Shake device → Reload

3. **Restart connection:**
   - Stop Metro: `Ctrl+C`
   - Restart: `npx expo start`
   - Press `a` again

## Expected Result

After connecting, you should see:
- ✅ Dark blue screen (not white)
- ✅ "OPENACTIVE" title
- ✅ "MOBILE" subtitle
- ✅ Loading spinner or content

