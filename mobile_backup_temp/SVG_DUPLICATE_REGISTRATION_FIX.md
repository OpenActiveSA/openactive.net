# Fix: "Tried to register two views with the same name RNSVGCircle"

## Problem
Even after clean rebuild, SVG components cause duplicate registration error. This is a known issue with `react-native-svg` in some Expo setups.

## Current Status
- ✅ Only one version of `react-native-svg@15.15.0` installed
- ✅ Native module is properly linked
- ❌ Still getting duplicate registration at runtime

## Possible Solutions

### Solution 1: Complete App Reinstall (Trying Now)
```powershell
# Uninstall app completely
adb shell pm uninstall com.openactive.mobile

# Clear app data
adb shell pm clear com.openactive.mobile

# Clean build
cd android
.\gradlew clean
cd ..

# Rebuild without cache
npx expo run:android --no-build-cache
```

### Solution 2: Check for Metro Cache Issues
```powershell
# Clear Metro cache
npx expo start --clear

# Or manually delete cache
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
```

### Solution 3: Try Different SVG Version
If the issue persists, try downgrading to a known stable version:
```powershell
npm install react-native-svg@14.1.0
npx expo prebuild --clean
npx expo run:android
```

### Solution 4: Use SVG as Image Instead
As a workaround, convert SVG to PNG/WebP and use as image:
```javascript
import { Image } from 'react-native';

<Image 
  source={require('./assets/logo.png')} 
  style={{ width: 200, height: 45 }}
  resizeMode="contain"
/>
```

### Solution 5: Check Expo SDK Compatibility
Verify `react-native-svg@15.15.0` is compatible with Expo SDK 54:
- Expo SDK 54 supports react-native-svg 15.x
- But there might be runtime issues

## Alternative: Use react-native-svg-transformer Only
If the component approach doesn't work, try using only the transformer:
1. Remove SVG component imports
2. Use direct SVG file imports via transformer
3. This might avoid the duplicate registration

## Current Attempt
We're trying Solution 1 - complete reinstall with no cache.

## If All Else Fails
Consider using:
- **react-native-vector-icons** for icons
- **PNG/WebP images** for logos
- **react-native-svg** only for simple shapes (avoid complex SVGs)

