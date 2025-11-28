# Android Emulator Setup Guide (Windows)

This guide will help you set up a local Android emulator for developing the mobile app.

## Prerequisites

1. **Java Development Kit (JDK)**
   - Download JDK 17 or later from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [Adoptium](https://adoptium.net/)
   - Install and add to PATH
   - Verify: `java -version`

2. **Android Studio**
   - Download from [developer.android.com/studio](https://developer.android.com/studio)
   - Install with default settings
   - During installation, make sure to install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (AVD)

## Step 1: Install Android Studio Components

1. Open Android Studio
2. Go to **Tools > SDK Manager**
3. In the **SDK Platforms** tab, install:
   - Android 13.0 (Tiramisu) - API Level 33
   - Android 14.0 (UpsideDownCake) - API Level 34
4. In the **SDK Tools** tab, ensure these are checked:
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools
   - Intel x86 Emulator Accelerator (HAXM installer) - if using Intel CPU
   - Google Play services (optional)
5. Click **Apply** and wait for installation

## Step 2: Set Up Environment Variables

Add these to your Windows environment variables:

1. Open **System Properties** > **Environment Variables**
2. Under **User variables**, add/update:

```
ANDROID_HOME = C:\Users\YourUsername\AppData\Local\Android\Sdk
```

3. Add to **Path** variable:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

4. Verify in PowerShell:
```powershell
$env:ANDROID_HOME
adb version
```

## Step 3: Create an Android Virtual Device (AVD)

1. Open Android Studio
2. Go to **Tools > Device Manager** (or **Tools > AVD Manager** in older versions)
3. Click **Create Device**
4. Choose a device definition (e.g., **Pixel 5** or **Pixel 6**)
5. Click **Next**
6. Select a system image:
   - Recommended: **API Level 33 (Android 13)** or **API Level 34 (Android 14)**
   - Choose **x86_64** architecture (faster on Intel/AMD)
   - If not installed, click **Download** next to the system image
7. Click **Next**
8. Configure AVD:
   - Name: `Pixel_5_API_33` (or your preference)
   - Graphics: **Hardware - GLES 2.0** (or **Automatic**)
   - Enable **Cold Boot** if you want faster startup
9. Click **Finish**

## Step 4: Enable Hardware Acceleration (Important for Performance)

### For Intel CPUs:
1. Install **Intel HAXM** from Android Studio SDK Manager
2. Or download from: https://github.com/intel/haxm/releases
3. Run the installer

### For AMD CPUs:
1. Enable **Windows Hypervisor Platform**:
   - Open **Turn Windows features on or off**
   - Check **Windows Hypervisor Platform**
   - Restart computer
2. In Android Studio AVD settings, use **Hardware - GLES 2.0** graphics

## Step 5: Start the Emulator

### Option A: From Android Studio
1. Open **Device Manager**
2. Click the **Play** button next to your AVD

### Option B: From Command Line
```powershell
emulator -avd Pixel_5_API_33
```

### Option C: List available AVDs
```powershell
emulator -list-avds
```

## Step 6: Verify Emulator is Running

1. Wait for the emulator to fully boot (may take 1-2 minutes first time)
2. Verify it's detected:
```powershell
adb devices
```
You should see your emulator listed.

## Step 7: Run Your Expo App

### First Time Setup (Build Native Code)

Since your app uses `expo-dev-client` and the new architecture, you need to build the native app first:

```powershell
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

This will:
- Generate native Android code
- Build the app
- Install it on the emulator
- Start Metro bundler

### Subsequent Runs

Once built, you can use:

```powershell
# Start Metro bundler
npm start

# Or build and run
npm run android
```

Or from the root directory:
```powershell
npm run dev:mobile
```

## Troubleshooting

### Emulator Won't Start
- **Error: "HAX is not working"**: Install/update Intel HAXM
- **Error: "VT-x is disabled"**: Enable virtualization in BIOS
- **Slow performance**: Enable hardware acceleration (see Step 4)

### App Won't Install
- Make sure emulator is fully booted
- Check `adb devices` shows the emulator
- Try: `adb kill-server && adb start-server`

### Build Errors
- Clean build: `cd apps/mobile/android && ./gradlew clean`
- Rebuild: `npx expo prebuild --clean`
- Check Java version: `java -version` (should be 17+)

### Metro Bundler Issues
- Clear cache: `npx expo start --clear`
- Reset Metro: `npx expo start --reset-cache`

### Port Already in Use
- Kill process on port 8081: `npx kill-port 8081`
- Or change port: `npx expo start --port 8082`

## Quick Commands Reference

```powershell
# List emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_5_API_33

# Check connected devices
adb devices

# Restart ADB server
adb kill-server
adb start-server

# View logs
adb logcat

# Install APK manually
adb install path/to/app.apk

# Uninstall app
adb uninstall com.openactive.mobile
```

## Alternative: Use Physical Device

If you prefer using a physical Android device:

1. Enable **Developer Options** on your phone:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging**:
   - Go to **Settings > Developer Options**
   - Enable **USB Debugging**
3. Connect phone via USB
4. Accept the debugging prompt on your phone
5. Verify: `adb devices`
6. Run: `npm run android`

## Performance Tips

1. **Allocate more RAM** to emulator (in AVD settings)
2. **Use x86_64** system images (faster than ARM)
3. **Enable hardware acceleration**
4. **Close other heavy applications**
5. **Use a physical device** for best performance during development

## Next Steps

Once your emulator is running:
1. The app should automatically install and launch
2. You can use hot reload - save files and see changes instantly
3. Press `r` in Metro bundler to reload
4. Press `m` to open developer menu in the app


