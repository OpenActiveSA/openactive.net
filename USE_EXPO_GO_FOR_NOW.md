# Use Expo Go for Quick Testing

## Problem
The Android build is failing due to version compatibility issues. For quick testing, let's use Expo Go instead.

## Quick Solution: Use Expo Go

### Step 1: Install Expo Go on Emulator

1. Open your Pixel 7 emulator
2. Open Google Play Store
3. Search for "Expo Go"
4. Install it

### Step 2: Start Metro Bundler

```powershell
cd apps/mobile
npm start
```

### Step 3: Connect to Expo Go

In the Metro bundler terminal:
- Press `a` to open in Android emulator
- Or scan the QR code with Expo Go app

### Step 4: Test the App

The app should open in Expo Go and connect to your Supabase database!

## Note About Expo Go

Expo Go works for testing, but has limitations:
- ✅ Works for basic React Native features
- ✅ Works with Supabase (JavaScript SDK)
- ❌ Can't use custom native modules
- ❌ Not for production builds

For production, we'll need to fix the build issue, but Expo Go is perfect for testing your database connection!

## Fix Build Issue Later

The build error is likely due to:
- React Native version mismatch (0.73.6 vs recommended 0.81.5)
- Expo SDK 54 compatibility

We can fix this later, but for now Expo Go lets you test everything!

