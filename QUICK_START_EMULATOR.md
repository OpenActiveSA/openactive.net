# Quick Start: Run Mobile App on Emulator

## Current Status ✅

- ✅ Android SDK installed: `C:\Users\Admin\AppData\Local\Android\Sdk`
- ✅ Emulator created: `Medium_Phone_API_36.1`
- ✅ Environment variables configured (temporarily)

## Step 1: Start Emulator

The emulator is starting in the background. You can:

**Option A: Check if it's running**
```powershell
# Set environment variables first (if not already set)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"

# Check devices
adb devices
```

**Option B: Start from Android Studio**
1. Open Android Studio
2. Go to **Tools > Device Manager**
3. Click the ▶️ Play button next to `Medium_Phone_API_36.1`

**Option C: Start from command line**
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\emulator"
emulator -avd Medium_Phone_API_36.1
```

## Step 2: Wait for Emulator to Boot

Wait until:
- The emulator shows the Android home screen
- `adb devices` shows the device:
  ```
  List of devices attached
  emulator-5554    device
  ```

This can take 1-2 minutes on first boot.

## Step 3: Run the Mobile App

Once the emulator is running and detected:

### First Time Setup (Build Native Code)

Since the app uses Expo with dev client, you need to build first:

```powershell
# From project root
cd apps/mobile

# Build and run on Android
npm run android
```

Or from the root:
```powershell
npm run mobile:android
```

This will:
1. Generate native Android code
2. Build the app
3. Install it on the emulator
4. Start Metro bundler
5. Launch the app

### Subsequent Runs

After first build, you can just start Metro:

```powershell
cd apps/mobile
npm start
```

Then press `a` in the Metro bundler to run on Android, or the app will auto-connect if already installed.

## Troubleshooting

### Emulator Not Detected

```powershell
# Check if running
adb devices

# If empty, restart ADB
adb kill-server
adb start-server
adb devices
```

### Build Errors

```powershell
# Clean build
cd apps/mobile/android
.\gradlew clean

# Rebuild
cd ../..
npx expo prebuild --clean
npm run android
```

### Port Already in Use

```powershell
# Kill process on port 8081 (Metro bundler)
npx kill-port 8081

# Or use different port
cd apps/mobile
npx expo start --port 8082
```

### Environment Variables Not Set

Run the setup script:
```powershell
.\setup-android-env.ps1
```

Or set manually for this session:
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
```

## Quick Commands

```powershell
# Check emulator status
adb devices

# View app logs
adb logcat

# Restart ADB
adb kill-server && adb start-server

# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Medium_Phone_API_36.1
```

## Next Steps

Once the app is running:
- Changes to code will hot-reload automatically
- Press `r` in Metro bundler to reload
- Press `m` to open developer menu in the app
- Check `apps/mobile/ANDROID_SETUP.md` for more details






