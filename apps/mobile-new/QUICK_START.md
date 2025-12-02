# Quick Start - Mobile App Development

## When You Come Back to Development

**Metro bundler needs to be running for your app to work!**

### Quick Start (2 ways):

#### Option 1: Use the Helper Script (Easiest)
Double-click or run:
```powershell
.\apps\mobile-new\start-metro.ps1
```

This script will:
- Check if Metro is already running
- Start Metro if it's not running
- Use a cleared cache for fresh start

#### Option 2: Manual Start
```powershell
cd apps\mobile-new
npx expo start --clear
```

### Check if Metro is Running

Run this command to check:
```powershell
netstat -ano | findstr ":8081" | findstr "LISTENING"
```

If you see output, Metro is running ✅  
If no output, Metro is not running ❌

### What Happens When You Close Cursor

- ✅ Your code changes are saved
- ❌ Metro bundler processes are killed
- ❌ App loses connection to Metro

### When You Come Back

1. **Always start Metro first** (use script above)
2. **Wait for Metro to show**: "Metro waiting on exp://..."
3. **Then reload your app** in the emulator

### Tips

- Keep Metro terminal window open while developing
- If app shows loading/white screen → Metro probably isn't running
- Reload app after starting Metro (press `R` twice in Metro terminal)


