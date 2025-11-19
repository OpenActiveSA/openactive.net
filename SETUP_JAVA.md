# Setting Up Java for Android Development

After installing Temurin (Java 17), you need to set the JAVA_HOME environment variable.

## Step 1: Find Your Java Installation

Java is typically installed in one of these locations:

- `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot`
- `C:\Program Files\Eclipse Foundation\jdk-17.x.x.x-hotspot`
- `C:\Program Files\Java\jdk-17.x.x.x`
- `C:\Program Files (x86)\Java\jdk-17.x.x.x`

**To find it:**
1. Open File Explorer
2. Navigate to `C:\Program Files\`
3. Look for a folder containing `Eclipse` or `Java`
4. Inside, you should see a folder like `jdk-17.x.x.x-hotspot`
5. The full path should be something like:
   ```
   C:\Program Files\Eclipse Adoptium\jdk-17.0.13-hotspot
   ```

## Step 2: Set JAVA_HOME Environment Variable

### Option A: Via Windows Settings (Recommended - Permanent)

1. Press **Win + X** → Select **System**
2. Click **Advanced system settings** (on the right side)
3. Click **Environment Variables** button
4. Under **System variables** (or **User variables**):
   - Click **New...**
   - **Variable name**: `JAVA_HOME`
   - **Variable value**: Paste the full path to your JDK folder
     - Example: `C:\Program Files\Eclipse Adoptium\jdk-17.0.13-hotspot`
   - Click **OK**
5. Edit the **Path** variable:
   - Select **Path** → Click **Edit...**
   - Click **New**
   - Add: `%JAVA_HOME%\bin`
   - Click **OK** on all dialogs
6. **Close and reopen PowerShell** for changes to take effect

### Option B: Temporarily (Current PowerShell Session Only)

```powershell
# Find your Java installation path first, then:
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13-hotspot"
$env:PATH += ";$env:JAVA_HOME\bin"
```

Replace the path with your actual Java installation path.

## Step 3: Verify Java is Working

Close and reopen PowerShell, then run:

```powershell
java -version
echo $env:JAVA_HOME
```

You should see:
```
openjdk version "17.0.x" ...
OpenJDK Runtime Environment ...
OpenJDK 64-Bit Server VM ...
```

And `JAVA_HOME` should show your Java installation path.

## Step 4: Try Building Android App Again

Once Java is verified:

```powershell
cd C:\laragon\www\openactive.net\apps\mobile
npm run android
```

## Troubleshooting

### "java is not recognized"
- Make sure you added `%JAVA_HOME%\bin` to PATH
- **Close and reopen PowerShell** after setting environment variables
- Verify the JAVA_HOME path is correct

### "JAVA_HOME is not set"
- Make sure you set JAVA_HOME (not just added Java to PATH)
- Verify JAVA_HOME points to the JDK folder (not a parent folder)

### Still having issues?
Run these commands and share the output:
```powershell
Get-ChildItem "C:\Program Files" -Filter "*java*" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
Get-ChildItem "C:\Program Files" -Filter "*Eclipse*" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```






