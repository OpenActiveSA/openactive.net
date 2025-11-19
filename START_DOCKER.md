# Start Docker Desktop

## Problem
The error shows Docker Desktop is not running:
```
The system cannot find the file specified
//./pipe/dockerDesktopLinuxEngine
```

Supabase CLI uses Docker to run the local database, so Docker Desktop must be running.

## Solution

### Step 1: Start Docker Desktop

1. **Open Docker Desktop** from your Start menu
2. **Wait for it to fully start** - you'll see "Docker Desktop is running" in the system tray
3. The Docker icon in the system tray should be steady (not animating)

### Step 2: Verify Docker is Running

Once Docker Desktop is running, verify it:

```powershell
docker ps
```

You should see a list of containers (might be empty, that's OK).

### Step 3: Start Supabase

Now try starting Supabase again:

```powershell
npm run supabase:start
```

This will:
- Download Docker images (first time: 5-10 minutes)
- Start Supabase containers
- Set up the database

### Step 4: Get Your Keys

Once Supabase is running:

```powershell
npm run supabase:status
```

Copy the **anon key** from the output.

## Troubleshooting

**Docker Desktop won't start:**
- Make sure virtualization is enabled in BIOS
- Check Windows Hypervisor Platform is enabled
- Restart your computer

**"Docker daemon not running":**
- Wait a bit longer for Docker Desktop to fully start
- Check system tray for Docker icon
- Try restarting Docker Desktop

**Port already in use:**
- Stop any existing Supabase: `npm run supabase:stop`
- Then start again: `npm run supabase:start`

