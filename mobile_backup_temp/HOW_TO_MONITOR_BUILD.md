# How to Monitor Android Build Progress

## Quick Status Check

Run this PowerShell script:
```powershell
cd apps/mobile
.\CHECK_BUILD_STATUS.ps1
```

Or manually check:
```powershell
# Check if build is running
Get-Process | Where-Object {$_.ProcessName -like "*java*"}

# Check Gradle daemon status
cd android
.\gradlew --status
```

## Where to See Build Output

### Option 1: Terminal Window
The build output appears in the terminal where you ran:
```powershell
npx expo run:android
```

**Look for:**
- `> Task :app:assembleDebug` - Building APK
- `BUILD SUCCESSFUL` - Build completed
- `BUILD FAILED` - Build error (check error message)

### Option 2: Check for APK File
When build completes, check:
```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

If this file exists and was recently modified, the build succeeded!

### Option 3: Run Build in Foreground
To see live output, run:
```powershell
cd apps/mobile
cd android
.\gradlew app:assembleDebug
```

This shows real-time progress.

## Build Stages

You'll see these stages:

1. **Configuration** (30-60 seconds)
   - `> Configure project :app`
   - `Using expo modules`

2. **Compilation** (2-5 minutes)
   - `> Task :app:compileDebugKotlin`
   - `> Task :app:compileDebugJavaWithJavac`

3. **Packaging** (1-2 minutes)
   - `> Task :app:assembleDebug`
   - `> Task :app:packageDebug`

4. **Installation** (30 seconds)
   - `Installing APK...`
   - `Launching app...`

## What to Look For

### ✅ Success Signs:
- `BUILD SUCCESSFUL in Xm Xs`
- `Installing APK 'app-debug.apk'`
- `Starting: Intent { act=android.intent.action.MAIN...`
- App launches on emulator/device

### ❌ Failure Signs:
- `BUILD FAILED`
- `FAILURE: Build failed with an exception`
- Red error messages
- Process stops without success message

## If Build Seems Stuck

1. **Check CPU usage:**
   ```powershell
   Get-Process java | Select-Object ProcessName, CPU, WorkingSet
   ```
   High CPU = actively building

2. **Check disk activity:**
   - Look for file activity in `android/app/build/`

3. **Wait longer:**
   - First build: 5-10 minutes is normal
   - Subsequent builds: 2-3 minutes

4. **If truly stuck:**
   ```powershell
   cd android
   .\gradlew --stop
   # Then restart build
   ```

## Quick Commands

```powershell
# Check if build is running
Get-Process java -ErrorAction SilentlyContinue

# See Gradle status
cd apps/mobile/android
.\gradlew --status

# Check for completed APK
Test-Path "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"

# View recent build log (if available)
Get-Content "apps/mobile/build-log-run-gradle.txt" -Tail 50
```

## Current Status

Based on last check:
- ✅ Java processes running (build active)
- ✅ Gradle daemon running
- ⏳ Check terminal for current progress





