# Script to set JAVA_HOME permanently (requires Admin rights)
# Or run this to set it temporarily for current session

$javaPath = "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot"

# Set temporarily for this session
$env:JAVA_HOME = $javaPath
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "✅ JAVA_HOME set temporarily: $env:JAVA_HOME" -ForegroundColor Green
Write-Host "✅ Java added to PATH for this session" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying Java installation..." -ForegroundColor Yellow
java -version
Write-Host ""
Write-Host "⚠️  Note: This is temporary for this PowerShell session." -ForegroundColor Yellow
Write-Host "   To set permanently:" -ForegroundColor Yellow
Write-Host "   1. Press Win+X → System → Advanced system settings" -ForegroundColor Yellow
Write-Host "   2. Environment Variables → New (System/User):" -ForegroundColor Yellow
Write-Host "      Name: JAVA_HOME" -ForegroundColor Yellow
Write-Host "      Value: $javaPath" -ForegroundColor Yellow
Write-Host "   3. Edit Path → Add: %JAVA_HOME%\bin" -ForegroundColor Yellow
Write-Host "   4. Close and reopen PowerShell" -ForegroundColor Yellow






