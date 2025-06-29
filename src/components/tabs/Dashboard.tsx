import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Activity, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const mockData = [
  { time: '00:00', goods: 120, bads: 45, errors: 12 },
  { time: '01:00', goods: 180, bads: 67, errors: 8 },
  { time: '02:00', goods: 240, bads: 89, errors: 15 },
  { time: '03:00', goods: 320, bads: 112, errors: 22 },
  { time: '04:00', goods: 450, bads: 134, errors: 18 },
  { time: '05:00', goods: 580, bads: 156, errors: 25 },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time system overview and statistics</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live Updates</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Credentials</p>
              <p className="text-3xl font-bold text-success-600">1,247</p>
              <p className="text-sm text-success-600 mt-1">+12% from yesterday</p>
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
              <p className="text-3xl font-bold text-error-600">3,892</p>
              <p className="text-sm text-error-600 mt-1">+5% from yesterday</p>
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
              <p className="text-3xl font-bold text-primary-600">4/4</p>
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
              <p className="text-3xl font-bold text-warning-600">2.4k/s</p>
              <p className="text-sm text-warning-600 mt-1">Average rate</p>
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
            <Badge variant="success">Live</Badge>
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
            <Badge variant="success">4 Online</Badge>
            <Badge variant="gray">0 Offline</Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['192.168.8.251', '192.168.8.252', '192.168.8.253', '192.168.8.254'].map((ip, index) => (
            <div key={ip} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">{ip}</span>
                <Badge variant="success">Online</Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{65 + index * 5}%</span>
                </div>
                <ProgressBar value={65 + index * 5} color="primary" size="sm" />
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                  <div>Speed: {(2.1 + index * 0.3).toFixed(1)}k/s</div>
                  <div>Uptime: {12 + index}h</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Badge variant="primary">Real-time</Badge>
        </div>
        
        <div className="space-y-4">
          {[
            { type: 'success', message: 'Found 15 valid Fortinet credentials', time: '2 minutes ago', icon: CheckCircle },
            { type: 'info', message: 'Server 192.168.8.252 completed processing part_2.txt', time: '5 minutes ago', icon: Server },
            { type: 'warning', message: 'High error rate detected on Global Protect scanner', time: '8 minutes ago', icon: AlertTriangle },
            { type: 'success', message: 'Uploaded new credential list to all servers', time: '12 minutes ago', icon: CheckCircle },
            { type: 'info', message: 'System modules updated successfully', time: '15 minutes ago', icon: Activity },
          ].map((activity, index) => {
            const Icon = activity.icon;
            const colors = {
              success: 'text-success-600 bg-success-100',
              info: 'text-primary-600 bg-primary-100',
              warning: 'text-warning-600 bg-warning-100'
            };
            
            return (
              <div key={index} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${colors[activity.type as keyof typeof colors]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}