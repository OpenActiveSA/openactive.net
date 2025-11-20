# Fix: PowerShell Command Parsing Errors with Metro

## Problem
When running `npm run dev:mobile`, PowerShell is trying to execute Metro's output as commands, causing errors like:
```
> : The term '>' is not recognized...
Starting : The term 'Starting' is not recognized...
```

## Solution: Run Metro Directly

Instead of using the npm script, run Expo directly from the mobile app directory:

### Option 1: Direct Command (Recommended)
```powershell
cd apps/mobile
npx expo start
```

### Option 2: Use CMD Instead of PowerShell
1. Open **Command Prompt** (not PowerShell)
2. Run:
```cmd
cd C:\laragon\www\openactive.net
npm run dev:mobile
```

### Option 3: Fix PowerShell Execution Policy
If you want to use PowerShell, try:
```powershell
cd apps/mobile
$env:FORCE_COLOR=0; npx expo start
```

## Quick Fix Steps

1. **Stop the current Metro** (if running):
   - Press `Ctrl+C` in the terminal

2. **Navigate to mobile app:**
   ```powershell
   cd C:\laragon\www\openactive.net\apps\mobile
   ```

3. **Start Metro directly:**
   ```powershell
   npx expo start
   ```

4. **You should see:**
   ```
   Starting Metro Bundler...
   Metro waiting on exp://192.168.x.x:8081
   ```

## Alternative: Use VS Code Terminal

VS Code's integrated terminal often handles this better:

1. Open VS Code
2. Open terminal (`` Ctrl+` ``)
3. Run:
   ```powershell
   cd apps/mobile
   npx expo start
   ```

## Why This Happens

PowerShell's command parser is interpreting the `>>` prompts from Metro bundler as PowerShell continuation prompts, causing it to try to execute the output as commands.

## After Metro Starts

Once Metro is running properly, you should see:
- ✅ "Metro waiting on exp://..."
- ✅ Connection info
- ✅ No red errors
- ✅ You can press `r` to reload, `m` for menu

Then your app should load in the emulator!

