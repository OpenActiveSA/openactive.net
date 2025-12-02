# Quick script to start Metro bundler for mobile app
# Run this when you come back to development

Write-Host "Checking if Metro is already running..." -ForegroundColor Yellow

$metroRunning = netstat -ano | Select-String ":8081.*LISTENING"

if ($metroRunning) {
    Write-Host "✅ Metro is already running on port 8081" -ForegroundColor Green
    Write-Host "You can reload the app in the emulator" -ForegroundColor Cyan
} else {
    Write-Host "🚀 Starting Metro bundler..." -ForegroundColor Yellow
    Write-Host ""
    
    # Change to mobile app directory
    Set-Location $PSScriptRoot
    
    # Start Metro with clear cache option
    npx expo start --clear
}


