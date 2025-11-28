# Connect Metro to Development Build

## Current Status ✅
- App is installed and running on emulator
- App is showing "Development servers" screen
- Waiting for Metro bundler to connect

## What to Do

### Option 1: Metro Should Auto-Connect
If Metro is running, the app should automatically detect it and show it in the list.

### Option 2: Start Metro Manually
In a terminal, run:
```powershell
cd apps/mobile
npx expo start --dev-client
```

### Option 3: Enter URL Manually
If Metro is running on a specific port:
1. Tap "Enter URL manually" in the app
2. Enter: `exp://YOUR_COMPUTER_IP:8081`
   - Replace `YOUR_COMPUTER_IP` with your computer's local IP
   - Or use `exp://localhost:8081` if on same machine

## What Happens Next

Once Metro connects:
- The app will load your JavaScript bundle
- You'll see your AuthScreen
- The app will be fully functional

## Quick Check

Run this to see if Metro is running:
```powershell
netstat -ano | Select-String "8081"
```

If you see port 8081 listening, Metro is running and should auto-connect!

