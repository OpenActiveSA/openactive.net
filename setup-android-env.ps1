# Temporary script to set Android environment variables for this PowerShell session
# For permanent setup, add these to Windows Environment Variables

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"

Write-Host "✅ Android environment variables set for this session" -ForegroundColor Green
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host ""
Write-Host "To verify, run:" -ForegroundColor Yellow
Write-Host "  adb version"
Write-Host "  adb devices"
Write-Host ""
Write-Host "To permanently set these variables:" -ForegroundColor Yellow
Write-Host "1. Open System Properties > Environment Variables"
Write-Host "2. Add ANDROID_HOME = $env:LOCALAPPDATA\Android\Sdk"
Write-Host "3. Add to Path: %ANDROID_HOME%\platform-tools and %ANDROID_HOME%\emulator"






