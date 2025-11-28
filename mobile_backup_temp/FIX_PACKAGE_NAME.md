# Package Name Mismatch Fix

## The Issue
- **Expo CLI expects:** `com.openactive`
- **Your app actually uses:** `com.openactive.mobile`

This is why `expo run:android` fails with "No development build (com.openactive)".

## Solution: Use Dev Client Manually ✅

Since the app is already installed correctly as `com.openactive.mobile`, you don't need `expo run:android`. Instead:

### Option 1: Auto-Connect (Easiest)
1. Make sure Metro is running: `npx expo start --dev-client`
2. The app should auto-detect it within 10-30 seconds
3. Tap on the server when it appears

### Option 2: Manual Connection
1. In the app, tap "Enter URL manually"
2. Enter: `exp://YOUR_IP:8081` or `exp://localhost:8081`
3. The app will connect and load

## Why This Happens
The EAS project ID might be associated with a different package name, or there's a cached configuration. Since your app is built and installed correctly, you can just use the dev client connection method instead.

## Your App is Correct ✅
- Package name: `com.openactive.mobile` ✅
- Installed on device: ✅
- Ready to connect: ✅

Just connect via the dev client UI - no need to rebuild!

