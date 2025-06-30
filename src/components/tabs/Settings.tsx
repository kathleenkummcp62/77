import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

export function Settings() {
  const [activeSection, setActiveSection] = useState('performance');
  const [hasChanges, setHasChanges] = useState(false);

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

  const sections: ConfigSection[] = [
    {
      id: 'performance',
      title: 'Performance',
      icon: Zap,
      description: 'Threading, rate limiting, and optimization settings'
    },
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      description: 'SSL, proxy, and security configuration'
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

  const handleSave = () => {
    // Save configuration
    console.log('Saving configuration:', config);
    setHasChanges(false);
  };

  const handleReset = () => {
    // Reset to defaults
    setHasChanges(false);
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

  const renderPerformanceSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thread Count
          </label>
          <input
            type="number"
            value={config.threads}
            onChange={(e) => handleConfigChange('threads', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="100"
            max="10000"
          />
          <p className="text-xs text-gray-500 mt-1">Number of concurrent threads (100-10000)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rate Limit (RPS)
          </label>
          <input
            type="number"
            value={config.rateLimit}
            onChange={(e) => handleConfigChange('rateLimit', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="100"
            max="20000"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum requests per second</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeout (seconds)
          </label>
          <input
            type="number"
            value={config.timeout}
            onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="1"
            max="30"
          />
          <p className="text-xs text-gray-500 mt-1">Connection timeout in seconds</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Retries
          </label>
          <input
            type="number"
            value={config.maxRetries}
            onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="0"
            max="10"
          />
          <p className="text-xs text-gray-500 mt-1">Number of retry attempts</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Auto-scaling</h4>
            <p className="text-sm text-gray-600">Automatically adjust thread count based on performance</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoScale}
              onChange={(e) => handleConfigChange('autoScale', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {config.autoScale && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Threads
              </label>
              <input
                type="number"
                value={config.minThreads}
                onChange={(e) => handleConfigChange('minThreads', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="100"
                max={config.maxThreads}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Threads
              </label>
              <input
                type="number"
                value={config.maxThreads}
                onChange={(e) => handleConfigChange('maxThreads', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min={config.minThreads}
                max="10000"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
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
            <h4 className="font-medium text-gray-900">Email Notifications</h4>
            <p className="text-sm text-gray-600">Send email alerts for important events</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.emailNotifications}
              onChange={(e) => handleConfigChange('emailNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL
          </label>
          <input
            type="url"
            value={config.webhookUrl}
            onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="https://your-webhook-url.com/endpoint"
          />
          <p className="text-xs text-gray-500 mt-1">Send notifications to this webhook URL</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Threshold
            </label>
            <input
              type="number"
              value={config.alertThreshold}
              onChange={(e) => handleConfigChange('alertThreshold', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when valid credentials found</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Interval (seconds)
            </label>
            <input
              type="number"
              value={config.reportInterval}
              onChange={(e) => handleConfigChange('reportInterval', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="60"
            />
            <p className="text-xs text-gray-500 mt-1">How often to send status reports</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <select
            value={config.theme}
            onChange={(e) => handleConfigChange('theme', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Refresh Interval (ms)
          </label>
          <input
            type="number"
            value={config.refreshInterval}
            onChange={(e) => handleConfigChange('refreshInterval', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="500"
            max="10000"
            step="500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Show Advanced Metrics</h4>
            <p className="text-sm text-gray-600">Display detailed performance metrics</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.showAdvancedMetrics}
              onChange={(e) => handleConfigChange('showAdvancedMetrics', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Compact Mode</h4>
            <p className="text-sm text-gray-600">Use compact layout for smaller screens</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.compactMode}
              onChange={(e) => handleConfigChange('compactMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderServerSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SSH Timeout (s)
          </label>
          <input
            type="number"
            value={config.sshTimeout}
            onChange={(e) => handleConfigChange('sshTimeout', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="1"
            max="120"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SSH Port
          </label>
          <input
            type="number"
            value={config.sshPort}
            onChange={(e) => handleConfigChange('sshPort', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="1"
            max="65535"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Connections
          </label>
          <input
            type="number"
            value={config.maxConnections}
            onChange={(e) => handleConfigChange('maxConnections', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min="1"
          max="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default User
          </label>
          <input
            type="text"
            value={config.sshUser}
            onChange={(e) => handleConfigChange('sshUser', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="root"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Private Key Path
          </label>
          <input
            type="text"
            value={config.sshKeyPath}
            onChange={(e) => handleConfigChange('sshKeyPath', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="/path/to/id_rsa"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Keep Alive</h4>
            <p className="text-sm text-gray-600">Maintain persistent SSH connections</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.keepAlive}
              onChange={(e) => handleConfigChange('keepAlive', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Auto Reconnect</h4>
            <p className="text-sm text-gray-600">Reconnect dropped SSH sessions automatically</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoReconnect}
              onChange={(e) => handleConfigChange('autoReconnect', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Compression</h4>
            <p className="text-sm text-gray-600">Use compression for SSH transfers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.compression}
              onChange={(e) => handleConfigChange('compression', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
      <p className="text-sm text-gray-500 ml-0.5">More server management options will be available soon.</p>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Debug Logging</h4>
            <p className="text-sm text-gray-600">Log verbose output for troubleshooting</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.debugLogging}
              onChange={(e) => handleConfigChange('debugLogging', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Experimental Features</h4>
            <p className="text-sm text-gray-600">Enable beta functionality</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.experimentalFeatures}
              onChange={(e) => handleConfigChange('experimentalFeatures', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Log Level
          </label>
          <select
            value={config.logLevel}
            onChange={(e) => handleConfigChange('logLevel', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="trace">Trace</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Config Path
          </label>
          <input
            type="text"
            value={config.customConfigPath}
            onChange={(e) => handleConfigChange('customConfigPath', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="/etc/vpn-extra.conf"
          />
        </div>
      </div>
      <p className="text-sm text-gray-500 ml-0.5">Additional advanced options are under development.</p>
    </div>
  );

  const renderContentMap: Record<string, () => JSX.Element> = {
    performance: renderPerformanceSettings,
    security: renderSecuritySettings,
    notifications: renderNotificationSettings,
    display: renderDisplaySettings,
    servers: renderServerSettings,
    advanced: renderAdvancedSettings,
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
