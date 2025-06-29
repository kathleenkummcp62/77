import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Shield, Play, Pause, Settings, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';

const vpnTypes = [
  {
    id: 'fortinet',
    name: 'Fortinet VPN',
    description: 'FortiGate SSL VPN brute force scanner',
    script: 'sers1.py',
    color: 'bg-red-500',
    status: 'idle',
    lastRun: '2 minutes ago',
    successRate: 12.5,
    totalAttempts: 15420,
    validFound: 1927,
    successIndicators: [
      'vpn/tunnel',
      'portal.html', 
      'FortiGate',
      'sslvpn_portal',
      'logout'
    ],
    testCredentials: [
      'https://200.113.15.26:4443;guest;guest',
      'https://195.150.192.5:443;admin;password'
    ]
  },
  {
    id: 'globalprotect',
    name: 'Global Protect VPN',
    description: 'Palo Alto GlobalProtect scanner',
    script: 'sers2.go',
    color: 'bg-blue-500',
    status: 'idle',
    lastRun: '1 hour ago',
    successRate: 8.3,
    totalAttempts: 8950,
    validFound: 743,
    successIndicators: [
      'Download Windows 64 bit GlobalProtect agent',
      'GlobalProtect Portal',
      'gp-portal',
      'clientDownload'
    ],
    testCredentials: [
      'https://216.229.124.44:443;test;test',
      'https://72.26.131.86:443;user;pass'
    ]
  },
  {
    id: 'citrix',
    name: 'Citrix VPN',
    description: 'Citrix NetScaler Gateway scanner',
    script: 'sers3.py',
    color: 'bg-green-500',
    status: 'idle',
    lastRun: '45 minutes ago',
    successRate: 15.2,
    totalAttempts: 6780,
    validFound: 1031,
    successIndicators: [
      'CredentialUpdateService',
      'NetScaler Gateway',
      'citrix-logon',
      'NSGateway'
    ],
    testCredentials: [
      'https://citrix.example.com;user;pass'
    ]
  },
  {
    id: 'cisco',
    name: 'Cisco VPN',
    description: 'Cisco ASA SSL VPN scanner',
    script: 'sers4.go',
    color: 'bg-purple-500',
    status: 'idle',
    lastRun: '3 hours ago',
    successRate: 6.8,
    totalAttempts: 12340,
    validFound: 839,
    successIndicators: [
      'SSL VPN Service + webvpn_logout',
      '/+CSCOE+/',
      'webvpn_portal',
      'ANYCONNECT'
    ],
    testCredentials: [
      'https://74.209.225.52:443:test:test:remote_access',
      'https://67.202.240.148:443:admin:pass:ANYCONNECT'
    ]
  },
  {
    id: 'sonicwall',
    name: 'SonicWall VPN',
    description: 'SonicWall SSL VPN scanner',
    script: 'sonicwall.py',
    color: 'bg-orange-500',
    status: 'idle',
    lastRun: '2 hours ago',
    successRate: 9.1,
    totalAttempts: 5670,
    validFound: 516,
    successIndicators: [
      'SonicWall',
      'NetExtender',
      'sslvpn',
      'portal.html'
    ],
    testCredentials: [
      'https://69.21.239.19:4433;test;test;LocalDomain'
    ]
  },
  {
    id: 'sophos',
    name: 'Sophos VPN',
    description: 'Sophos UTM/XG Firewall VPN',
    script: 'sophos.py',
    color: 'bg-indigo-500',
    status: 'idle',
    lastRun: '4 hours ago',
    successRate: 7.3,
    totalAttempts: 3450,
    validFound: 252,
    successIndicators: [
      'Sophos',
      'userportal',
      'myaccount',
      'welcome'
    ],
    testCredentials: [
      'https://213.139.132.204:6443;test;test;intern.company.de'
    ]
  }
];

export function VPNTypes() {
  const [selectedVPN, setSelectedVPN] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const { startScanner, stopScanner, isConnected } = useWebSocket('ws://localhost:8080/ws');

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
    toast.success(`Testing ${vpn.name} with sample credentials`);
    // Здесь можно добавить логику тестирования
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPN Types</h1>
          <p className="text-gray-600 mt-1">Manage and monitor different VPN scanning modules</p>
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

            {/* Success Indicators */}
            {showDetails === vpn.id && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Success Indicators:</h4>
                <div className="space-y-1">
                  {vpn.successIndicators.map((indicator, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-success-600" />
                      <code className="text-xs text-blue-700 bg-blue-100 px-1 rounded">{indicator}</code>
                    </div>
                  ))}
                </div>
                <h4 className="font-medium text-blue-800 mt-3 mb-2">Test Credentials:</h4>
                <div className="space-y-1">
                  {vpn.testCredentials.map((cred, idx) => (
                    <code key={idx} className="block text-xs text-gray-600 bg-gray-100 p-1 rounded">
                      {cred}
                    </code>
                  ))}
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
                <Activity className="h-4 w-4 mr-2" />
                {showDetails === vpn.id ? 'Hide' : 'Details'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleTest(vpn)}
              >
                <Settings className="h-4 w-4 mr-2" />
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Logic</h3>
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
              <li>• Any modified password = BAD</li>
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
      </Card>
    </div>
  );
}