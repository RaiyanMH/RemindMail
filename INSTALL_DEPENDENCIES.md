# Installing Dependencies

## Problem
The app requires the `googleapis` package to be installed, but it's not currently installed in your project.

## Solution: Install Node.js and npm

### Step 1: Install Node.js (which includes npm)

1. **Download Node.js:**
   - Go to https://nodejs.org/
   - Download the **LTS (Long Term Support)** version for Windows
   - This will be a file like `node-v20.x.x-x64.msi`

2. **Install Node.js:**
   - Run the installer you downloaded
   - Follow the installation wizard
   - **IMPORTANT:** Make sure to check the box that says "Add to PATH" during installation
   - Complete the installation

3. **Verify Installation:**
   - Close and reopen your terminal/command prompt
   - Run these commands to verify:
     ```
     node --version
     npm --version
     ```
   - Both should show version numbers (e.g., `v20.11.0` and `10.2.4`)

### Step 2: Install Project Dependencies

1. **Open a terminal/command prompt** in the project folder:
   - Navigate to: `C:\Users\raiya\Downloads\RemindMail`
   - Or right-click in the folder and select "Open in Terminal" or "Open PowerShell here"

2. **Install dependencies:**
   ```
   npm install
   ```
   
   This will install:
   - googleapis (for Google OAuth)
   - nodemailer (for sending emails)
   - All other required packages

3. **Wait for installation to complete** - this may take a few minutes

### Step 3: Run the App

After installation completes, you can run the app:
```
npm start
```

Or use the batch file:
```
start.bat
```

## Alternative: If npm is in a different location

If Node.js is installed but npm isn't found in PATH, you can try:

1. Find Node.js installation:
   - Common locations:
     - `C:\Program Files\nodejs\`
     - `C:\Program Files (x86)\nodejs\`
     - `C:\Users\YourName\AppData\Roaming\npm`

2. Add to PATH manually:
   - Right-click "This PC" > Properties
   - Advanced system settings
   - Environment Variables
   - Edit "Path" variable
   - Add Node.js installation path

3. Restart your terminal and try `npm install` again

## Troubleshooting

### "npm is not recognized"
- Make sure Node.js is installed
- Restart your terminal/command prompt after installing Node.js
- Check that Node.js was added to PATH

### "Permission denied" errors
- Try running terminal as Administrator
- On Windows, right-click PowerShell/CMD and select "Run as administrator"

### Still having issues?
- Make sure you're in the correct project folder
- Try deleting `node_modules` folder (if it exists) and `package-lock.json`, then run `npm install` again





