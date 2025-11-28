# Rebuild App to Use Custom SVGs

## Why Rebuild?

`react-native-svg` is a **native module** that requires native code to be compiled into your app. Since you're using Expo Dev Client, you need to rebuild the development build to include this native module.

## Step 1: Install Dependencies

Make sure all dependencies are installed:

```powershell
cd apps/mobile
npm install
```

## Step 2: Rebuild the Development Build

You have two options:

### Option A: Local Build (Recommended)

```powershell
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

This will:
1. Generate native Android code
2. Build the app with `react-native-svg` included
3. Install it on your emulator
4. Start Metro bundler

**First build takes 5-10 minutes** - be patient!

### Option B: EAS Build (Cloud Build)

If local build fails, use EAS Build:

```powershell
cd apps/mobile
eas build --profile development --platform android
```

Then install the APK on your emulator.

## Step 3: Verify SVG Works

After rebuilding, the app should:
- ✅ Load without crashes
- ✅ Display the OpenActive SVG logo on the auth screen
- ✅ Allow you to use custom SVGs throughout the app

## Using Custom SVGs in Your App

### Example 1: Using the SvgLogo Component

```javascript
import { SvgLogo } from '../components/SvgLogo';

<SvgLogo width={200} height={45} color="#ffffff" />
```

### Example 2: Creating Your Own SVG Component

```javascript
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export function MyCustomIcon({ width = 24, height = 24, color = '#000' }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" />
    </Svg>
  );
}
```

### Example 3: Loading SVG from File

For complex SVGs, you can:
1. Keep the SVG file in `assets/`
2. Copy the SVG code into a component
3. Or use a tool like `react-native-svg-transformer` (requires additional setup)

## Troubleshooting

### Build Fails

```powershell
# Clean and try again
cd apps/mobile/android
.\gradlew clean
cd ..
npx expo prebuild --clean
npx expo run:android
```

### App Still Crashes

- Make sure `react-native-svg` is in `package.json`
- Verify the rebuild completed successfully
- Check logs: `adb logcat | Select-String "Error"`

### SVG Not Showing

- Check the SVG component is imported correctly
- Verify width/height are set
- Check the viewBox matches your SVG dimensions
- Ensure color prop is set correctly

## After Rebuild

Once rebuilt, you can:
- ✅ Use `<SvgLogo />` component anywhere
- ✅ Create custom SVG components
- ✅ Style SVGs with colors, sizes, etc.
- ✅ No need to rebuild again for JavaScript changes

**Note:** Only rebuild when you add/remove native modules. JavaScript changes (like using existing SVG components) work immediately with Metro bundler.

