const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Reminder operations
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  saveReminder: (reminder) => ipcRenderer.invoke('save-reminder', reminder),
  deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),
  clearAllReminders: () => ipcRenderer.invoke('clear-all-reminders'),
  
  // Settings operations
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  testEmail: (email) => ipcRenderer.invoke('test-email', email),
  checkRemindersNow: () => ipcRenderer.invoke('check-reminders-now'),
  
  // Email history operations
  getEmailHistory: () => ipcRenderer.invoke('get-email-history'),
  addToEmailHistory: (emails) => ipcRenderer.invoke('add-to-email-history', emails),
  clearEmailHistory: () => ipcRenderer.invoke('clear-email-history'),

  
  // Listen for reminders updates from main process
  onRemindersUpdated: (callback) => {
    ipcRenderer.on('reminders-updated', callback);
    return () => ipcRenderer.removeAllListeners('reminders-updated');
  },
  
  // Listen for email errors
  onEmailError: (callback) => {
    ipcRenderer.on('email-error', callback);
    return () => ipcRenderer.removeAllListeners('email-error');
  }
});

