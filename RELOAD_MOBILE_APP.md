# Reload Mobile App Manually

## The App is Running
The app is already installed and running on your emulator. You just need to reload it to connect to Metro.

## How to Reload

### Option 1: Shake Device Menu (Easiest)
1. In the Android emulator, press `Ctrl+M` (or `Cmd+M` on Mac)
2. This opens the developer menu
3. Tap **"Reload"**

### Option 2: Use ADB Command
Run this in a terminal:
```powershell
adb shell input keyevent 82
```
Then tap "Reload" in the menu that appears.

### Option 3: Double Tap R
1. Make sure the emulator window is focused
2. Press `R` twice quickly
3. This should reload the app

### Option 4: Restart Metro Connection
1. In Metro terminal, press `r` to reload
2. Or press `Ctrl+C` to stop Metro
3. Then restart: `npx expo start`
4. Press `a` again

## What Should Happen
After reloading, you should see:
- ✅ App connects to Metro
- ✅ "Bundling..." in Metro terminal
- ✅ "Bundled" when done
- ✅ App shows your data from database

## If Still Not Working
Check the Metro terminal for:
- Any error messages
- Connection attempts
- Bundle status

The app should reload and connect automatically!

