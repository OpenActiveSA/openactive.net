# Fix Emulator "Offline" or Startup Issues

## Current Status
- ✅ Android SDK is installed: `C:\Users\Admin\AppData\Local\Android\Sdk`
- ⚠️ Emulator detected but shows as "offline": `emulator-5554   offline`

## Quick Fixes

### 1. Wait for Emulator to Fully Boot
The emulator can take 1-2 minutes to fully boot. Wait until:
- You see the Android home screen
- `adb devices` shows `device` instead of `offline`

### 2. Restart ADB Server
```powershell
adb kill-server
adb start-server
adb devices
```

### 3. If Emulator is Stuck, Restart It

**Option A: From Android Studio**
1. Open Android Studio
2. Go to **Tools > Device Manager**
3. Click the **Stop** button (square icon) if running
4. Click the **Play** button to start again

**Option B: From Command Line**
```powershell
# Kill any running emulator processes
taskkill /F /IM qemu-system-x86_64.exe
taskkill /F /IM emulator.exe

# Wait a few seconds, then start again
emulator -avd Medium_Phone_API_36.1
```

### 4. Check Emulator Logs
If the emulator window shows an error, check:
- **Hardware acceleration** - Make sure virtualization is enabled in BIOS
- **RAM allocation** - Emulator might need more RAM
- **Graphics driver** - Update your graphics drivers

### 5. Common Errors and Solutions

**"HAX is not working" or "VT-x is disabled"**
- Enable virtualization in BIOS
- For Intel: Install/update Intel HAXM
- For AMD: Enable Windows Hypervisor Platform

**"Emulator process was killed"**
- Allocate more RAM to the emulator in AVD settings
- Close other heavy applications
- Try a different system image (lower API level)

**"PANIC: Missing emulator engine program"**
- Reinstall Android Emulator from SDK Manager
- Check ANDROID_HOME environment variable

**Emulator is very slow**
- Enable hardware acceleration
- Use x86_64 system image (not ARM)
- Allocate more RAM (2GB+ recommended)

### 6. Verify Emulator is Working

Once the emulator shows as "device" (not "offline"):

```powershell
adb devices
# Should show:
# List of devices attached
# emulator-5554    device
```

### 7. If Still Not Working

Try creating a new emulator:
1. Open Android Studio
2. **Tools > Device Manager**
3. Click **Create Device**
4. Choose **Pixel 5** or **Pixel 6**
5. Select **API 33 (Android 13)** or **API 34 (Android 14)**
6. Use **x86_64** architecture
7. Finish and start it

## Quick Commands

```powershell
# Check emulator status
adb devices

# Restart ADB
adb kill-server
adb start-server

# List available emulators
emulator -list-avds

# Start specific emulator (replace with your AVD name)
emulator -avd Medium_Phone_API_36.1

# View emulator logs
adb logcat
```

## Next Steps

Once the emulator shows as "device":
1. The emulator is ready
2. You can run the app: `npm run mobile:android`
3. Or use Expo: `npm run dev:mobile` then press `a`



