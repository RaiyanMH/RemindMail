const { useState, useEffect } = React;

// Main App Component
function App() {
  const [reminders, setReminders] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'auto',
    email: {
      provider: '',
      email: '',
      password: '',
      smtpHost: '',
      smtpPort: 587,
      secure: false
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  // Load reminders and settings on mount
  useEffect(() => {
    // Wait for electronAPI to be available
    if (!window.electronAPI) {
      console.error('electronAPI not available');
      return;
    }
    
    loadReminders();
    loadSettings();
    
    // Set up listener for updates from main process
    const removeListener = window.electronAPI.onRemindersUpdated(() => {
      loadReminders();
    });
    
    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  // Theme management: detect system preference and apply theme
  useEffect(() => {
    const updateTheme = () => {
      let themeToApply = settings.theme;
      
      if (settings.theme === 'auto') {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeToApply = prefersDark ? 'dark' : 'light';
      }
      
      setCurrentTheme(themeToApply);
      
      // Apply theme class to document
      const html = document.documentElement;
      if (themeToApply === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    };
    
    updateTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => updateTheme();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const loadReminders = async () => {
    try {
      if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
      }
      const data = await window.electronAPI.getReminders();
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const loadSettings = async () => {
    try {
      if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
      }
      const data = await window.electronAPI.getSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await window.electronAPI.saveSettings(newSettings);
      setSettings(newSettings);
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      try {
        await window.electronAPI.deleteReminder(id);
        loadReminders();
      } catch (error) {
        console.error('Error deleting reminder:', error);
        alert('Failed to delete reminder');
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all reminders? This cannot be undone.')) {
      try {
        await window.electronAPI.clearAllReminders();
        loadReminders();
        setShowSettings(false);
      } catch (error) {
        console.error('Error clearing reminders:', error);
        alert('Failed to clear reminders');
      }
    }
  };

  // Calculate next scheduled time for a reminder
  const getNextScheduledTime = (reminder) => {
    if (!reminder.scheduledTimes || reminder.scheduledTimes.length === 0) {
      return null;
    }
    
    const now = new Date();
    const futureTimes = reminder.scheduledTimes
      .map(t => new Date(t))
      .filter(t => t > now)
      .sort((a, b) => a - b);
    
    return futureTimes.length > 0 ? futureTimes[0] : null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              RemindMail
            </h1>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {reminders.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No reminders</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new reminder.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onDelete={handleDeleteReminder}
                getNextScheduledTime={getNextScheduledTime}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-semibold">Add Reminder</span>
      </button>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <AddReminderModal
          onClose={() => setShowAddModal(false)}
          onSave={async (reminder) => {
            try {
              await window.electronAPI.saveReminder(reminder);
              loadReminders();
              setShowAddModal(false);
            } catch (error) {
              console.error('Error saving reminder:', error);
              alert('Failed to save reminder: ' + error.message);
            }
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          onClearAll={handleClearAll}
        />
      )}
    </div>
  );
}

// Reminder Card Component
function ReminderCard({ reminder, onDelete, getNextScheduledTime }) {
  const [expandedTimes, setExpandedTimes] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const nextTime = getNextScheduledTime(reminder);
  const remainingCount = reminder.scheduledTimes ? reminder.scheduledTimes.length : 0;
  const emails = reminder.emails && reminder.emails.length > 0 
    ? reminder.emails 
    : (reminder.email ? [reminder.email] : []);

  // Check if reminder is in success state (all emails sent)
  useEffect(() => {
    // Check if there's a saved deletion time (set by main.js when all emails are sent)
    if (reminder.deletionTime) {
      const deletionTime = new Date(reminder.deletionTime);
      const now = new Date();
      const diff = deletionTime - now;
      
      if (diff > 0) {
        setShowSuccess(true);
        const interval = setInterval(() => {
          const now = new Date();
          const diff = deletionTime - now;
          
          if (diff <= 0) {
            clearInterval(interval);
            onDelete(reminder.id);
          } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setCountdown(`${hours}h ${minutes}m ${seconds}s`);
          }
        }, 1000);
        
        return () => clearInterval(interval);
      } else {
        // Deletion time has passed, delete immediately
        onDelete(reminder.id);
      }
    } else if (remainingCount === 0 && reminder.sentTimes && reminder.sentTimes.length > 0) {
      // Check if all scheduled times have been sent (but deletionTime not yet set)
      const allSent = reminder.scheduledTimes?.every(time => 
        reminder.sentTimes?.includes(time)
      );
      
      if (allSent && !showSuccess) {
        // Show success state but wait for main.js to set deletionTime
        // The countdown will start on next render when deletionTime is available
        setShowSuccess(true);
        setCountdown('24h 0m 0s');
      }
    }
  }, [reminder, remainingCount, showSuccess, onDelete]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Show success state if all emails sent
  if (showSuccess) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-md p-6 border-2 border-green-500 dark:border-green-600">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                Reminder Successful
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-400 mb-2">
              All emails have been sent successfully.
            </p>
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-3">
              Deleting in: {countdown || '24h 0m 0s'}
            </p>
            <button
              onClick={() => onDelete(reminder.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Delete Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {reminder.title}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {emails.length > 0 ? (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">
                    {emails.length} recipient{emails.length !== 1 ? 's' : ''}:
                  </span>
                </div>
                <div className="ml-5 space-y-1">
                  {(expandedEmails ? emails : emails.slice(0, 2)).map((email, idx) => (
                    <div key={idx} className="text-sm">{email}</div>
                  ))}
                  {emails.length > 2 && !expandedEmails && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      +{emails.length - 2} more
                    </div>
                  )}
                </div>
                {emails.length > 2 && (
                  <button
                    onClick={() => setExpandedEmails(!expandedEmails)}
                    className="mt-1 ml-5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    {expandedEmails ? 'Show less' : 'Show all'}
                    <svg
                      className={`w-3 h-3 transition-transform ${expandedEmails ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <div>No email address</div>
            )}
          </div>
          {reminder.description && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {reminder.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(reminder.id)}
          className="ml-2 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete reminder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {nextTime && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Next: {formatDate(nextTime)}
          </div>
        )}
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {remainingCount} time{remainingCount !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>

      {remainingCount > 1 && (
        <button
          onClick={() => setExpandedTimes(!expandedTimes)}
          className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
        >
          {expandedTimes ? 'Collapse' : 'Expand'} all times
          <svg
            className={`w-4 h-4 transition-transform ${expandedTimes ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {expandedTimes && reminder.scheduledTimes && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">All scheduled times:</h4>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {reminder.scheduledTimes
              .map(t => new Date(t))
              .sort((a, b) => a - b)
              .map((time, idx) => (
                <li key={idx} className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  {formatDate(time)}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Add Reminder Modal Component
function AddReminderModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emails, setEmails] = useState(['']);
  const [scheduledTimes, setScheduledTimes] = useState([{ date: '', time: '' }]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState([]);

  const addTimeSlot = () => {
    setScheduledTimes([...scheduledTimes, { date: '', time: '' }]);
  };

  const removeTimeSlot = (index) => {
    if (scheduledTimes.length > 1) {
      setScheduledTimes(scheduledTimes.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index, field, value) => {
    const updated = [...scheduledTimes];
    updated[index][field] = value;
    setScheduledTimes(updated);
  };

  const addEmailSlot = () => {
    setEmails([...emails, '']);
  };

  const removeEmailSlot = (index) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmailSlot = (index, value) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
    
    // Show suggestions if value matches history
    if (value.trim() && emailHistory.length > 0) {
      const filtered = emailHistory.filter(e => 
        e.toLowerCase().includes(value.toLowerCase()) && e.toLowerCase() !== value.toLowerCase()
      );
      const suggestions = showEmailSuggestions.slice();
      suggestions[index] = filtered.slice(0, 5);
      setShowEmailSuggestions(suggestions);
    } else {
      const suggestions = showEmailSuggestions.slice();
      suggestions[index] = [];
      setShowEmailSuggestions(suggestions);
    }
  };

  const selectEmailSuggestion = (index, suggestedEmail) => {
    const updated = [...emails];
    updated[index] = suggestedEmail;
    setEmails(updated);
    const suggestions = showEmailSuggestions.slice();
    suggestions[index] = [];
    setShowEmailSuggestions(suggestions);
  };

  // Load email history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await window.electronAPI.getEmailHistory();
        setEmailHistory(history || []);
        setShowEmailSuggestions(emails.map(() => []));
      } catch (error) {
        console.error('Error loading email history:', error);
      }
    };
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    // Validate all email addresses
    const validEmails = [];
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i].trim();
      if (!email) {
        alert(`Please fill in email address ${i + 1} or remove it`);
        return;
      }
      if (!email.includes('@') || !email.includes('.')) {
        alert(`Please enter a valid email address for email ${i + 1}`);
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert(`Please enter a valid email address for email ${i + 1}`);
        return;
      }
      validEmails.push(email);
    }

    // Validate all time slots
    const validTimes = [];
    for (let i = 0; i < scheduledTimes.length; i++) {
      const slot = scheduledTimes[i];
      if (!slot.date || !slot.time) {
        alert(`Please fill in both date and time for slot ${i + 1}`);
        return;
      }
      const dateTime = new Date(`${slot.date}T${slot.time}`);
      if (isNaN(dateTime.getTime())) {
        alert(`Invalid date/time for slot ${i + 1}`);
        return;
      }
      if (dateTime <= new Date()) {
        alert(`Slot ${i + 1} must be in the future`);
        return;
      }
      validTimes.push(dateTime.toISOString());
    }

    // Save emails to history
    try {
      await window.electronAPI.addToEmailHistory(validEmails);
    } catch (error) {
      console.error('Error saving email history:', error);
    }

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      emails: validEmails,
      scheduledTimes: validTimes
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Reminder</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Reminder title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Email body content (if left blank, title will be used)"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Addresses <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addEmailSlot}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Email
              </button>
            </div>

            {emails.map((email, index) => (
              <div key={index} className="mb-2">
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmailSlot(index, e.target.value)}
                      onFocus={() => {
                        if (email.trim() && emailHistory.length > 0) {
                          const filtered = emailHistory.filter(e => 
                            e.toLowerCase().includes(email.toLowerCase()) && e.toLowerCase() !== email.toLowerCase()
                          );
                          const suggestions = showEmailSuggestions.slice();
                          suggestions[index] = filtered.slice(0, 5);
                          setShowEmailSuggestions(suggestions);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicking
                        setTimeout(() => {
                          const suggestions = showEmailSuggestions.slice();
                          suggestions[index] = [];
                          setShowEmailSuggestions(suggestions);
                        }, 200);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="recipient@example.com"
                      required
                    />
                    {showEmailSuggestions[index] && showEmailSuggestions[index].length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {showEmailSuggestions[index].map((suggestedEmail, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectEmailSuggestion(index, suggestedEmail)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white"
                          >
                            {suggestedEmail}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmailSlot(index)}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Scheduled Times <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Time
              </button>
            </div>

            {scheduledTimes.map((slot, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateTimeSlot(index, 'date', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateTimeSlot(index, 'time', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {scheduledTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(index)}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Settings Modal Component
function SettingsModal({ settings, onClose, onSave, onClearAll }) {
  const [theme, setTheme] = useState(settings.theme || 'auto');
  const [email, setEmail] = useState(settings.email || { email: '', password: '', smtpHost: '', smtpPort: 587, secure: false });
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailHistory, setEmailHistory] = useState([]);

  // Load email history on mount
  useEffect(() => {
    loadEmailHistory();
  }, []);

  // Listen for email errors
  useEffect(() => {
    const removeListener = window.electronAPI.onEmailError((event, data) => {
      setTestEmailResult({ success: false, error: data.error });
    });
    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  const loadEmailHistory = async () => {
    try {
      const history = await window.electronAPI.getEmailHistory();
      setEmailHistory(history || []);
    } catch (error) {
      console.error('Error loading email history:', error);
    }
  };

  const clearEmailHistory = async () => {
    if (confirm('Are you sure you want to clear email history?')) {
      try {
        await window.electronAPI.clearEmailHistory();
        setEmailHistory([]);
        alert('Email history cleared');
      } catch (error) {
        console.error('Error clearing email history:', error);
        alert('Failed to clear email history');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      theme,
      email
    });
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Theme Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="auto">Auto (System)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Choose your preferred theme. Auto will match your system preference.
            </p>
          </div>

          {/* Email Configuration (SMTP) */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Email Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Email Address
                </label>
                <input
                  type="email"
                  value={email.email}
                  onChange={(e) => setEmail({ ...email, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={email.password}
                    onChange={(e) => setEmail({ ...email, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your password or app password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42l-3.29-3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={email.smtpHost}
                  onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={email.smtpPort}
                  onChange={(e) => setEmail({ ...email, smtpPort: parseInt(e.target.value) || 587 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={email.secure}
                    onChange={(e) => setEmail({ ...email, secure: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  Use secure connection (TLS/SSL)
                </label>
              </div>
            </div>
          </div>

          {/* Email Test Section */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Test Email Configuration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Send a test email to verify your configuration is working.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!testEmail) {
                    alert('Please enter a test email address');
                    return;
                  }
                  setTestEmailLoading(true);
                  setTestEmailResult(null);
                  try {
                    const result = await window.electronAPI.testEmail(testEmail);
                    setTestEmailResult(result);
                  } catch (error) {
                    setTestEmailResult({ success: false, error: error.message || 'Failed to send test email' });
                  } finally {
                    setTestEmailLoading(false);
                  }
                }}
                disabled={testEmailLoading || !testEmail.trim() || !email.email?.trim() || !email.password?.trim() || !email.smtpHost?.trim() || !email.smtpPort || email.smtpPort <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testEmailLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Test Email
                  </>
                )}
              </button>
            </div>
            {testEmailResult && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${
                testEmailResult.success 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {testEmailResult.success ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {testEmailResult.message || 'Test email sent successfully! Check your inbox.'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Error: {testEmailResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email History Section */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Email History</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Previously used email addresses will appear as suggestions when creating reminders.
            </p>
            {emailHistory.length > 0 ? (
              <div className="mb-4">
                <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                  {emailHistory.map((emailAddr, idx) => (
                    <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                      {emailAddr}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearEmailHistory}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Clear Email History
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No email history yet. Email addresses will be saved when you create reminders.
              </p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h3>
            <button
              type="button"
              onClick={onClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All Reminders
            </button>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This will permanently delete all reminders. This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));

