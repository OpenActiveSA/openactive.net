# Simple build status checker - run this in ONE terminal
Write-Host "`n=== Android Build Status ===" -ForegroundColor Cyan

# Check if build is running
$javaProcs = Get-Process java -ErrorAction SilentlyContinue
if ($javaProcs) {
    Write-Host "✓ Build is RUNNING" -ForegroundColor Green
    Write-Host "  Java processes: $($javaProcs.Count)" -ForegroundColor White
} else {
    Write-Host "✗ Build is NOT running" -ForegroundColor Red
}

# Check if APK exists
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    Write-Host "`n✓ APK FOUND!" -ForegroundColor Green
    Write-Host "  File: $($apk.Name)" -ForegroundColor White
    Write-Host "  Size: $([math]::Round($apk.Length/1MB, 2)) MB" -ForegroundColor White
    Write-Host "  Modified: $($apk.LastWriteTime)" -ForegroundColor White
    Write-Host "`n→ Build SUCCESS! App should be installed." -ForegroundColor Green
} else {
    Write-Host "`n⏳ APK not found yet - build in progress or not started" -ForegroundColor Yellow
}

# Check Gradle daemon
Write-Host "`nGradle Status:" -ForegroundColor Cyan
cd android
.\gradlew --status 2>&1 | Select-String -Pattern "PID|STATUS|IDLE|BUSY" | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
cd ..

Write-Host "`n---" -ForegroundColor Gray
Write-Host "Run this script again to check status" -ForegroundColor Gray
Write-Host "Or check: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Gray





