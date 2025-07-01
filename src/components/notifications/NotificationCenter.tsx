import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Trash2,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../store';
import { 
  markAllAsRead, 
  clearAllNotifications, 
  markAsRead,
  removeNotification,
  addNotification
} from '../../store/slices/notificationsSlice';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const dispatch = useAppDispatch();
  const { notifications, settings } = useAppSelector(state => state.notifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'success' | 'warning' | 'error' | 'info'>('all');
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };
  
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      dispatch(clearAllNotifications());
    }
  };
  
  const handleMarkAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };
  
  const handleRemove = (id: string) => {
    dispatch(removeNotification(id));
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertCircle;
      case 'info': default: return Info;
    }
  };
  
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info': default: return 'primary';
    }
  };
  
  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="primary">{unreadCount} unread</Badge>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-2 border-b border-gray-200 flex items-center space-x-2 overflow-x-auto">
          <Button 
            size="sm" 
            variant={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'success' ? 'success' : 'ghost'}
            onClick={() => setFilter('success')}
          >
            Success
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'warning' ? 'warning' : 'ghost'}
            onClick={() => setFilter('warning')}
          >
            Warning
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'error' ? 'error' : 'ghost'}
            onClick={() => setFilter('error')}
          >
            Error
          </Button>
          <Button 
            size="sm" 
            variant={filter === 'info' ? 'primary' : 'ghost'}
            onClick={() => setFilter('info')}
          >
            Info
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Bell className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
              <p className="text-sm text-gray-500">
                {filter !== 'all' 
                  ? `No ${filter} notifications found` 
                  : 'You don\'t have any notifications yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map(notification => {
                const NotificationIcon = getNotificationIcon(notification.type);
                const colorVariant = getNotificationColor(notification.type);
                
                return (
                  <div 
                    key={notification.id} 
                    className={`p-3 border rounded-lg ${notification.read ? 'bg-white' : `bg-${colorVariant}-50`}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full bg-${colorVariant}-100 flex-shrink-0`}>
                        <NotificationIcon className={`h-4 w-4 text-${colorVariant}-600`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-900' : `text-${colorVariant}-900`}`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                            {!notification.read && (
                              <button 
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-gray-400 hover:text-gray-500"
                                title="Mark as read"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleRemove(notification.id)}
                              className="text-gray-400 hover:text-gray-500"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <span title={format(new Date(notification.timestamp), 'PPpp')}>
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                          
                          {notification.source && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{notification.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200 flex items-center justify-between">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark all as read
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {/* Open settings */}}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Bell component for the header
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications } = useAppSelector(state => state.notifications);
  const dispatch = useAppDispatch();
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Demo: Add a test notification
  const addTestNotification = () => {
    const types = ['success', 'warning', 'error', 'info'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    
    const titles = {
      success: 'Operation Successful',
      warning: 'Warning',
      error: 'Error Occurred',
      info: 'Information'
    };
    
    const messages = {
      success: [
        'VPN scan completed successfully',
        'Files uploaded to servers',
        'Results collected from all servers',
        'Database connection established'
      ],
      warning: [
        'Server CPU usage is high',
        'Low disk space on server',
        'Some servers are unreachable',
        'Task taking longer than expected'
      ],
      error: [
        'Connection failed',
        'Database error',
        'Script execution failed',
        'Authentication error'
      ],
      info: [
        'System update available',
        'New scan started',
        'Configuration changes applied',
        'Scheduled task reminder'
      ]
    };
    
    const message = messages[type][Math.floor(Math.random() * messages[type].length)];
    
    dispatch(addNotification({
      type,
      title: titles[type],
      message,
      source: 'System'
    }));
  };
  
  return (
    <>
      <button 
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-error-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      <NotificationCenter 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}