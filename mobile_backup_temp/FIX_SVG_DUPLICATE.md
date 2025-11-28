# Fix: "Tried to register two views with the same name RNSVGCircle"

## Problem
The error "Tried to register two views with the same name RNSVGCircle" means `react-native-svg` native module is being registered twice. This happens when the native module is included multiple times in the build.

## Solution: Clean Rebuild

### Step 1: Clean Everything
```powershell
cd apps/mobile

# Clean Android build
cd android
.\gradlew clean
cd ..

# Clean Expo cache
npx expo start --clear
# Press Ctrl+C to stop

# Remove node_modules (optional, but thorough)
# Remove-Item -Recurse -Force node_modules
# npm install
```

### Step 2: Clean Prebuild
```powershell
# Remove existing native folders
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ios -ErrorAction SilentlyContinue

# Regenerate native code
npx expo prebuild --clean
```

### Step 3: Rebuild
```powershell
npx expo run:android
```

## Alternative: Check for Duplicate Dependencies

If clean rebuild doesn't work, check for duplicate dependencies:

```powershell
cd android
.\gradlew :app:dependencies --configuration debugRuntimeClasspath | Select-String "react-native-svg"
```

If you see `react-native-svg` listed multiple times, there might be a dependency conflict.

## Why This Happens

1. **Multiple installs**: `react-native-svg` was added multiple times
2. **Cache issues**: Old build artifacts weren't cleaned
3. **Autolinking conflict**: Expo autolinking included it twice
4. **Manual linking**: If manually linked AND autolinked

## Current Status

- ✅ SVG component code is ready (`TestCircle.js`, `SvgLogo.js`)
- ✅ Native module is installed (`react-native-svg@15.15.0`)
- ❌ Native module has duplicate registration (needs clean rebuild)

## After Clean Rebuild

Once rebuilt, you can:
1. Enable SVG components in `AuthScreen.js`
2. Use custom SVGs throughout the app
3. Import SVG files directly (if transformer is working)

## Quick Test After Rebuild

Enable the test circle:
```javascript
// In AuthScreen.js
import { TestCircle } from '../components/TestCircle';

// In render:
<TestCircle width={50} height={50} color="#ffffff" />
```

If it works, SVG is fixed! 🎉

