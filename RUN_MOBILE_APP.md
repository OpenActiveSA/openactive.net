# Run Mobile App on Pixel 7 Emulator

## Quick Start

### Step 1: Make Sure Emulator is Running

```powershell
# Check if emulator is running
adb devices
# Should show: emulator-5554    device
```

### Step 2: Build and Run (First Time)

Since you're using `expo-dev-client`, you need to build a development build:

```powershell
# From project root
npm run mobile:android
```

Or from mobile directory:
```powershell
cd apps/mobile
npm run android
```

This will:
1. Generate native Android code
2. Build the app
3. Install it on the Pixel 7 emulator
4. Start Metro bundler
5. Launch the app

**First build takes 5-10 minutes** - be patient!

### Step 3: Subsequent Runs

After the first build, you can just start Metro:

```powershell
# From project root
npm run dev:mobile
```

Then:
- The app will auto-connect if already installed
- Or press `a` in Metro to run on Android

## Setup Environment Variables

Before running, make sure you have `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_DEMO_USERNAME=demo.user
```

**Note:** For Android emulator, use `10.0.2.2` instead of `127.0.0.1` (the code auto-converts this, but you can set it directly).

## Troubleshooting

### Build Fails
```powershell
# Clean and rebuild
cd apps/mobile/android
.\gradlew clean
cd ../..
npm run mobile:android
```

### App Not Installing
- Make sure emulator is fully booted
- Check: `adb devices` shows device
- Restart ADB: `adb kill-server && adb start-server`

### Metro Bundler Issues
```powershell
# Clear cache
cd apps/mobile
npx expo start --clear
```

## Development Workflow

1. **First time:** `npm run mobile:android` (builds and installs)
2. **Daily use:** `npm run dev:mobile` (just starts Metro)
3. **Code changes:** Save file → auto-reloads in app
4. **Manual reload:** Press `r` in Metro terminal
5. **Developer menu:** Shake emulator or press `m` in Metro

## Difference: Development Build vs Expo Go

| Feature | Development Build | Expo Go |
|---------|------------------|---------|
| Custom native modules | ✅ Yes | ❌ No |
| Production-like | ✅ Yes | ❌ No |
| First setup | ⏱️ 5-10 min build | ⚡ Instant |
| Daily use | ⚡ Fast (Metro only) | ⚡ Fast |
| Your setup | ✅ Required | ❌ Won't work |

Since you have `expo-dev-client`, you **must** use development build.

