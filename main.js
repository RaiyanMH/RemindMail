const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Storage path for reminders and settings - initialize after app is ready
let userDataPath;
let remindersPath;
let settingsPath;
let emailHistoryPath;
// Removed OAuth token storage (no Google/Gmail APIs)

/**
 * Initialize storage files - called when app is ready
 */
function initializeStorage() {
  try {
    userDataPath = app.getPath('userData');
    remindersPath = path.join(userDataPath, 'reminders.json');
    settingsPath = path.join(userDataPath, 'settings.json');
    emailHistoryPath = path.join(userDataPath, 'emailHistory.json');

    // Ensure userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // Initialize storage files if they don't exist
    if (!fs.existsSync(remindersPath)) {
      fs.writeFileSync(remindersPath, JSON.stringify([]));
    }
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, JSON.stringify({
      theme: 'auto',
      email: {
        email: '',
        password: '',
        smtpHost: '',
        smtpPort: 587,
        secure: false
      },
      emailHistory: []
      }));
    }
    
    // Initialize email history file
    if (!fs.existsSync(emailHistoryPath)) {
      fs.writeFileSync(emailHistoryPath, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Removed all OAuth helpers (no longer used)

let mainWindow;
let schedulerInterval;

/**
 * Creates the main Electron window
 */
function createWindow() {
  const iconPath = path.join(__dirname, 'logo ico.ico');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  initializeStorage();
  
  // Set app icon for taskbar
  const iconPath = path.join(__dirname, 'logo ico.ico');
  if (fs.existsSync(iconPath)) {
    app.dock?.setIcon(iconPath); // macOS
  }
  
  createWindow();
  startScheduler();
  
  // Also check immediately on startup, not just every 60 seconds
  setTimeout(() => {
    checkAndSendReminders();
  }, 5000); // Check after 5 seconds of startup

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Checks for due reminders and sends emails
 * This function can be called directly or by the scheduler
 */
async function checkAndSendReminders() {
  try {
    const reminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
    const now = new Date();
    const emailsToSend = [];
    const reminderUpdates = new Map(); // Track sent times per reminder

    // First pass: identify emails to send and calculate remaining times
    for (const reminder of reminders) {
      const remainingTimes = [];
      const dueTimes = [];

      // Check each scheduled time for this reminder
      for (const scheduledTime of reminder.scheduledTimes) {
        const scheduledDate = new Date(scheduledTime);
        
        // If this time is due or past due, and not yet sent, prepare to send email
        if (scheduledDate <= now) {
          if (!reminder.sentTimes || !reminder.sentTimes.includes(scheduledTime)) {
            emailsToSend.push({
              reminder,
              scheduledTime
            });
            dueTimes.push(scheduledTime);
          }
          // Past due times are not added to remainingTimes
        } else {
          // This time is still in the future, keep it
          remainingTimes.push(scheduledTime);
        }
      }

      // Store updates for this reminder
      if (remainingTimes.length > 0 || dueTimes.length > 0) {
        reminderUpdates.set(reminder.id, {
          reminder,
          remainingTimes,
          dueTimes
        });
      }
    }

    // Second pass: send emails and track successful sends
    const successfulSends = new Set();
    for (const { reminder, scheduledTime } of emailsToSend) {
      try {
        await sendReminderEmail(reminder, scheduledTime);
        // Mark as successfully sent
        const key = `${reminder.id}:${scheduledTime}`;
        successfulSends.add(key);
        console.log(`✓ Email sent successfully for reminder: ${reminder.title}`);
      } catch (error) {
        console.error(`✗ Failed to send email for reminder ${reminder.id} (${reminder.title}):`, error.message);
        // Also notify the renderer about the error
        if (mainWindow) {
          mainWindow.webContents.send('email-error', {
            reminderId: reminder.id,
            reminderTitle: reminder.title,
            error: error.message
          });
        }
        // Don't mark as sent if email failed - will retry on next scheduler cycle
      }
    }

    // Third pass: build final reminders list with updates
    const finalReminders = [];
    for (const reminder of reminders) {
      const update = reminderUpdates.get(reminder.id);
      
      if (!update) {
        // Reminder has no remaining times and no pending sends
        // Check if it's already in success state (has deletionTime)
        if (reminder.deletionTime) {
          // Check if deletion time has passed
          const deletionTime = new Date(reminder.deletionTime);
          if (deletionTime > now) {
            // Still waiting for deletion, keep it
            finalReminders.push(reminder);
          }
          // If deletion time has passed, skip it (will be deleted)
        } else {
          // No deletion time set, check if all emails were sent
          const allSent = reminder.scheduledTimes?.every(time => 
            reminder.sentTimes?.includes(time)
          );
          if (allSent && reminder.sentTimes && reminder.sentTimes.length > 0) {
            // All emails sent, set deletion time (24 hours from now)
            reminder.deletionTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            finalReminders.push(reminder);
          }
        }
        continue;
      }

      // Update sentTimes with successfully sent emails
      if (!reminder.sentTimes) {
        reminder.sentTimes = [];
      }
      for (const dueTime of update.dueTimes) {
        const key = `${reminder.id}:${dueTime}`;
        if (successfulSends.has(key) && !reminder.sentTimes.includes(dueTime)) {
          reminder.sentTimes.push(dueTime);
        }
      }

      // Only keep reminders with remaining scheduled times
      if (update.remainingTimes.length > 0) {
        reminder.scheduledTimes = update.remainingTimes;
        finalReminders.push(reminder);
      } else {
        // All times have been sent, check if deletion time is set
        const allSent = reminder.scheduledTimes?.every(time => 
          reminder.sentTimes?.includes(time)
        );
        if (allSent && reminder.sentTimes && reminder.sentTimes.length > 0) {
          // All emails sent, set deletion time (24 hours from now) if not already set
          if (!reminder.deletionTime) {
            reminder.deletionTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          }
          // Check if deletion time has passed
          if (reminder.deletionTime) {
            const deletionTime = new Date(reminder.deletionTime);
            if (deletionTime > now) {
              // Still waiting for deletion, keep it
              finalReminders.push(reminder);
            }
            // If deletion time has passed, skip it (will be deleted)
          } else {
            finalReminders.push(reminder);
          }
        }
      }
    }

    // Save final reminders list
    fs.writeFileSync(remindersPath, JSON.stringify(finalReminders, null, 2));

    // Notify renderer process if reminders were updated
    if (emailsToSend.length > 0 || reminders.length !== finalReminders.length) {
      mainWindow?.webContents.send('reminders-updated');
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

/**
 * Background scheduler that checks for due reminders every 60 seconds
 * and sends emails via NodeMailer
 */
function startScheduler() {
  // Check every 10 seconds for responsive email sending
  // Change to 60000 (60 seconds) for production if desired
  schedulerInterval = setInterval(() => {
    checkAndSendReminders();
  }, 10000); // Check every 10 seconds for faster response and testing
}

/**
 * Sends a reminder email using NodeMailer with SMTP
 */
async function sendReminderEmail(reminder, scheduledTime) {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  // Check if email is configured
  if (!settings.email || !settings.email.email || !settings.email.password || !settings.email.smtpHost || !settings.email.smtpPort) {
    throw new Error('Email not configured. Please fill Email, Password, SMTP Host, and Port in Settings.');
  }

  const emailConfig = settings.email;

  // Determine recipient emails - support both old (single email) and new (emails array) format
  const recipients = reminder.emails && reminder.emails.length > 0 
    ? reminder.emails 
    : (reminder.email ? [reminder.email] : []);

  if (recipients.length === 0) {
    throw new Error('No email recipients specified for reminder');
  }

  // Email content: description if available, otherwise title
  const emailBody = reminder.description || reminder.title;

  console.log(`\n[EMAIL] Attempting to send reminder: "${reminder.title}"`);
  console.log(`[EMAIL] SMTP Host: ${emailConfig.smtpHost}`);
  console.log(`[EMAIL] Recipients: ${recipients.join(', ')}`);

  try {
    // Always use explicit SMTP settings
    const port = Number(emailConfig.smtpPort);
    const isSslPort = port === 465;
    
    // For port 587: use STARTTLS (secure: false, requireTLS: true)
    // For port 465: use direct SSL/TLS (secure: true)
    // For other ports: respect the secure setting
    const transporterConfig = {
      host: emailConfig.smtpHost,
      port: port,
      secure: isSslPort, // Only true for port 465, false for 587 (STARTTLS)
      requireTLS: !isSslPort && port === 587, // Require TLS upgrade for port 587
      auth: {
        user: emailConfig.email.trim(),
        pass: emailConfig.password.trim()
      },
      tls: {
        // Improve compatibility across providers
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    };

    const transporter = nodemailer.createTransport(transporterConfig);

    const result = await transporter.sendMail({
      from: emailConfig.email,
      to: recipients.join(', '),
      subject: reminder.title,
      text: emailBody,
      html: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`
    });

    console.log(`✓ Email sent successfully!`);
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Response: ${result.response}\n`);
    
    return result;
  } catch (error) {
    console.error(`✗ Email send failed:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Code: ${error.code || 'N/A'}\n`);
    throw error;
  }
}

// IPC Handlers for communication with renderer process

// Get all reminders
ipcMain.handle('get-reminders', () => {
  try {
    const reminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
    return reminders;
  } catch (error) {
    console.error('Error reading reminders:', error);
    return [];
  }
});

// Save a new reminder
ipcMain.handle('save-reminder', (event, reminder) => {
  try {
    const reminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
    
    // Generate unique ID
    const id = Date.now().toString();
    const newReminder = {
      id,
      ...reminder,
      createdAt: new Date().toISOString(),
      sentTimes: []
    };
    
    reminders.push(newReminder);
    fs.writeFileSync(remindersPath, JSON.stringify(reminders, null, 2));
    return { success: true, id };
  } catch (error) {
    console.error('Error saving reminder:', error);
    return { success: false, error: error.message };
  }
});

// Delete a reminder
ipcMain.handle('delete-reminder', (event, id) => {
  try {
    const reminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
    const filtered = reminders.filter(r => r.id !== id);
    fs.writeFileSync(remindersPath, JSON.stringify(filtered, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return { success: false, error: error.message };
  }
});

// Clear all reminders
ipcMain.handle('clear-all-reminders', () => {
  try {
    fs.writeFileSync(remindersPath, JSON.stringify([], null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error clearing reminders:', error);
    return { success: false, error: error.message };
  }
});

// Get settings
ipcMain.handle('get-settings', () => {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return settings;
  } catch (error) {
    console.error('Error reading settings:', error);
    return {
      theme: 'auto',
      email: {
        provider: '',
        email: '',
        password: '',
        smtpHost: '',
        smtpPort: 587,
        secure: false
      }
    };
  }
});

// Save settings
ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
});

// Manually trigger reminder check (for testing)
ipcMain.handle('check-reminders-now', async () => {
  try {
    await checkAndSendReminders();
    return { success: true };
  } catch (error) {
    console.error('Error checking reminders:', error);
    return { success: false, error: error.message };
  }
});

// Removed all OAuth IPC handlers (not used anymore)

// Get email history
ipcMain.handle('get-email-history', () => {
  try {
    if (fs.existsSync(emailHistoryPath)) {
      const history = JSON.parse(fs.readFileSync(emailHistoryPath, 'utf8'));
      return history || [];
    }
    return [];
  } catch (error) {
    console.error('Error reading email history:', error);
    return [];
  }
});

// Add to email history
ipcMain.handle('add-to-email-history', (event, emails) => {
  try {
    let history = [];
    
    if (fs.existsSync(emailHistoryPath)) {
      history = JSON.parse(fs.readFileSync(emailHistoryPath, 'utf8'));
    }
    
    // Add new emails (avoid duplicates)
    const newEmails = Array.isArray(emails) ? emails : [emails];
    for (const email of newEmails) {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail && !history.includes(trimmedEmail)) {
        history.push(trimmedEmail);
      }
    }
    
    // Keep only last 50 emails
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    fs.writeFileSync(emailHistoryPath, JSON.stringify(history, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving email history:', error);
    return { success: false, error: error.message };
  }
});

// Clear email history
ipcMain.handle('clear-email-history', () => {
  try {
    fs.writeFileSync(emailHistoryPath, JSON.stringify([]));
    return { success: true };
  } catch (error) {
    console.error('Error clearing email history:', error);
    return { success: false, error: error.message };
  }
});

// Test email sending
ipcMain.handle('test-email', async (event, testEmail) => {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (!settings.email || !settings.email.email || !settings.email.password || !settings.email.smtpHost || !settings.email.smtpPort) {
      return { success: false, error: 'Email not configured. Please fill Email, Password, SMTP Host, and Port in Settings.' };
    }

    if (!testEmail) {
      return { success: false, error: 'Test email address is required.' };
    }

    const emailConfig = settings.email;

    console.log(`\n[TEST EMAIL] Testing email sending...`);
    console.log(`[TEST EMAIL] SMTP Host: ${emailConfig.smtpHost}`);
    console.log(`[TEST EMAIL] From: ${emailConfig.email}`);
    console.log(`[TEST EMAIL] To: ${testEmail}`);

    const port = Number(emailConfig.smtpPort);
    const isSslPort = port === 465;
    
    // For port 587: use STARTTLS (secure: false, requireTLS: true)
    // For port 465: use direct SSL/TLS (secure: true)
    // For other ports: respect the secure setting
    const transporterConfig = {
      host: emailConfig.smtpHost,
      port: port,
      secure: isSslPort, // Only true for port 465, false for 587 (STARTTLS)
      requireTLS: !isSslPort && port === 587, // Require TLS upgrade for port 587
      auth: {
        user: emailConfig.email.trim(),
        pass: emailConfig.password.trim()
      },
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    };

    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection for clearer errors during testing
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP verify failed:', verifyError.message);
      return { success: false, error: `SMTP verify failed: ${verifyError.message}` };
    }

    const result = await transporter.sendMail({
      from: emailConfig.email,
      to: testEmail,
      subject: 'RemindMail Test Email',
      text: 'This is a test email from RemindMail. If you received this, your email configuration is working correctly!',
      html: '<p>This is a test email from RemindMail. If you received this, your email configuration is working correctly!</p>'
    });

    console.log(`✓ Test email sent successfully! Message ID: ${result.messageId}\n`);
    return { success: true, message: 'Test email sent successfully! Check your inbox (and spam folder).' };
  } catch (error) {
    console.error('✗ Test email failed:');
    console.error(`  Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
});

