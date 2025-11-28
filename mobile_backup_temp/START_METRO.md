# How to Start Metro and Test SVG

## Simple Steps

### 1. Start Metro Bundler
In a terminal, run:
```powershell
cd C:\laragon\www\openactive.net\apps\mobile
npx expo start --web
```

### 2. Wait for Metro to Start
You'll see:
- "Starting Metro Bundler"
- "Web is waiting on http://localhost:8081"
- A QR code

### 3. Open in Browser
- Open: **http://localhost:8081**
- Or press `w` in the Metro terminal

### 4. Test SVG
- Click "🧪 Test SVG Support" button
- See which SVG methods work

## If Metro Won't Start

1. **Check if port is in use:**
   ```powershell
   netstat -ano | Select-String "8081"
   ```

2. **Kill processes on port 8081:**
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 8081).OwningProcess | Stop-Process
   ```

3. **Try a different port:**
   ```powershell
   npx expo start --web --port 8082
   ```

## Quick Test Command

```powershell
cd apps/mobile
npx expo start --web
```

Then open: **http://localhost:8081**


