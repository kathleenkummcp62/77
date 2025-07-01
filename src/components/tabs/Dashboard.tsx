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
import { useAppSelector } from '../../store';
import { ResultsChart } from '../charts/ResultsChart';
import { PerformanceChart } from '../charts/PerformanceChart';
import { ServerPerformanceGrid } from '../charts/ServerPerformanceGrid';

export function Dashboard() {
  const { isConnected, stats, servers, error } = useWebSocket();
  
  // Real statistics data (starting with zeros)
  const realStats = stats || {
    goods: 0,
    bads: 0,
    errors: 0,
    offline: 0,
    ipblock: 0,
    processed: 0,
    rps: 0,
    avg_rps: 0,
    peak_rps: 0,
    threads: 0,
    uptime: 0,
    success_rate: 0
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPN Bruteforce Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring and control center</p>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-success-500" />
              <span className="text-sm text-success-600">WebSocket Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-error-500" />
              <span className="text-sm text-error-600">WebSocket Disconnected</span>
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
              <p className="text-xs text-error-500 mt-1">
                Make sure the mock server is running: <code>npm run mock-server</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Real System Status */}
      <Card className="border-primary-200 bg-primary-50">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-primary-600" />
          <div>
            <h4 className="font-medium text-primary-800">Production System Ready</h4>
            <p className="text-sm text-primary-600">
              Real worker servers configured with actual SSH credentials. Ready for VPN testing and calibration.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Credentials</p>
              <p className="text-3xl font-bold text-success-600">{realStats.goods.toLocaleString()}</p>
              <p className="text-sm text-success-600 mt-1">
                {realStats.success_rate ? `${realStats.success_rate.toFixed(1)}% success rate` : 'Ready to start'}
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
              <p className="text-3xl font-bold text-error-600">{realStats.bads.toLocaleString()}</p>
              <p className="text-sm text-error-600 mt-1">
                {realStats.processed ? `${((realStats.bads / realStats.processed) * 100).toFixed(1)}% of total` : 'No data yet'}
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
                {servers.filter(s => s.status === 'online').length}/{servers.length}
              </p>
              <p className="text-sm text-success-600 mt-1">All systems ready</p>
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
                {realStats.rps ? `${realStats.rps.toLocaleString()}/s` : '0/s'}
              </p>
              <p className="text-sm text-warning-600 mt-1">
                Peak: {realStats.peak_rps ? `${realStats.peak_rps.toLocaleString()}/s` : '0/s'}
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
        <ResultsChart type="area" title="Success Rate Trend" />
        <PerformanceChart title="Performance Metrics" metric="rps" />
      </div>

      {/* Server Status */}
      <ServerPerformanceGrid />

      {/* Performance Metrics */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{realStats.threads}</p>
            <p className="text-sm text-gray-600">Active Threads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success-600">{realStats.avg_rps}</p>
            <p className="text-sm text-gray-600">Avg RPS</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning-600">{Math.floor(realStats.uptime / 60)}m</p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{realStats.processed.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Processed</p>
          </div>
        </div>
      </Card>

      {/* Test Credentials Info */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Test Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Fortinet VPN</h4>
            <div className="space-y-1 text-sm">
              <code className="block bg-gray-100 p-1 rounded">https://200.113.15.26:4443;guest;guest</code>
              <code className="block bg-gray-100 p-1 rounded">https://195.150.192.5:443;guest;guest</code>
              <p className="text-xs text-gray-500 mt-1">9 valid credentials available</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">GlobalProtect</h4>
            <div className="space-y-1 text-sm">
              <code className="block bg-gray-100 p-1 rounded">https://216.229.124.44:443;test;test</code>
              <code className="block bg-gray-100 p-1 rounded">https://72.26.131.86:443;test;test</code>
              <p className="text-xs text-gray-500 mt-1">6 valid credentials available</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Other VPN Types</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• SonicWall: 9 credentials</p>
              <p>• Sophos: 6 credentials</p>
              <p>• WatchGuard: 10 credentials</p>
              <p>• Cisco ASA: 8 credentials</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}