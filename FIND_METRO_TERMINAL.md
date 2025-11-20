# How to Find the Metro Bundler Terminal

## What is Metro Bundler?
Metro is the JavaScript bundler that Expo uses. It runs in a terminal window and shows:
- Bundle status
- Error messages
- Connection info
- Reload commands

## Where to Find It

### Option 1: Look for the Terminal Window
The Metro bundler runs in **the terminal window where you started the app**. Look for a terminal/command prompt window that shows:

```
> npm run dev:mobile

> mobile@1.0.0 start
> expo start

Starting Metro Bundler...
```

### Option 2: Check All Open Terminal Windows
1. Look at your taskbar for terminal windows (PowerShell, CMD, or VS Code Terminal)
2. Check each one - the Metro terminal will show Expo/React Native output
3. You should see text like:
   - "Metro waiting on..."
   - "Bundling..."
   - "Bundled"
   - QR code or connection info

### Option 3: Start It Fresh
If you can't find it or it's not running:

1. **Open a new terminal/PowerShell window**
2. **Navigate to your project:**
   ```powershell
   cd C:\laragon\www\openactive.net
   ```

3. **Start Metro:**
   ```powershell
   npm run dev:mobile
   ```

4. **You should see output like:**
   ```
   > mobile@1.0.0 start
   > expo start

   Starting Metro Bundler...
   Metro waiting on exp://192.168.x.x:8081
   ```

## What to Look For in Metro Terminal

### ✅ Good Signs:
- "Metro waiting on..."
- "Bundling..." then "Bundled"
- Connection info (IP address, port)
- No red error messages

### ❌ Bad Signs:
- Red error messages
- "Unable to connect"
- "Module not found"
- "Syntax error"
- Terminal is stuck/frozen

## If Metro Isn't Running

1. **Check if it's running in background:**
   - Look for Node.js processes in Task Manager
   - You might have many Node processes (that's normal)

2. **Start it:**
   ```powershell
   cd C:\laragon\www\openactive.net
   npm run dev:mobile
   ```

3. **Wait for it to start:**
   - First time can take 30-60 seconds
   - You'll see "Starting Metro Bundler..."
   - Then connection info

## Common Metro Terminal Locations

- **VS Code:** Bottom panel, "Terminal" tab
- **PowerShell:** Separate window you opened
- **Command Prompt:** Separate window you opened
- **Windows Terminal:** Tab in your terminal app

## Quick Test

To verify Metro is working, in the Metro terminal, press:
- `r` - Reload app
- `m` - Toggle menu
- You should see the command execute

If nothing happens when you press keys, that terminal might not be the Metro terminal.

## Still Can't Find It?

1. **Close all terminals**
2. **Open a fresh PowerShell/terminal**
3. **Run:**
   ```powershell
   cd C:\laragon\www\openactive.net
   npm run dev:mobile
   ```
4. **Keep this terminal window open** - this is your Metro terminal!

