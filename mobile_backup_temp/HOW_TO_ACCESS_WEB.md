# How to Access the Web App

## Metro is Running!

Metro bundler is already running on **port 8081**.

## Access the App

### Option 1: Direct URL
Open your browser and go to:
```
http://localhost:8081
```

### Option 2: Check Metro Terminal
Look at the terminal where Metro is running. You should see:
- A QR code
- Text saying "Web is waiting on http://localhost:8081"
- Or press `w` in that terminal to open web

### Option 3: If Port 8081 Doesn't Work
The URL might be on a different port. Check the Metro terminal output for:
- `Web is waiting on http://localhost:XXXX`
- Where XXXX is the port number

## Navigate to SVG Test Screen

Once the app loads in your browser:
1. You'll see the AuthScreen
2. Click the "🧪 Test SVG Support" button at the bottom
3. The test screen will show which SVG methods work

## If You Don't See Metro Output

If the terminal is blank or you can't see Metro:
1. Find the terminal window where you ran `npx expo start`
2. Or start fresh:
   ```powershell
   cd apps/mobile
   npx expo start --web
   ```
3. Wait for it to show the URL

## Quick Test

Try opening: **http://localhost:8081** in your browser right now!


