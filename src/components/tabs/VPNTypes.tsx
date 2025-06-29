import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Shield, Play, Pause, Settings, Activity } from 'lucide-react';

const vpnTypes = [
  {
    id: 'fortinet',
    name: 'Fortinet VPN',
    description: 'FortiGate SSL VPN brute force scanner',
    script: 'sers1.py',
    color: 'bg-red-500',
    status: 'active',
    lastRun: '2 minutes ago',
    successRate: 12.5,
    totalAttempts: 15420,
    validFound: 1927
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
    validFound: 743
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
    validFound: 1031
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
    validFound: 839
  }
];

export function VPNTypes() {
  const [selectedVPN, setSelectedVPN] = useState<string | null>(null);

  const handleStart = (vpnId: string) => {
    console.log(`Starting ${vpnId} scanner`);
    // Here you would trigger the actual scanner
  };

  const handleStop = (vpnId: string) => {
    console.log(`Stopping ${vpnId} scanner`);
    // Here you would stop the scanner
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPN Types</h1>
          <p className="text-gray-600 mt-1">Manage and monitor different VPN scanning modules</p>
        </div>
        <Button variant="primary">
          <Settings className="h-4 w-4 mr-2" />
          Configure All
        </Button>
      </div>

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

            {/* Actions */}
            <div className="flex space-x-3">
              {vpn.status === 'active' ? (
                <Button 
                  variant="error" 
                  size="sm" 
                  onClick={() => handleStop(vpn.id)}
                  className="flex-1"
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
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Scanner
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                View Logs
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="primary" className="w-full">
            <Play className="h-4 w-4 mr-2" />
            Start All Scanners
          </Button>
          <Button variant="error" className="w-full">
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
    </div>
  );
}