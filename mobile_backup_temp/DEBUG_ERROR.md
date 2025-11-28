# Debugging the Error Screen

## Current Issue
The app is showing an error screen with an "up arrow" icon (reload button).

## How to See the Actual Error

### Option 1: Shake Device/Emulator
1. **On Emulator:** Press `Ctrl+M` (Windows) or `Cmd+M` (Mac)
2. **On Physical Device:** Shake the device
3. This opens the **Developer Menu**
4. Tap **"Show Element Inspector"** or **"Debug"** to see errors

### Option 2: Check Metro Bundler Terminal
Look at the terminal where Metro is running - it should show red error messages with the actual JavaScript error.

### Option 3: Check Logcat
```powershell
adb logcat | Select-String "ReactNativeJS|Error|Exception"
```

## Common Causes

### 1. Missing Supabase Configuration
If `.env` file is missing or has invalid values:
- Create `apps/mobile/.env` with:
  ```
  EXPO_PUBLIC_SUPABASE_URL=your-url
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
  ```

### 2. JavaScript Error
- Check Metro bundler output for red errors
- Look for import errors, undefined variables, etc.

### 3. Metro Connection Issue
- Make sure Metro is running on port 8081
- Try reloading: Shake device → "Reload"

## Quick Fixes

1. **Reload the app:**
   - Shake device → "Reload"
   - Or press `r` in Metro terminal

2. **Clear cache and restart:**
   ```powershell
   npx expo start --clear
   ```

3. **Check if Metro is serving:**
   - Open browser: `http://localhost:8081`
   - Should see Metro bundler page

## Next Steps

1. **Get the actual error message** using one of the methods above
2. **Share the error** so we can fix it
3. **Most likely:** Missing or invalid Supabase config

