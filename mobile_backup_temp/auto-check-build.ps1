# Automatic Build Monitor - Run this and it will check build status
# This script monitors the build and alerts you if it fails

param(
    [switch]$Watch = $false
)

function Check-BuildStatus {
    Write-Host "`n=== Build Status Check ===" -ForegroundColor Cyan
    
    # Check if APK exists
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
    $apkExists = Test-Path $apkPath
    
    # Check if Java processes are running
    $javaProcs = Get-Process java -ErrorAction SilentlyContinue
    
    # Check Gradle daemon
    $gradleStatus = cd android; .\gradlew --status 2>&1; cd ..
    
    if ($apkExists) {
        $apk = Get-Item $apkPath
        Write-Host "[SUCCESS] BUILD SUCCESS!" -ForegroundColor Green
        Write-Host "   APK: $($apk.Name) ($([math]::Round($apk.Length/1MB, 2)) MB)" -ForegroundColor White
        Write-Host "   Modified: $($apk.LastWriteTime)" -ForegroundColor White
        return "SUCCESS"
    } elseif ($javaProcs) {
        Write-Host "[IN PROGRESS] BUILD IN PROGRESS..." -ForegroundColor Yellow
        Write-Host "   Java processes: $($javaProcs.Count)" -ForegroundColor White
        return "IN_PROGRESS"
    } else {
        Write-Host "[FAILED] BUILD NOT RUNNING" -ForegroundColor Red
        Write-Host "   No APK found and no Java processes" -ForegroundColor White
        
        # Try to get last error
        $lastError = Get-Content "android\app\build\outputs\logs\*.txt" -ErrorAction SilentlyContinue | Select-Object -Last 10
        if ($lastError) {
            Write-Host "`n   Last error:" -ForegroundColor Red
            $lastError | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
        }
        return "FAILED"
    }
}

# Initial check
$status = Check-BuildStatus

if ($Watch) {
    Write-Host "`n[WATCHING] Watching for build completion..." -ForegroundColor Cyan
    Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray
    
    while ($true) {
        Start-Sleep -Seconds 10
        $newStatus = Check-BuildStatus
        
        if ($newStatus -eq "SUCCESS") {
            Write-Host "`n[SUCCESS] Build completed successfully!" -ForegroundColor Green
            break
        } elseif ($newStatus -eq "FAILED" -and $status -eq "IN_PROGRESS") {
            Write-Host "`n[ERROR] Build appears to have failed!" -ForegroundColor Red
            Write-Host "   Check the terminal where you ran the build for details" -ForegroundColor Yellow
            break
        }
        
        $status = $newStatus
    }
} else {
    # Single check
    if ($status -eq "FAILED") {
        Write-Host "`nTip: Run with -Watch to monitor automatically" -ForegroundColor Cyan
        Write-Host "   .\auto-check-build.ps1 -Watch" -ForegroundColor Gray
    }
}

