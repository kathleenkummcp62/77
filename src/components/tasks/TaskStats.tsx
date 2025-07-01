import React from 'react';
import { Card } from '../ui/Card';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Server, 
  Shield 
} from 'lucide-react';
import { Task } from '../../store/slices/tasksSlice';

interface TaskStatsProps {
  tasks: Task[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  // Calculate statistics
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const runningTasks = tasks.filter(task => task.status === 'running').length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const errorTasks = tasks.filter(task => task.status === 'error').length;
  
  const highPriorityTasks = tasks.filter(task => task.priority === 'high').length;
  const overdueTasks = tasks.filter(task => new Date(task.deadline) < new Date()).length;
  
  const totalTargets = tasks.reduce((sum, task) => sum + task.targets.length, 0);
  const totalWorkers = tasks.reduce((sum, task) => sum + task.workers.length, 0);
  
  // Calculate VPN type distribution
  const vpnTypes = tasks.reduce((acc, task) => {
    acc[task.vpnType] = (acc[task.vpnType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonVpnType = Object.entries(vpnTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Tasks</p>
            <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
            <p className="text-sm text-gray-600 mt-1">
              {pendingTasks} pending, {runningTasks} running
            </p>
          </div>
          <div className="p-3 bg-primary-100 rounded-full">
            <Calendar className="h-8 w-8 text-primary-600" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
            <p className="text-3xl font-bold text-success-600">{completedTasks}</p>
            <p className="text-sm text-success-600 mt-1">
              {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% success rate
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
            <p className="text-sm font-medium text-gray-600">High Priority</p>
            <p className="text-3xl font-bold text-warning-600">{highPriorityTasks}</p>
            <p className="text-sm text-warning-600 mt-1">
              {overdueTasks} overdue tasks
            </p>
          </div>
          <div className="p-3 bg-warning-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-warning-600" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Error Tasks</p>
            <p className="text-3xl font-bold text-error-600">{errorTasks}</p>
            <p className="text-sm text-error-600 mt-1">
              Require attention
            </p>
          </div>
          <div className="p-3 bg-error-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-error-600" />
          </div>
        </div>
      </Card>
      
      {/* Additional Stats */}
      <Card className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Shield className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">VPN Types</p>
              <p className="text-lg font-semibold text-gray-900">
                {Object.keys(vpnTypes).length} types
              </p>
              <p className="text-xs text-gray-500">
                Most common: {mostCommonVpnType}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <Server className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Workers</p>
              <p className="text-lg font-semibold text-gray-900">
                {totalWorkers} total
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(totalWorkers / (tasks.length || 1))} avg per task
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Shield className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Targets</p>
              <p className="text-lg font-semibold text-gray-900">
                {totalTargets} total
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(totalTargets / (tasks.length || 1))} avg per task
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-error-100 rounded-lg">
              <Clock className="h-5 w-5 text-error-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Deadlines</p>
              <p className="text-lg font-semibold text-gray-900">
                {overdueTasks} overdue
              </p>
              <p className="text-xs text-gray-500">
                {tasks.length - overdueTasks} on schedule
              </p>
            </div>
          </div>
        </div>
      </Card>
      
      <Card className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-warning-100 rounded-full mb-2">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary-100 rounded-full mb-2">
              <Play className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{runningTasks}</p>
            <p className="text-sm text-gray-600">Running</p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-success-100 rounded-full mb-2">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-error-100 rounded-full mb-2">
              <AlertTriangle className="h-6 w-6 text-error-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{errorTasks}</p>
            <p className="text-sm text-gray-600">Error</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Play(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}