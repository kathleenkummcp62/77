import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Server, 
  Activity, 
  RefreshCw, 
  Terminal, 
  Trash2, 
  Upload,
  Download,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';

const servers = [
  {
    ip: '192.168.8.251',
    username: 'root',
    status: 'online',
    uptime: '12h 34m',
    cpu: 45,
    memory: 67,
    disk: 23,
    speed: '2.1k/s',
    processed: 15420,
    goods: 1927,
    bads: 12893,
    errors: 600,
    currentTask: 'Processing Fortinet VPN',
    progress: 78
  },
  {
    ip: '192.168.8.252',
    username: 'root',
    status: 'online',
    uptime: '11h 45m',
    cpu: 62,
    memory: 54,
    disk: 31,
    speed: '2.4k/s',
    processed: 18950,
    goods: 2156,
    bads: 15794,
    errors: 1000,
    currentTask: 'Processing Global Protect',
    progress: 65
  },
  {
    ip: '192.168.8.253',
    username: 'root',
    status: 'online',
    uptime: '13h 12m',
    cpu: 38,
    memory: 71,
    disk: 19,
    speed: '1.9k/s',
    processed: 12340,
    goods: 1876,
    bads: 9864,
    errors: 600,
    currentTask: 'Processing Citrix VPN',
    progress: 82
  },
  {
    ip: '192.168.8.254',
    username: 'root',
    status: 'online',
    uptime: '10h 28m',
    cpu: 71,
    memory: 48,
    disk: 41,
    speed: '2.7k/s',
    processed: 21780,
    goods: 1482,
    bads: 19298,
    errors: 1000,
    currentTask: 'Processing Cisco VPN',
    progress: 91
  }
];

export function Servers() {
  const [selectedServers, setSelectedServers] = useState<string[]>([]);

  const handleServerSelect = (ip: string) => {
    setSelectedServers(prev => 
      prev.includes(ip) 
        ? prev.filter(s => s !== ip)
        : [...prev, ip]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on servers:`, selectedServers);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servers</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your worker servers</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="primary">
            <Server className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedServers.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedServers.length} server(s) selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('reboot')}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reboot
              </Button>
              <Button size="sm" variant="warning" onClick={() => handleBulkAction('upload')}>
                <Upload className="h-4 w-4 mr-1" />
                Upload Scripts
              </Button>
              <Button size="sm" variant="error" onClick={() => handleBulkAction('cleanup')}>
                <Trash2 className="h-4 w-4 mr-1" />
                Cleanup
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Server Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servers.map((server) => (
          <Card key={server.ip} className="hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedServers.includes(server.ip)}
                  onChange={() => handleServerSelect(server.ip)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Server className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{server.ip}</h3>
                  <p className="text-sm text-gray-600">User: {server.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
            </div>

            {/* Current Task */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{server.currentTask}</span>
                <span className="text-sm text-gray-600">{server.progress}%</span>
              </div>
              <ProgressBar value={server.progress} color="primary" size="sm" />
            </div>

            {/* System Resources */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">CPU</span>
                  <span className="text-xs font-medium">{server.cpu}%</span>
                </div>
                <ProgressBar 
                  value={server.cpu} 
                  color={server.cpu > 80 ? 'error' : server.cpu > 60 ? 'warning' : 'success'} 
                  size="sm" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Memory</span>
                  <span className="text-xs font-medium">{server.memory}%</span>
                </div>
                <ProgressBar 
                  value={server.memory} 
                  color={server.memory > 80 ? 'error' : server.memory > 60 ? 'warning' : 'success'} 
                  size="sm" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Disk</span>
                  <span className="text-xs font-medium">{server.disk}%</span>
                </div>
                <ProgressBar 
                  value={server.disk} 
                  color={server.disk > 80 ? 'error' : server.disk > 60 ? 'warning' : 'success'} 
                  size="sm" 
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4 text-center">
              <div>
                <p className="text-lg font-bold text-success-600">{server.goods.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Valid</p>
              </div>
              <div>
                <p className="text-lg font-bold text-error-600">{server.bads.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Invalid</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning-600">{server.errors.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Errors</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary-600">{server.speed}</p>
                <p className="text-xs text-gray-600">Speed</p>
              </div>
            </div>

            {/* Server Info */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uptime: {server.uptime}</span>
                <span className="text-gray-600">Processed: {server.processed.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button size="sm" variant="ghost" className="flex-1">
                <Terminal className="h-4 w-4 mr-1" />
                SSH
              </Button>
              <Button size="sm" variant="ghost" className="flex-1">
                <Activity className="h-4 w-4 mr-1" />
                Logs
              </Button>
              <Button size="sm" variant="ghost" className="flex-1">
                <Download className="h-4 w-4 mr-1" />
                Results
              </Button>
              <Button size="sm" variant="error">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}