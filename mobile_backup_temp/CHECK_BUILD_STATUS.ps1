# Quick script to check Android build status
Write-Host "=== Android Build Status Check ===" -ForegroundColor Cyan
Write-Host ""

# Check if Java/Gradle processes are running
$javaProcesses = Get-Process | Where-Object {$_.ProcessName -like "*java*"} | Measure-Object
Write-Host "Java processes running: $($javaProcesses.Count)" -ForegroundColor $(if ($javaProcesses.Count -gt 0) { "Green" } else { "Red" })

# Check if Gradle daemon is running
Write-Host ""
Write-Host "Checking Gradle daemon..." -ForegroundColor Yellow
cd android
.\gradlew --status 2>&1 | Select-String -Pattern "daemon|status" | ForEach-Object { Write-Host $_ -ForegroundColor Cyan }
cd ..

# Check recent build output
Write-Host ""
Write-Host "Recent build activity:" -ForegroundColor Yellow
if (Test-Path "android\app\build\outputs\apk\debug") {
    $apkFiles = Get-ChildItem "android\app\build\outputs\apk\debug\*.apk" -ErrorAction SilentlyContinue
    if ($apkFiles) {
        Write-Host "✓ APK files found:" -ForegroundColor Green
        $apkFiles | ForEach-Object { 
            Write-Host "  - $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB) - Modified: $($_.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "  No APK files yet (build in progress)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Build directory not created yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To see live build output, check the terminal where you ran 'npx expo run:android'" -ForegroundColor Cyan
Write-Host "Or run: cd android && .\gradlew app:assembleDebug" -ForegroundColor Cyan





