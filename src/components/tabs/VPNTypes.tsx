import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Shield, Play, Pause, Settings, Activity, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';

// Sample VPN types for demonstration only.
// Never store real credentials in this file. Replace these placeholders with
// your own values during testing.
const sampleCredentials = [
  '203.0.113.10;user1;pass1',
  '203.0.113.11;user2;pass2'
];
const vpnTypes = [
  {
    id: 'fortinet',
    name: 'Fortinet VPN',
    description: 'FortiGate SSL VPN brute force scanner',
    script: 'sers1.py',
    color: 'bg-red-500',
    status: 'idle',
    lastRun: 'Never',
    successRate: 0,
    totalAttempts: 0,
    validFound: 0,
    successIndicators: [
      'vpn/tunnel',
      'portal.html', 
      'FortiGate',
      'sslvpn_portal',
      'logout',
      'dashboard',
      'welcome.html'
    ],
    realCredentials: sampleCredentials
  },
  {
    id: 'globalprotect',
    name: 'Global Protect VPN',
    description: 'Palo Alto GlobalProtect scanner',
    script: 'sers2.go',
    color: 'bg-blue-500',
    status: 'idle',
    lastRun: 'Never',
    successRate: 0,
    totalAttempts: 0,
    validFound: 0,
    successIndicators: [
      'Download Windows 64 bit GlobalProtect agent',
      'GlobalProtect Portal',
      'gp-portal',
      'clientDownload',
      'portal-userauthcookie'
    ],
    realCredentials: sampleCredentials
  },
  {
    id: 'sonicwall',
    name: 'SonicWall VPN',
    description: 'SonicWall SSL VPN scanner',
    script: 'sonicwall.py',
    color: 'bg-orange-500',
    status: 'idle',
    lastRun: 'Never',
    successRate: 0,
    totalAttempts: 0,
    validFound: 0,
    successIndicators: [
      'SonicWall',
      'NetExtender',
      'sslvpn',
      'portal.html',
      'welcome'
    ],
    realCredentials: sampleCredentials
  },
  {
    id: 'sophos',
    name: 'Sophos VPN',
    description: 'Sophos UTM/XG Firewall VPN',
    script: 'sophos.py',
    color: 'bg-indigo-500',
    status: 'idle',
    lastRun: 'Never',
    successRate: 0,
    totalAttempts: 0,
    validFound: 0,
    successIndicators: [
      'Sophos',
      'userportal',
      'myaccount',
      'welcome',
      'logout'
    ],
    realCredentials: sampleCredentials
  },
  {
    id: 'watchguard',
    name: 'WatchGuard VPN',
    description: 'WatchGuard Firebox SSL VPN',
    script: 'watchguard.py',
    color: 'bg-purple-500',
    status: 'idle',
    lastRun: 'Never',
    successRate: 0,
    totalAttempts: 0,
    validFound: 0,
    successIndicators: [
      'WatchGuard',
      'Firebox',
      'portal',
      'AuthPoint',
      'welcome'
    ],
    realCredentials: sampleCredentials
  },
  {
    id: 'cisco',
    name: 'Cisco ASA VPN',
    description: 'Cisco ASA SSL VPN scanner',
    script: 'cisco.go',
    color: 'bg-cyan-500',
    status: 'idle',
    lastRun: 'Never',
    successRate: 0,
    totalAttempts: 0,
    validFound: 0,
    successIndicators: [
      'SSL VPN Service + webvpn_logout',
      '/+CSCOE+/',
      'webvpn_portal',
      'ANYCONNECT',
      'remote_access'
    ],
    realCredentials: sampleCredentials
  }
];

