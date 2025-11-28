# Simple Build Status - Use ONE Terminal

## Quick Check (Run this in ONE terminal)

```powershell
cd C:\laragon\www\openactive.net\apps\mobile
.\check-build.ps1
```

This shows:
- ✓ If build is running
- ✓ If APK was created
- ✓ Current status

## Or Just Check the File

The build is done when this file exists:
```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Close Extra Terminals

You can close all terminal windows except:
1. **Metro bundler** (if running) - shows QR code
2. **One terminal** for running commands

## Current Status

Based on last check:
- ✅ Build is RUNNING (8 Java processes active)
- ⏳ APK not ready yet (still building)
- ⏳ Wait 3-5 more minutes

## When Build Completes

You'll see:
- ✅ APK file created
- ✅ App launches automatically on emulator
- ✅ You can test SVG functionality

## If You Want to See Live Progress

In ONE terminal, run:
```powershell
cd C:\laragon\www\openactive.net\apps\mobile\android
.\gradlew app:assembleDebug
```

This shows live output. Press Ctrl+C to stop if needed.





