# Debug: White Screen Issue

## Current Status
The app shows a white screen with an arrow icon (Expo splash screen), meaning the app isn't loading.

## What I've Fixed
1. Made Supabase import lazy (won't crash on import)
2. Added error handling for configuration errors
3. Added timeout to prevent infinite loading
4. Fixed error boundary (removed invalid try-catch in render)

## Next Steps to Debug

### 1. Check Metro Bundler Terminal
Look at the terminal where you ran `npm run dev:mobile`:
- **Red errors?** - Copy the full error message
- **Yellow warnings?** - These might indicate issues
- **"Bundling..." then "Bundled"?** - Good sign
- **"Unable to connect"?** - Connection issue

### 2. Check Android Logcat
Run this in a new terminal:
```powershell
adb logcat | Select-String -Pattern "ReactNative|Expo|Error|Exception" -Context 2
```

Look for:
- JavaScript errors
- Native crashes
- Import errors

### 3. Try Minimal Test App
I've created `App.test.js` - temporarily rename files to test:
```powershell
cd apps/mobile
# Backup current app
Move-Item App.js App.backup.js
# Use test app
Move-Item App.test.js App.js
# Restart Metro
```

If test app works, the issue is in the main App.js

### 4. Check Environment Variables
Verify `.env` file exists and is readable:
```powershell
cd apps/mobile
Get-Content .env
```

Should show:
```
EXPO_PUBLIC_SUPABASE_URL=https://buahkjwwahvnpjlkvnjv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

### 5. Clear Everything and Restart
```powershell
# Stop Metro (Ctrl+C)
cd apps/mobile
# Clear Expo cache
npx expo start --clear
# Or clear all caches
Remove-Item -Recurse -Force .expo, node_modules/.cache -ErrorAction SilentlyContinue
npm start
```

### 6. Check if App is Actually Running
In Metro terminal, you should see:
- Connection to emulator
- Bundle being served
- No red errors

If you see errors, share them!

## Most Likely Causes

1. **Invalid API key** - App crashes when trying to initialize Supabase
2. **Import error** - Module not found or syntax error
3. **Metro not connected** - App can't load JavaScript bundle
4. **Cache issue** - Old cached code causing problems

## Quick Test
Try this minimal version - replace App.js content temporarily:

```javascript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>TEST</Text>
      <Text>If you see this, rendering works!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1f44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    color: '#f5f7ff',
  },
});
```

If this works, the issue is in the Supabase initialization or data fetching.

