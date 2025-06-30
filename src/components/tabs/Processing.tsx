import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Play, 
  Pause, 
  Square, 
  Activity, 
  Clock, 
  Zap,
  Server,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TaskManager from './TaskManager';

interface ProcessingTask {
  id: string;
  vpnType: string;
  server: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  startTime: string;
  estimatedTime: string;
  processed: number;
  goods: number;
  bads: number;
  errors: number;
  rps: number;
}

export function Processing() {
  const { isConnected, stats, startScanner, stopScanner } = useWebSocket();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const tasks: ProcessingTask[] = [
    {
      id: '1',
      vpnType: 'Fortinet',
      server: 'server1.example.com',
      status: 'running',
      progress: 78,
      startTime: '2h 15m ago',
      estimatedTime: '45m remaining',
      processed: 15420,
      goods: 1927,
      bads: 12893,
      errors: 600,
      rps: 2100
    },
    {
      id: '2',
      vpnType: 'GlobalProtect',
      server: 'server2.example.com',
      status: 'running',
      progress: 65,
      startTime: '1h 45m ago',
      estimatedTime: '1h 10m remaining',
      processed: 18950,
      goods: 2156,
      bads: 15794,
      errors: 1000,
      rps: 2400
    },
    {
      id: '3',
      vpnType: 'SonicWall',
      server: 'server3.example.com',
      status: 'paused',
      progress: 42,
      startTime: '3h 12m ago',
      estimatedTime: 'Paused',
      processed: 12340,
      goods: 1876,
      bads: 9864,
      errors: 600,
      rps: 0
    },
    {
      id: '4',
      vpnType: 'Cisco',
      server: 'server4.example.com',
      status: 'completed',
      progress: 100,
      startTime: '4h 28m ago',
      estimatedTime: 'Completed',
      processed: 21780,
      goods: 1482,
      bads: 19298,
      errors: 1000,
      rps: 0
    }
  ];

  const performanceData = [
    { time: '00:00', rps: 1200, goods: 120, errors: 12 },
    { time: '00:30', rps: 1800, goods: 280, errors: 18 },
    { time: '01:00', rps: 2400, goods: 450, errors: 25 },
    { time: '01:30', rps: 2100, goods: 620, errors: 30 },
    { time: '02:00', rps: 2600, goods: 820, errors: 22 },
    { time: '02:30', rps: 2300, goods: 980, errors: 35 },
  ];

  const handleTaskAction = (taskId: string, action: 'start' | 'pause' | 'stop') => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      switch (action) {
        case 'start':
          startScanner(task.vpnType.toLowerCase());
          break;
        case 'pause':
          // Implement pause logic
          break;
        case 'stop':
          stopScanner(task.vpnType.toLowerCase());
          break;
      }
    }
  };

  const handleBulkAction = (action: string) => {
    selectedTasks.forEach(taskId => {
      if (action === 'start') handleTaskAction(taskId, 'start');
      if (action === 'pause') handleTaskAction(taskId, 'pause');
      if (action === 'stop') handleTaskAction(taskId, 'stop');
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'primary';
      case 'error': return 'error';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return Play;
      case 'paused': return Pause;
      case 'completed': return CheckCircle;
      case 'error': return AlertTriangle;
      default: return Square;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Processing Monitor</h1>
          <p className="text-gray-600 mt-1">Monitor and control active scanning tasks</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live Monitoring' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tasks</p>
              <p className="text-3xl font-bold text-success-600">
                {tasks.filter(t => t.status === 'running').length}
              </p>
            </div>
            <Activity className="h-8 w-8 text-success-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total RPS</p>
              <p className="text-3xl font-bold text-primary-600">
                {tasks.reduce((sum, t) => sum + t.rps, 0).toLocaleString()}
              </p>
            </div>
            <Zap className="h-8 w-8 text-primary-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Found</p>
              <p className="text-3xl font-bold text-success-600">
                {tasks.reduce((sum, t) => sum + t.goods, 0).toLocaleString()}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Processed</p>
              <p className="text-3xl font-bold text-gray-600">
                {tasks.reduce((sum, t) => sum + t.processed, 0).toLocaleString()}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedTasks.length} task(s) selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="success" onClick={() => handleBulkAction('start')}>
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
              <Button size="sm" variant="warning" onClick={() => handleBulkAction('pause')}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button size="sm" variant="error" onClick={() => handleBulkAction('stop')}>
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Performance Chart */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Trends</h3>
          <Badge variant={isConnected ? "success" : "gray"}>
            {isConnected ? "Live Data" : "Offline"}
          </Badge>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="rps" stroke="#0ea5e9" strokeWidth={2} name="RPS" />
            <Line type="monotone" dataKey="goods" stroke="#22c55e" strokeWidth={2} name="Valid Found" />
            <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Task List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.map(task => {
            const StatusIcon = getStatusIcon(task.status);
            return (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTasks(prev => [...prev, task.id]);
                        } else {
                          setSelectedTasks(prev => prev.filter(id => id !== task.id));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Server className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{task.vpnType} Scanner</h4>
                      <p className="text-sm text-gray-600">Server: {task.server}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(task.status) as any}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {task.status}
                    </Badge>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <ProgressBar 
                    value={task.progress} 
                    color={task.status === 'running' ? 'primary' : 'gray'} 
                    size="sm" 
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-success-600">{task.goods.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Valid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-error-600">{task.bads.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Invalid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-warning-600">{task.errors.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Errors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary-600">{task.rps.toLocaleString()}/s</p>
                    <p className="text-xs text-gray-600">Speed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-600">{task.processed.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Processed</p>
                  </div>
                </div>

                {/* Time Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Started: {task.startTime}</span>
                  </div>
                  <span>{task.estimatedTime}</span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  {task.status === 'running' ? (
                    <>
                      <Button size="sm" variant="warning" onClick={() => handleTaskAction(task.id, 'pause')}>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button size="sm" variant="error" onClick={() => handleTaskAction(task.id, 'stop')}>
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </>
                  ) : task.status === 'paused' ? (
                    <>
                      <Button size="sm" variant="success" onClick={() => handleTaskAction(task.id, 'start')}>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button size="sm" variant="error" onClick={() => handleTaskAction(task.id, 'stop')}>
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="success" onClick={() => handleTaskAction(task.id, 'start')}>
                      <Play className="h-4 w-4 mr-1" />
                      Restart
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    <Activity className="h-4 w-4 mr-1" />
                    View Logs
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <TaskManager />
    </div>
  );
}
