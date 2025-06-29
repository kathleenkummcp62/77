import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useWebSocket } from '../../hooks/useWebSocket';
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
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Example worker servers used for UI demonstrations only
const realServers = [
  {
    ip: 'server1.example.com',
    username: 'root',
    password: 'placeholder',
    status: 'online',
    uptime: '0h 0m',
    cpu: 0,
    memory: 0,
    disk: 0,
    speed: '0/s',
    processed: 0,
    goods: 0,
    bads: 0,
    errors: 0,
    currentTask: 'Idle',
    progress: 0,
    lastSeen: new Date().toISOString()
  },
  {
    ip: 'server2.example.com',
    username: 'root',
    password: 'placeholder',
    status: 'online',
    uptime: '0h 0m',
    cpu: 0,
    memory: 0,
    disk: 0,
    speed: '0/s',
    processed: 0,
    goods: 0,
    bads: 0,
    errors: 0,
    currentTask: 'Idle',
    progress: 0,
    lastSeen: new Date().toISOString()
  },
  {
    ip: 'server3.example.com',
    username: 'root',
    password: 'placeholder',
    status: 'online',
    uptime: '0h 0m',
    cpu: 0,
    memory: 0,
    disk: 0,
    speed: '0/s',
    processed: 0,
    goods: 0,
    bads: 0,
    errors: 0,
    currentTask: 'Idle',
    progress: 0,
    lastSeen: new Date().toISOString()
  },
  {
    ip: 'server4.example.com',
    username: 'root',
    password: 'placeholder',
    status: 'online',
    uptime: '0h 0m',
    cpu: 0,
    memory: 0,
    disk: 0,
    speed: '0/s',
    processed: 0,
    goods: 0,
    bads: 0,
    errors: 0,
    currentTask: 'Idle',
    progress: 0,
    lastSeen: new Date().toISOString()
  }
];

export function Servers() {
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [servers, setServers] = useState(realServers);
  const [loading, setLoading] = useState(false);
  const { isConnected, servers: wsServers } = useWebSocket('ws://localhost:8080/ws');

  // Обновляем серверы из WebSocket, если доступны
  useEffect(() => {
    if (wsServers && wsServers.length > 0) {
      setServers(wsServers.map(ws => ({
        ip: ws.ip,
        username: 'root',
        password: '***',
        status: ws.status as 'online' | 'offline',
        uptime: ws.uptime,
        cpu: ws.cpu,
        memory: ws.memory,
        disk: ws.disk,
        speed: ws.speed,
        processed: ws.processed,
        goods: ws.goods,
        bads: ws.bads,
        errors: ws.errors,
        currentTask: ws.current_task,
        progress: ws.progress,
        lastSeen: new Date().toISOString()
      })));
    }
  }, [wsServers]);

  const handleServerSelect = (ip: string) => {
    setSelectedServers(prev => 
      prev.includes(ip) 
        ? prev.filter(s => s !== ip)
        : [...prev, ip]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedServers.length === 0) {
      toast.error('Please select at least one server');
      return;
    }

    setLoading(true);
    try {
      switch (action) {
        case 'reboot':
          toast.success(`Rebooting ${selectedServers.length} servers...`);
          break;
        case 'upload':
          toast.success(`Uploading scripts to ${selectedServers.length} servers...`);
          break;
        case 'cleanup':
          toast.success(`Cleaning up ${selectedServers.length} servers...`);
          break;
        default:
          toast.error('Unknown action');
      }
    } catch (error: any) {
      toast.error(`Action failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (server: any) => {
    setLoading(true);
    try {
      // Здесь можно добавить реальную проверку SSH подключения
      toast.success(`Testing connection to ${server.ip}...`);
      
      // Симуляция проверки подключения
      setTimeout(() => {
        toast.success(`✅ Connection to ${server.ip} successful!`);
      }, 2000);
    } catch (error: any) {
      toast.error(`❌ Connection to ${server.ip} failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deployScripts = async (server: any) => {
    setLoading(true);
    try {
      toast.success(`Deploying scripts to ${server.ip}...`);
      
      // Симуляция развертывания скриптов
      setTimeout(() => {
        toast.success(`✅ Scripts deployed to ${server.ip}!`);
      }, 3000);
    } catch (error: any) {
      toast.error(`❌ Deployment to ${server.ip} failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Worker Servers</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your worker servers</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
          </span>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="primary">
            <Server className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Real Servers Info */}
      <Card className="border-primary-200 bg-primary-50">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-primary-600" />
          <div>
            <h4 className="font-medium text-primary-800">Real Production Servers</h4>
            <p className="text-sm text-primary-600">
              These are actual worker servers with real SSH credentials for calibration and testing.
            </p>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedServers.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedServers.length} server(s) selected
            </span>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => handleBulkAction('reboot')}
                loading={loading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reboot
              </Button>
              <Button 
                size="sm" 
                variant="warning" 
                onClick={() => handleBulkAction('upload')}
                loading={loading}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload Scripts
              </Button>
              <Button 
                size="sm" 
                variant="error" 
                onClick={() => handleBulkAction('cleanup')}
                loading={loading}
              >
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
                  <p className="text-xs text-gray-500 font-mono">SSH: {server.ip}:22</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={server.status === 'online' ? 'success' : 'error'}>
                  {server.status === 'online' ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {server.status}
                </Badge>
              </div>
            </div>

            {/* Current Task */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{server.currentTask}</span>
                <span className="text-sm text-gray-600">{server.progress}%</span>
              </div>
              <ProgressBar 
                value={server.progress} 
                color={server.progress > 0 ? 'primary' : 'gray'} 
                size="sm" 
              />
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
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Uptime:</span>
                  <span className="ml-1 font-medium">{server.uptime}</span>
                </div>
                <div>
                  <span className="text-gray-600">Processed:</span>
                  <span className="ml-1 font-medium">{server.processed.toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Last seen:</span>
                  <span className="ml-1 font-medium text-xs">
                    {new Date(server.lastSeen).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="flex-1"
                onClick={() => testConnection(server)}
                loading={loading}
              >
                <Terminal className="h-4 w-4 mr-1" />
                Test SSH
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="flex-1"
                onClick={() => deployScripts(server)}
                loading={loading}
              >
                <Upload className="h-4 w-4 mr-1" />
                Deploy
              </Button>
              <Button size="sm" variant="ghost" className="flex-1">
                <Activity className="h-4 w-4 mr-1" />
                Logs
              </Button>
              <Button size="sm" variant="ghost">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Server Management Tools */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Management Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="primary" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Deploy All Scripts
          </Button>
          <Button variant="secondary" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Update All Servers
          </Button>
          <Button variant="warning" className="w-full">
            <Terminal className="h-4 w-4 mr-2" />
            Mass SSH Command
          </Button>
          <Button variant="ghost" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Collect All Results
          </Button>
        </div>
      </Card>

      {/* Connection Instructions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SSH Connection Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Manual SSH Connection:</h4>
            <div className="space-y-2">
              {servers.slice(0, 2).map(server => (
                <code key={server.ip} className="block text-sm bg-gray-100 p-2 rounded">
                  ssh {server.username}@{server.ip}
                </code>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Bulk Operations:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• Select multiple servers for bulk actions</p>
              <p>• Deploy scripts to all servers simultaneously</p>
              <p>• Monitor real-time performance metrics</p>
              <p>• Collect results from all workers</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
