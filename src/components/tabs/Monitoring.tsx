import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

export function Monitoring() {
  const { isConnected, stats, servers } = useWebSocket();
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [selectedMetric, setSelectedMetric] = useState<'rps' | 'cpu' | 'memory' | 'network'>('rps');

  // Mock historical data
  const performanceData = [
    { time: '00:00', rps: 1200, cpu: 45, memory: 67, network: 23, goods: 120, errors: 12 },
    { time: '00:15', rps: 1800, cpu: 52, memory: 71, network: 28, goods: 280, errors: 18 },
    { time: '00:30', rps: 2400, cpu: 68, memory: 74, network: 35, goods: 450, errors: 25 },
    { time: '00:45', rps: 2100, cpu: 61, memory: 69, network: 31, goods: 620, errors: 30 },
    { time: '01:00', rps: 2600, cpu: 73, memory: 78, network: 42, goods: 820, errors: 22 },
    { time: '01:15', rps: 2300, cpu: 66, memory: 72, network: 38, goods: 980, errors: 35 },
  ];

  const systemAlerts = [
    {
      id: '1',
      type: 'warning',
      message: 'High CPU usage on server 192.0.2.12 (78%)',
      timestamp: '2 minutes ago',
      severity: 'medium'
    },
    {
      id: '2',
      type: 'error',
      message: 'Connection timeout spike detected',
      timestamp: '5 minutes ago',
      severity: 'high'
    },
    {
      id: '3',
      type: 'info',
      message: 'Memory usage optimized on server 192.0.2.11',
      timestamp: '10 minutes ago',
      severity: 'low'
    },
    {
      id: '4',
      type: 'success',
      message: 'All servers operating within normal parameters',
      timestamp: '15 minutes ago',
      severity: 'low'
    }
  ];

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'rps': return performanceData.map(d => ({ ...d, value: d.rps }));
      case 'cpu': return performanceData.map(d => ({ ...d, value: d.cpu }));
      case 'memory': return performanceData.map(d => ({ ...d, value: d.memory }));
      case 'network': return performanceData.map(d => ({ ...d, value: d.network }));
      default: return performanceData.map(d => ({ ...d, value: d.rps }));
    }
  };

  const getMetricColor = () => {
    switch (selectedMetric) {
      case 'rps': return '#0ea5e9';
      case 'cpu': return '#f59e0b';
      case 'memory': return '#8b5cf6';
      case 'network': return '#22c55e';
      default: return '#0ea5e9';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Activity;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'primary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time system performance and health monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live Monitoring' : 'Disconnected'}
            </span>
          </div>
          <Button variant="ghost">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="primary">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current RPS</p>
              <p className="text-3xl font-bold text-primary-600">{stats?.rps?.toLocaleString() || '0'}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-success-600 mr-1" />
                <span className="text-sm text-success-600">+12% from avg</span>
              </div>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Zap className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg CPU Usage</p>
              <p className="text-3xl font-bold text-warning-600">62%</p>
              <div className="flex items-center mt-1">
                <TrendingDown className="h-4 w-4 text-success-600 mr-1" />
                <span className="text-sm text-success-600">-5% from peak</span>
              </div>
            </div>
            <div className="p-3 bg-warning-100 rounded-full">
              <Cpu className="h-8 w-8 text-warning-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-3xl font-bold text-purple-600">68%</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-warning-600 mr-1" />
                <span className="text-sm text-warning-600">+3% from avg</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <HardDrive className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Network I/O</p>
              <p className="text-3xl font-bold text-success-600">34 MB/s</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-success-600 mr-1" />
                <span className="text-sm text-success-600">Optimal</span>
              </div>
            </div>
            <div className="p-3 bg-success-100 rounded-full">
              <Wifi className="h-8 w-8 text-success-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="rps">Requests/Second</option>
              <option value="cpu">CPU Usage</option>
              <option value="memory">Memory Usage</option>
              <option value="network">Network I/O</option>
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={getMetricData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={getMetricColor()} 
              fill={getMetricColor()} 
              fillOpacity={0.3} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Server Health Grid */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Server Health Overview</h3>
          <Badge variant={isConnected ? "success" : "gray"}>
            {isConnected ? "Live Data" : "Offline"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {servers?.map((server, index) => (
            <div key={server.ip} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Server className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{server.ip}</h4>
                    <p className="text-sm text-gray-600">Uptime: {server.uptime}</p>
                  </div>
                </div>
                <Badge variant={server.status === 'online' ? 'success' : 'error'}>
                  {server.status}
                </Badge>
              </div>

              {/* Resource Usage */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">CPU Usage</span>
                    <span className="font-medium">{server.cpu}%</span>
                  </div>
                  <ProgressBar 
                    value={server.cpu} 
                    color={server.cpu > 80 ? 'error' : server.cpu > 60 ? 'warning' : 'success'} 
                    size="sm" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Memory</span>
                    <span className="font-medium">{server.memory}%</span>
                  </div>
                  <ProgressBar 
                    value={server.memory} 
                    color={server.memory > 80 ? 'error' : server.memory > 60 ? 'warning' : 'success'} 
                    size="sm" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Disk Usage</span>
                    <span className="font-medium">{server.disk}%</span>
                  </div>
                  <ProgressBar 
                    value={server.disk} 
                    color={server.disk > 80 ? 'error' : server.disk > 60 ? 'warning' : 'success'} 
                    size="sm" 
                  />
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-lg font-bold text-success-600">{server.goods}</p>
                  <p className="text-xs text-gray-600">Valid</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary-600">{server.speed}</p>
                  <p className="text-xs text-gray-600">Speed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-warning-600">{server.errors}</p>
                  <p className="text-xs text-gray-600">Errors</p>
                </div>
              </div>
            </div>
          )) || (
            <div className="col-span-2 text-center text-gray-500 py-8">
              No server data available
            </div>
          )}
        </div>
      </Card>

      {/* System Alerts */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Alert Settings
          </Button>
        </div>
        
        <div className="space-y-3">
          {systemAlerts.map(alert => {
            const AlertIcon = getAlertIcon(alert.type);
            return (
              <div key={alert.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className={`p-2 rounded-full bg-${getAlertColor(alert.type)}-100`}>
                  <AlertIcon className={`h-4 w-4 text-${getAlertColor(alert.type)}-600`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{alert.timestamp}</span>
                    <Badge variant={getAlertColor(alert.type) as any} size="sm">
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate by VPN Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Fortinet', success: 12.5, total: 15420 },
              { name: 'GlobalProtect', success: 11.4, total: 18950 },
              { name: 'SonicWall', success: 15.2, total: 12340 },
              { name: 'Cisco', success: 6.8, total: 21780 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="success" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Timeout', count: 1200 },
              { name: 'Connection', count: 800 },
              { name: 'Auth Failed', count: 600 },
              { name: 'Rate Limited', count: 400 },
              { name: 'Other', count: 300 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
