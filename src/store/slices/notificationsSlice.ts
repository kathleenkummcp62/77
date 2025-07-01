import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source?: string;
  link?: string;
}

interface NotificationSettings {
  showPopups: boolean;
  sound: boolean;
  desktop: boolean;
  filterLevel: 'all' | 'important' | 'critical';
  retention: number; // days
}

interface NotificationsState {
  notifications: Notification[];
  settings: NotificationSettings;
}

// Load notifications from localStorage
const loadNotifications = (): Notification[] => {
  try {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      return JSON.parse(savedNotifications);
    }
  } catch (error) {
    console.error('Failed to load notifications from localStorage:', error);
  }
  return [];
};

// Save notifications to localStorage
const saveNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications to localStorage:', error);
  }
};

// Load settings from localStorage
const loadSettings = (): NotificationSettings => {
  try {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Failed to load notification settings from localStorage:', error);
  }
  return {
    showPopups: true,
    sound: true,
    desktop: false,
    filterLevel: 'all',
    retention: 30
  };
};

// Save settings to localStorage
const saveSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save notification settings to localStorage:', error);
  }
};

const initialState: NotificationsState = {
  notifications: loadNotifications(),
  settings: loadSettings(),
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        read: false,
        ...action.payload,
      };
      
      state.notifications.unshift(notification);
      
      // Limit the number of stored notifications (keep last 100)
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
      
      saveNotifications(state.notifications);
      
      // Request desktop notification permission if enabled
      if (state.settings.desktop && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
        saveNotifications(state.notifications);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      saveNotifications(state.notifications);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
      saveNotifications(state.notifications);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      saveNotifications(state.notifications);
    },
    updateSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
      saveSettings(state.settings);
    },
    clearOldNotifications: (state) => {
      const cutoff = Date.now() - (state.settings.retention * 24 * 60 * 60 * 1000);
      state.notifications = state.notifications.filter(n => n.timestamp >= cutoff);
      saveNotifications(state.notifications);
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  updateSettings,
  clearOldNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;