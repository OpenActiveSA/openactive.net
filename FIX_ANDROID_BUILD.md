# Fix Android Build Error

## Common Issues and Solutions

### 1. Check Emulator is Running

```powershell
adb devices
```

Should show:
```
List of devices attached
emulator-5554    device
```

If not, start your Pixel 7 emulator from Android Studio.

### 2. Check Java Version

```powershell
java -version
```

Should be Java 17 or later. If not, install JDK 17+.

### 3. Check Android Environment

```powershell
$env:ANDROID_HOME
```

Should show your Android SDK path (e.g., `C:\Users\Admin\AppData\Local\Android\Sdk`)

### 4. Clean and Rebuild

```powershell
cd apps/mobile
cd android
.\gradlew clean
cd ..
npm run android
```

### 5. Install Dependencies First

```powershell
cd apps/mobile
npm install
npm run android
```

### 6. Prebuild First (If Native Code Missing)

```powershell
cd apps/mobile
npx expo prebuild --clean
npm run android
```

### 7. Check for Specific Error

Run with more verbose output:

```powershell
cd apps/mobile
npx expo run:android --verbose
```

This will show the exact error message.

## Alternative: Use Expo Go (Simpler for Testing)

If the build keeps failing, you can use Expo Go for quick testing:

1. Install Expo Go app on your emulator/phone
2. Start Metro bundler:
   ```powershell
   cd apps/mobile
   npm start
   ```
3. Press `a` to open in Android emulator
4. Or scan QR code with Expo Go app

**Note:** Expo Go has limitations, but works for basic testing.

## Most Likely Issues

1. **Emulator not running** - Start it first
2. **Missing dependencies** - Run `npm install` in `apps/mobile`
3. **Gradle build error** - Clean and rebuild
4. **Java version** - Need JDK 17+

Let me know what error you see and I can help fix it!

