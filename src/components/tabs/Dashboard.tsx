import React, { useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Activity, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Wifi,
  WifiOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function Dashboard() {
  const { isConnected, stats, servers, error } = useWebSocket('ws://localhost:8080/ws');

  // Mock chart data - in real implementation, this would come from WebSocket
  const mockData = [
    { time: '00:00', goods: stats?.goods || 120, bads: stats?.bads || 45, errors: stats?.errors || 12 },
    { time: '01:00', goods: (stats?.goods || 120) + 60, bads: (stats?.bads || 45) + 22, errors: (stats?.errors || 12) + 3 },
    { time: '02:00', goods: (stats?.goods || 120) + 120, bads: (stats?.bads || 45) + 44, errors: (stats?.errors || 12) + 7 },
    { time: '03:00', goods: (stats?.goods || 120) + 200, bads: (stats?.bads || 45) + 67, errors: (stats?.errors || 12) + 10 },
    { time: '04:00', goods: (stats?.goods || 120) + 330, bads: (stats?.bads || 45) + 89, errors: (stats?.errors || 12) + 6 },
    { time: '05:00', goods: (stats?.goods || 120) + 460, bads: (stats?.bads || 45) + 111, errors: (stats?.errors || 12) + 13 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time system overview and statistics</p>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-success-500" />
              <span className="text-sm text-success-600">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-error-500" />
              <span className="text-sm text-error-600">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Connection Error */}
      {error && (
        <Card className="border-error-200 bg-error-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-error-600" />
            <div>
              <h4 className="font-medium text-error-800">Connection Error</h4>
              <p className="text-sm text-error-600">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Credentials</p>
              <p className="text-3xl font-bold text-success-600">{stats?.goods?.toLocaleString() || '0'}</p>
              <p className="text-sm text-success-600 mt-1">
                {stats?.success_rate ? `${stats.success_rate.toFixed(1)}% success rate` : 'No data'}
              </p>
            </div>
            <div className="p-3 bg-success-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
              <p className="text-3xl font-bold text-error-600">{stats?.bads?.toLocaleString() || '0'}</p>
              <p className="text-sm text-error-600 mt-1">
                {stats?.processed ? `${((stats.bads / stats.processed) * 100).toFixed(1)}% of total` : 'No data'}
              </p>
            </div>
            <div className="p-3 bg-error-100 rounded-full">
              <XCircle className="h-8 w-8 text-error-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Servers</p>
              <p className="text-3xl font-bold text-primary-600">
                {servers?.filter(s => s.status === 'online').length || 0}/{servers?.length || 0}
              </p>
              <p className="text-sm text-success-600 mt-1">All online</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Server className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processing Speed</p>
              <p className="text-3xl font-bold text-warning-600">
                {stats?.rps ? `${stats.rps.toLocaleString()}/s` : '0/s'}
              </p>
              <p className="text-sm text-warning-600 mt-1">
                Peak: {stats?.peak_rps ? `${stats.peak_rps.toLocaleString()}/s` : '0/s'}
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-full">
              <Zap className="h-8 w-8 text-warning-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Success Rate Trend</h3>
            <Badge variant={isConnected ? "success" : "gray"}>
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="goods" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Error Analysis</h3>
            <Badge variant="warning">Monitoring</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bads" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="errors" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Server Status */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Server Status</h3>
          <div className="flex space-x-2">
            <Badge variant="success">{servers?.filter(s => s.status === 'online').length || 0} Online</Badge>
            <Badge variant="gray">{servers?.filter(s => s.status !== 'online').length || 0} Offline</Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {servers?.map((server, index) => (
            <div key={server.ip} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">{server.ip}</span>
                <Badge variant={server.status === 'online' ? 'success' : 'error'}>
                  {server.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{server.progress}%</span>
                </div>
                <ProgressBar value={server.progress} color="primary" size="sm" />
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                  <div>Speed: {server.speed}</div>
                  <div>Uptime: {server.uptime}</div>
                  <div>Goods: {server.goods}</div>
                  <div>Errors: {server.errors}</div>
                </div>
                
                <div className="text-xs text-gray-500 mt-2 truncate">
                  {server.current_task}
                </div>
              </div>
            </div>
          )) || (
            // Fallback when no server data
            <div className="col-span-4 text-center text-gray-500 py-8">
              No server data available. Check WebSocket connection.
            </div>
          )}
        </div>
      </Card>

      {/* Performance Metrics */}
      {stats && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{stats.threads}</p>
              <p className="text-sm text-gray-600">Active Threads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">{stats.avg_rps}</p>
              <p className="text-sm text-gray-600">Avg RPS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning-600">{Math.floor(stats.uptime / 60)}m</p>
              <p className="text-sm text-gray-600">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.processed.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Processed</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}