# Hyper-V and Android Build Issues

## What This Command Does

```powershell
bcdedit /set hypervisorlaunchtype off
```

This disables Hyper-V hypervisor launch type, which can help with:
- Android emulator performance
- Android build issues
- Virtualization conflicts

## ⚠️ Important Warnings

1. **Requires Administrator Rights**
   - Must run PowerShell/Command Prompt as Administrator
   - Right-click → "Run as administrator"

2. **Requires Reboot**
   - Changes only take effect after restarting your computer
   - You'll need to reboot before testing

3. **May Affect Other Software**
   - Docker Desktop might need WSL 2 (which uses Hyper-V)
   - Windows Subsystem for Linux (WSL) might be affected
   - Other virtualization software might stop working

4. **Alternative Solutions First**
   - Try fixing the build error first
   - Use Expo Go for testing (doesn't need emulator)
   - Check if the issue is actually Hyper-V related

## When to Use This

Only disable Hyper-V if:
- ✅ Android emulator won't start
- ✅ Build fails with virtualization errors
- ✅ You've tried other solutions
- ✅ You don't need Docker/WSL for this project

## How to Disable Hyper-V

1. **Open PowerShell as Administrator**
   - Right-click Start menu
   - Click "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run the command:**
   ```powershell
   bcdedit /set hypervisorlaunchtype off
   ```

3. **Restart your computer**

4. **To re-enable later:**
   ```powershell
   bcdedit /set hypervisorlaunchtype auto
   ```
   (Then restart again)

## Alternative: Use Expo Go Instead

Since you're having build issues, consider using Expo Go for testing:
- No emulator needed
- No build required
- Works immediately
- Perfect for testing database connections

See `USE_EXPO_GO_FOR_NOW.md` for instructions.

## Check If Hyper-V is the Problem

Before disabling, check:
1. Does the emulator start? (`adb devices`)
2. Is the build error actually Hyper-V related?
3. Can you use Expo Go instead?

The build error you saw was a Kotlin compilation error, not necessarily Hyper-V related.

