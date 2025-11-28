# Clean Rebuild to Fix SVG Support

## Problem
SVG components are causing "Objects are not valid as a React child" error. This means the `react-native-svg` native module isn't properly linked in the current build.

## Solution: Clean Rebuild

### Step 1: Stop Everything
```powershell
# Stop Metro bundler (Ctrl+C in Metro terminal)
# Stop the app if running
```

### Step 2: Clean Android Build
```powershell
cd C:\laragon\www\openactive.net\apps\mobile
cd android
.\gradlew clean
cd ..
```

### Step 3: Remove Native Folders
```powershell
# Remove existing native code
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ios -ErrorAction SilentlyContinue
```

### Step 4: Regenerate Native Code
```powershell
npx expo prebuild --clean
```

This will:
- Regenerate Android and iOS native projects
- Include `react-native-svg` native module
- Set up autolinking correctly

### Step 5: Rebuild and Run
```powershell
npx expo run:android
```

**This will take 5-10 minutes** - be patient! It's compiling all native code including the SVG module.

### Step 6: After Build Completes

1. Metro bundler will start automatically
2. App will install on emulator
3. Test SVG by enabling it in `AuthScreen.js`

## Verify SVG Works

After rebuild, enable the test:
```javascript
// In AuthScreen.js, change:
let canUseSvg = false;
// To:
let canUseSvg = true;
// And uncomment the SVG rendering code
```

You should see the white circle above "OpenActive" text.

## Why This Is Needed

`react-native-svg` is a **native module** that requires:
- Native code compilation (C++/Java/Kotlin)
- Proper linking in the Android/iOS projects
- Clean build to ensure no conflicts

The current build was created before `react-native-svg` was properly configured, so it needs a fresh rebuild.

## After Rebuild

Once SVG works:
- ✅ You can use all SVG components
- ✅ Import custom SVGs
- ✅ Use the `SvgLogo` component
- ✅ Create new SVG components

## Time Estimate

- Clean: 1 minute
- Prebuild: 2-3 minutes
- Build: 5-10 minutes
- **Total: ~10-15 minutes**

## Ready to Rebuild?

Run these commands when ready:
```powershell
cd C:\laragon\www\openactive.net\apps\mobile
cd android
.\gradlew clean
cd ..
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
npx expo prebuild --clean
npx expo run:android
```

