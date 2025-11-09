# RemindMail Setup Guide

## Prerequisites

Before running this application, you need to have Node.js installed on your system.

### Install Node.js

1. Download Node.js from [https://nodejs.org/](https://nodejs.org/)
2. Install the LTS (Long Term Support) version
3. Verify installation by opening a terminal and running:
   ```bash
   node --version
   npm --version
   ```

Both commands should display version numbers.

## Installation

1. Navigate to the project directory:
   ```bash
   cd RemindMail
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

   This will install:
   - Electron (desktop app framework)
   - React & React DOM (UI library)
   - NodeMailer (email sending)
   - Babel (JavaScript compiler)

## Running the Application

### Development Mode (with DevTools)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## First Time Setup

1. **Configure Email Settings**:
   - Click the Settings (gear) icon in the top right
   - Enter your SMTP configuration:
     - SMTP Host (e.g., `smtp.gmail.com`)
     - SMTP Port (usually `587` for TLS or `465` for SSL)
     - Email/Username
     - Password (use App Password for Gmail)
   - Click "Save Settings"

2. **Create Your First Reminder**:
   - Click the "Add Reminder" button
   - Fill in the required fields
   - Add one or more scheduled times
   - Click "Save Reminder"

## Troubleshooting

### "npm is not recognized"
- Make sure Node.js is installed
- Restart your terminal/command prompt after installing Node.js
- Verify Node.js is in your system PATH

### "Electron failed to install"
- Try deleting `node_modules` folder and `package-lock.json`
- Run `npm install` again
- On Windows, you may need to run PowerShell as Administrator

### Email not sending
- Verify SMTP settings are correct
- For Gmail, make sure you're using an App Password (not your regular password)
- Check that your firewall/antivirus isn't blocking the connection
- Verify the scheduled time has passed (emails send at the scheduled time)

## File Structure

```
RemindMail/
├── main.js          # Electron main process (scheduler, email, IPC)
├── preload.js       # Secure IPC bridge
├── index.html       # Main HTML file
├── app.jsx          # React application
├── package.json     # Dependencies and scripts
├── README.md        # Documentation
├── SETUP.md         # This file
└── .gitignore       # Git ignore rules
```

## Storage Location

Reminders and settings are stored locally on your system:
- **Windows**: `%APPDATA%\remindmail\`
- **macOS**: `~/Library/Application Support/remindmail/`
- **Linux**: `~/.config/remindmail/`

Files are automatically created when you first run the app.