export function VPNTypes() {
  const [selectedVPN, setSelectedVPN] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  // Use default WebSocket settings so the panel works locally and over the network
  const { startScanner, stopScanner, isConnected } = useWebSocket();

  const handleStart = (vpnId: string) => {
    if (!isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    startScanner(vpnId);
    toast.success(`Starting ${vpnId} scanner`);
  };

  const handleStop = (vpnId: string) => {
    if (!isConnected) {
      toast.error('Not connected to server');
      return;
    }
    
    stopScanner(vpnId);
    toast.success(`Stopping ${vpnId} scanner`);
  };

  const handleTest = (vpn: any) => {
    toast.success(`Testing ${vpn.name} with ${vpn.realCredentials.length} real credentials`);
    // Здесь можно добавить логику тестирования
  };

  const copyCredentials = (credentials: string[]) => {
    const text = credentials.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPN Types & Calibration</h1>
          <p className="text-gray-600 mt-1">Placeholder VPN credentials for UI testing</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Server Connected' : 'Server Disconnected'}
          </span>
          <Button variant="primary">
            <Settings className="h-4 w-4 mr-2" />
            Configure All
          </Button>
        </div>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <Card className="border-warning-200 bg-warning-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            <div>
              <h4 className="font-medium text-warning-800">Server Connection Required</h4>
              <p className="text-sm text-warning-600">
                Connect to the backend server to start/stop scanners. Check if the Go server is running on port 8080.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Example Credentials Info */}
      <Card className="border-success-200 bg-success-50">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-success-600" />
          <div>
          <h4 className="font-medium text-success-800">Example Credentials</h4>
          <p className="text-sm text-success-600">
            These credentials are placeholders provided for demonstration only.
            Total: {vpnTypes.reduce((sum, vpn) => sum + vpn.realCredentials.length, 0)} sample credentials across {vpnTypes.length} VPN types.
          </p>
          </div>
        </div>
      </Card>

      {/* VPN Type Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vpnTypes.map((vpn) => (
          <Card key={vpn.id} className="hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 ${vpn.color} rounded-lg`}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{vpn.name}</h3>
                  <p className="text-sm text-gray-600">{vpn.description}</p>
                </div>
              </div>
              <Badge 
                variant={vpn.status === 'active' ? 'success' : 'gray'}
              >
                {vpn.status === 'active' ? 'Running' : 'Idle'}
              </Badge>
            </div>

            {/* Example Credentials Count */}
            <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary-800">
                  Example Credentials Available
                </span>
                <Badge variant="primary">{vpn.realCredentials.length}</Badge>
              </div>
              <p className="text-xs text-primary-600 mt-1">
                Ready for testing and calibration
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-success-600">{vpn.validFound.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Valid Found</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{vpn.successRate}%</p>
                <p className="text-xs text-gray-600">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{vpn.totalAttempts.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Total Attempts</p>
              </div>
            </div>

            {/* Script Info */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Script: {vpn.script}</span>
                <span className="text-xs text-gray-500">Last run: {vpn.lastRun}</span>
              </div>
            </div>

            {/* Success Indicators & Credentials */}
            {showDetails === vpn.id && (
              <div className="mb-4 space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Success Indicators:</h4>
                  <div className="space-y-1">
                    {vpn.successIndicators.map((indicator, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-success-600" />
                        <code className="text-xs text-blue-700 bg-blue-100 px-1 rounded">{indicator}</code>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-800">Example Test Credentials:</h4>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyCredentials(vpn.realCredentials)}
                    >
                      Copy All
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {vpn.realCredentials.slice(0, 3).map((cred, idx) => (
                      <code key={idx} className="block text-xs text-gray-600 bg-gray-100 p-1 rounded">
                        {cred}
                      </code>
                    ))}
                    {vpn.realCredentials.length > 3 && (
                      <p className="text-xs text-gray-500">
                        ... and {vpn.realCredentials.length - 3} more credentials
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              {vpn.status === 'active' ? (
                <Button 
                  variant="error" 
                  size="sm" 
                  onClick={() => handleStop(vpn.id)}
                  className="flex-1"
                  disabled={!isConnected}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Scanner
                </Button>
              ) : (
                <Button 
                  variant="success" 
                  size="sm" 
                  onClick={() => handleStart(vpn.id)}
                  className="flex-1"
                  disabled={!isConnected}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Scanner
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDetails(showDetails === vpn.id ? null : vpn.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showDetails === vpn.id ? 'Hide' : 'Details'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleTest(vpn)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            variant="primary" 
            className="w-full"
            disabled={!isConnected}
            onClick={() => {
              vpnTypes.forEach(vpn => handleStart(vpn.id));
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Start All Scanners
          </Button>
          <Button 
            variant="error" 
            className="w-full"
            disabled={!isConnected}
            onClick={() => {
              vpnTypes.forEach(vpn => handleStop(vpn.id));
            }}
          >
            <Pause className="h-4 w-4 mr-2" />
            Stop All Scanners
          </Button>
          <Button variant="secondary" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Bulk Configure
          </Button>
          <Button variant="ghost" className="w-full">
            <Activity className="h-4 w-4 mr-2" />
            View All Logs
          </Button>
        </div>
      </Card>

      {/* Detection Logic Info */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Logic Validation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-success-600" />
              <h4 className="font-medium text-success-800">Valid (GOOD)</h4>
            </div>
            <ul className="text-sm text-success-700 space-y-1">
              <li>• HTTP 200 + success indicators</li>
              <li>• Redirect to portal/dashboard</li>
              <li>• Presence of logout buttons</li>
              <li>• VPN client download links</li>
              <li>• Welcome/portal pages</li>
              <li>• ✅ Example credentials will show GOOD</li>
            </ul>
          </div>

          <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <h4 className="font-medium text-error-800">Invalid (BAD)</h4>
            </div>
            <ul className="text-sm text-error-700 space-y-1">
              <li>• HTTP 200 without success indicators</li>
              <li>• Login form with error messages</li>
              <li>• "Invalid credentials" responses</li>
              <li>• Authentication failed pages</li>
              <li>• ❌ Modified password = BAD</li>
            </ul>
          </div>

          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <h4 className="font-medium text-warning-800">Errors/Timeout</h4>
            </div>
            <ul className="text-sm text-warning-700 space-y-1">
              <li>• Connection timeout</li>
              <li>• Network unreachable</li>
              <li>• SSL/TLS errors</li>
              <li>• Rate limiting (429)</li>
              <li>• Server errors (5xx)</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <h4 className="font-medium text-primary-800 mb-2">Calibration Instructions:</h4>
          <ol className="text-sm text-primary-700 space-y-1">
            <li>1. Test each VPN type with provided real credentials</li>
            <li>2. Verify GOOD results for valid credentials</li>
            <li>3. Test with modified passwords to verify BAD detection</li>
            <li>4. Check timeout handling with unreachable IPs</li>
            <li>5. Validate error classification accuracy</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
