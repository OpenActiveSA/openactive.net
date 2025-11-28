# Quick Start Guide - Metro Bundler

## If Metro is Slow

### Option 1: Clear Cache and Restart (Recommended)
```powershell
cd apps/mobile
npx expo start --clear
```

### Option 2: Use Tunnel Mode (if local network is slow)
```powershell
npx expo start --tunnel
```

### Option 3: Skip Type Checking (faster startup)
```powershell
npx expo start --no-dev --minify
```

### Option 4: Use Web First (fastest for testing)
```powershell
npx expo start --web
```

## Normal Startup Times
- First time: 30-60 seconds (building cache)
- Subsequent: 10-20 seconds
- If taking > 2 minutes: Something is wrong

## What Metro Does on Startup
1. Scans all files in your project
2. Processes SVG files with transformer
3. Builds dependency graph
4. Starts HTTP server
5. Shows QR code and options

## If It's Still Slow
1. Check if antivirus is scanning node_modules
2. Close other heavy applications
3. Check disk space (need ~500MB free)
4. Try restarting your computer

## Skip Metro Entirely (Direct Android Build)
If you just want to test the app without Metro:
```powershell
cd apps/mobile
npx expo run:android
```
This builds and runs directly (takes 5-10 min first time, but no Metro needed)





