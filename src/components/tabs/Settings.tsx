import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  Download,
  Upload,
  Shield,
  Server,
  Zap,
  Bell,
  Eye,
  Lock,
  Globe,
  Database,
  AlertTriangle,
  User,
  Key
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store';
import { getUsers, updateUserPassword, getCurrentUser } from '../../lib/auth';
import { updateSettings } from '../../store/slices/notificationsSlice';
import toast from 'react-hot-toast';

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

export function Settings() {
  const [activeSection, setActiveSection] = useState('security');
  const [hasChanges, setHasChanges] = useState(false);
  const currentUser = useAppSelector(state => state.auth.user);
  const notificationSettings = useAppSelector(state => state.notifications.settings);
  const dispatch = useAppDispatch();

  const [config, setConfig] = useState({
    // Performance Settings
    threads: 3000,
    rateLimit: 8000,
    timeout: 3,
    maxRetries: 3,
    autoScale: true,
    minThreads: 1000,
    maxThreads: 5000,
    
    // Security Settings
    sslVerification: false,
    proxyEnabled: false,
    proxyRotation: true,
    rateLimitBypass: true,
    userAgentRotation: true,
    
    // Notification Settings
    emailNotifications: true,
    webhookUrl: '',
    alertThreshold: 1000,
    reportInterval: 3600,
    
    // Display Settings
    theme: 'dark',
    refreshInterval: 1000,
    showAdvancedMetrics: true,
    compactMode: false,
    
    // Server Settings
    sshTimeout: 30,
    maxConnections: 10,
    keepAlive: true,
    compression: true,
    sshPort: 22,
    sshUser: 'root',
    sshKeyPath: '',
    autoReconnect: true,

    // Advanced Settings
    debugLogging: false,
    logLevel: 'info',
    customConfigPath: '',
    experimentalFeatures: false
  });

  // Password change state
  const [passwordChange, setPasswordChange] = useState({
    username: currentUser?.username || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const sections: ConfigSection[] = [
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      description: 'Authentication, passwords, and security settings'
    },
    {
      id: 'performance',
      title: 'Performance',
      icon: Zap,
      description: 'Threading, rate limiting, and optimization settings'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Alerts, webhooks, and reporting settings'
    },
    {
      id: 'display',
      title: 'Display',
      icon: Eye,
      description: 'UI theme, refresh rates, and visual preferences'
    },
    {
      id: 'servers',
      title: 'Servers',
      icon: Server,
      description: 'SSH connections and server management'
    },
    {
      id: 'advanced',
      title: 'Advanced',
      icon: SettingsIcon,
      description: 'Expert settings and debugging options'
    }
  ];

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!passwordChange.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    
    if (!passwordChange.newPassword) {
      toast.error('New password is required');
      return;
    }
    
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    // Verify current password
    const users = getUsers();
    const user = users[passwordChange.username];
    
    if (!user || user.password !== passwordChange.currentPassword) {
      toast.error('Current password is incorrect');
      return;
    }
    
    // Update password
    const success = updateUserPassword(passwordChange.username, passwordChange.newPassword);
    
    if (success) {
      toast.success('Password updated successfully');
      setPasswordChange({
        ...passwordChange,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      toast.error('Failed to update password');
    }
  };

  const handleSave = () => {
    // Save configuration
    console.log('Saving configuration:', config);
    setHasChanges(false);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    // Reset to defaults
    setHasChanges(false);
    toast.success('Settings reset to defaults');
  };

  const handleExport = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vpn-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {/* Password Change Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-primary-600" />
          Change Password
        </h4>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={passwordChange.username}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordChange.currentPassword}
              onChange={(e) => setPasswordChange(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordChange.newPassword}
              onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordChange.confirmPassword}
              onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <Button type="submit" variant="primary">
            <Save className="h-4 w-4 mr-2" />
            Update Password
          </Button>
        </form>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">SSL Verification</h4>
            <p className="text-sm text-gray-600">Verify SSL certificates (may reduce speed)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.sslVerification}
              onChange={(e) => handleConfigChange('sslVerification', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Proxy Support</h4>
            <p className="text-sm text-gray-600">Route traffic through proxy servers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.proxyEnabled}
              onChange={(e) => handleConfigChange('proxyEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">User-Agent Rotation</h4>
            <p className="text-sm text-gray-600">Rotate browser user-agent strings</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.userAgentRotation}
              onChange={(e) => handleConfigChange('userAgentRotation', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Rate Limit Bypass</h4>
            <p className="text-sm text-gray-600">Attempt to bypass rate limiting</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.rateLimitBypass}
              onChange={(e) => handleConfigChange('rateLimitBypass', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-warning-800">Security Notice</h4>
            <p className="text-sm text-warning-700 mt-1">
              These settings are for authorized testing only. Ensure you have proper permission 
              before testing any systems. Misuse may violate terms of service or local laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Show Popup Notifications</h4>
            <p className="text-sm text-gray-600">Display toast notifications in the app</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.showPopups}
              onChange={(e) => dispatch(updateSettings({ showPopups: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Notification Sounds</h4>
            <p className="text-sm text-gray-600">Play sound when notifications arrive</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.sound}
              onChange={(e) => dispatch(updateSettings({ sound: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Desktop Notifications</h4>
            <p className="text-sm text-gray-600">Show browser notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.desktop}
              onChange={(e) => {
                if (e.target.checked && 'Notification' in window) {
                  if (Notification.permission !== 'granted') {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        dispatch(updateSettings({ desktop: true }));
                      } else {
                        toast.error('Permission for desktop notifications was denied');
                      }
                    });
                  } else {
                    dispatch(updateSettings({ desktop: true }));
                  }
                } else {
                  dispatch(updateSettings({ desktop: e.target.checked }));
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Filter Level
          </label>
          <select
            value={notificationSettings.filterLevel}
            onChange={(e) => dispatch(updateSettings({ filterLevel: e.target.value as any }))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All notifications</option>
            <option value="important">Important only (warnings & errors)</option>
            <option value="critical">Critical only (errors)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Control which notifications you receive</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Retention (days)
          </label>
          <input
            type="number"
            value={notificationSettings.retention}
            onChange={(e) => dispatch(updateSettings({ retention: parseInt(e.target.value) || 30 }))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="1"
            max="365"
          />
          <p className="text-xs text-gray-500 mt-1">How long to keep notifications before auto-deleting</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email for Notifications
          </label>
          <input
            type="email"
            value={config.webhookUrl}
            onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="your@email.com"
          />
          <p className="text-xs text-gray-500 mt-1">Receive important notifications via email</p>
        </div>
      </div>

      <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-primary-800">Notification Types</h4>
            <ul className="mt-2 text-sm text-primary-700 space-y-1">
              <li>• <span className="font-medium">Success:</span> Completed operations, valid credentials found</li>
              <li>• <span className="font-medium">Info:</span> System status, general information</li>
              <li>• <span className="font-medium">Warning:</span> Potential issues, performance concerns</li>
              <li>• <span className="font-medium">Error:</span> Failed operations, connection issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContentMap: Record<string, () => JSX.Element> = {
    security: renderSecuritySettings,
    notifications: renderNotificationSettings,
  };

  const renderContent = () => {
    const renderFn = renderContentMap[activeSection];
    return renderFn
      ? renderFn()
      : (
          <div className="text-center text-gray-500 py-8">
            Settings section coming soon...
          </div>
        );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure system behavior and preferences</p>
        </div>
        <div className="flex space-x-3">
          {hasChanges && (
            <Badge variant="warning">Unsaved Changes</Badge>
          )}
          <Button variant="ghost" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="ghost" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
          <nav className="space-y-2">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Settings Content */}
        <Card className="lg:col-span-3">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {sections.find(s => s.id === activeSection)?.title} Settings
            </h3>
            <p className="text-gray-600 mt-1">
              {sections.find(s => s.id === activeSection)?.description}
            </p>
          </div>
          
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}