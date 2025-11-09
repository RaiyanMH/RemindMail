# RemindMail

A desktop application built with Electron, React, and Node.js that allows you to create reminders with scheduled email notifications.

## Features

- ✨ **Reminder Creation**: Create reminders with title, description, email, and multiple scheduled times
- 📧 **Email Notifications**: Automatically sends emails at scheduled times using NodeMailer
- 💾 **Local Storage**: Persists reminders using JSON file storage
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- 🌓 **Theme Support**: Light, Dark, and Auto (system) theme modes
- ⚙️ **SMTP Configuration**: Configure your email settings in the app
- 🔄 **Auto-cleanup**: Automatically removes reminders after all scheduled emails are sent

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

## Running the Application

Start the application:

```bash
npm start
```

For development with DevTools:

```bash
npm run dev
```

## Configuration

### Email Setup (SMTP)

Before creating reminders, you need to configure your SMTP settings:

1. Click the Settings (gear) icon in the top right
2. Enter your SMTP configuration:
   - **SMTP Host**: e.g., `smtp.gmail.com` for Gmail
   - **SMTP Port**: Usually `587` for TLS or `465` for SSL
   - **Secure Connection**: Check if using SSL
   - **Email/Username**: Your email address
   - **Password**: Your email password or App Password

### Gmail Setup

For Gmail users:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password in the settings (not your regular password)

### Other Email Providers

Common SMTP settings:
- **Outlook/Hotmail**: `smtp-mail.outlook.com`, Port: 587
- **Yahoo**: `smtp.mail.yahoo.com`, Port: 587 or 465
- **Custom SMTP**: Use your provider's SMTP server details

## Usage

1. **Create a Reminder**:
   - Click the "Add Reminder" button
   - Fill in the title (required)
   - Optionally add a description (if blank, title will be used in email body)
   - Enter the recipient email address
   - Add one or more scheduled date/time combinations
   - Click "Save Reminder"

2. **View Reminders**:
   - All active reminders are displayed in cards
   - Each card shows the next scheduled time and remaining count
   - Click "Expand" to see all scheduled times for a reminder

3. **Delete a Reminder**:
   - Click the trash icon on any reminder card
   - Confirm deletion

4. **Change Theme**:
   - Open Settings
   - Select Light, Dark, or Auto theme

## How It Works

- **Scheduler**: A background process checks for due reminders every 60 seconds
- **Email Sending**: When a reminder time is reached, the app sends an email using the configured SMTP settings
- **Auto-cleanup**: After all scheduled times for a reminder have passed and emails sent, the reminder is automatically removed
- **Storage**: All reminders and settings are stored locally in JSON files in the app's user data directory

## Technical Details

- **Frontend**: React with Tailwind CSS (via CDN)
- **Backend**: Node.js with Electron main process
- **Email**: NodeMailer for SMTP email sending
- **Storage**: JSON file-based storage
- **Scheduler**: Node.js setInterval running every 60 seconds

## File Structure

```
RemindMail/
├── main.js          # Electron main process (scheduler, email, IPC)
├── preload.js       # Secure IPC bridge
├── index.html       # Main HTML file
├── app.jsx          # React application
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Platform Support

This application works on:
- Windows
- macOS
- Linux

## License

MIT

