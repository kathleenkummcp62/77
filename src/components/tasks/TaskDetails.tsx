import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Shield, 
  Calendar, 
  Clock, 
  Server, 
  FileText, 
  Download,
  CheckCircle,
  XCircle,
  Play,
  AlertTriangle
} from 'lucide-react';
import { Task } from '../../store/slices/tasksSlice';

interface TaskDetailsProps {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onRun: () => void;
  loading?: boolean;
}

export function TaskDetails({ task, onClose, onEdit, onRun, loading = false }: TaskDetailsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4 text-success-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-primary-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-error-600" />;
      default: return <Clock className="h-4 w-4 text-warning-600" />;
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 ${
            task.vpnType === 'fortinet' ? 'bg-red-100' :
            task.vpnType === 'paloalto' ? 'bg-blue-100' :
            task.vpnType === 'sonicwall' ? 'bg-orange-100' :
            task.vpnType === 'sophos' ? 'bg-indigo-100' :
            task.vpnType === 'watchguard' ? 'bg-purple-100' :
            task.vpnType === 'cisco' ? 'bg-cyan-100' :
            'bg-gray-100'
          } rounded-lg`}>
            <Shield className={`h-6 w-6 ${
              task.vpnType === 'fortinet' ? 'text-red-600' :
              task.vpnType === 'paloalto' ? 'text-blue-600' :
              task.vpnType === 'sonicwall' ? 'text-orange-600' :
              task.vpnType === 'sophos' ? 'text-indigo-600' :
              task.vpnType === 'watchguard' ? 'text-purple-600' :
              task.vpnType === 'cisco' ? 'text-cyan-600' :
              'text-gray-600'
            }`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Badge variant="primary">{task.vpnType}</Badge>
              <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <Badge 
          variant={
            task.status === 'running' ? 'success' :
            task.status === 'completed' ? 'primary' :
            task.status === 'error' ? 'error' :
            'warning'
          }
        >
          <div className="flex items-center space-x-1">
            {getStatusIcon(task.status)}
            <span>{task.status}</span>
          </div>
        </Badge>
      </div>
      
      {task.description && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600">{task.description}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            Deadline
          </h3>
          <div className={`p-3 border ${isOverdue(task.deadline) ? 'border-error-200 bg-error-50' : 'border-gray-200 bg-gray-50'} rounded-lg`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {new Date(task.deadline).toLocaleDateString()}
              </span>
              {isOverdue(task.deadline) && (
                <Badge variant="error" size="sm">Overdue</Badge>
              )}
            </div>
            {isOverdue(task.deadline) && (
              <p className="text-xs text-error-600 mt-1">
                This task is past its deadline
              </p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
            <Server className="h-4 w-4 mr-2 text-gray-500" />
            Workers
          </h3>
          <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {task.workers.length} workers assigned
              </span>
            </div>
            <div className="max-h-20 overflow-y-auto">
              {task.workers.map((worker, index) => (
                <div key={index} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-b-0">
                  {worker}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
          <Shield className="h-4 w-4 mr-2 text-gray-500" />
          Targets
        </h3>
        <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              {task.targets.length} targets configured
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {task.targets.map((target, index) => (
              <div key={index} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-b-0">
                {target}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2 text-gray-500" />
            Attachments
          </h3>
          <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {task.attachments.length} files attached
              </span>
            </div>
            <div className="space-y-2">
              {task.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{attachment.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {task.status === 'error' && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-error-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-error-800">Task Error</h4>
              <p className="text-sm text-error-700 mt-1">
                This task encountered an error during execution. Please check the logs for more details.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-3">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button 
          variant="ghost" 
          onClick={onEdit}
          disabled={task.status === 'running'}
        >
          Edit Task
        </Button>
        <Button 
          variant={task.status === 'running' ? 'warning' : 'success'} 
          onClick={onRun}
          disabled={task.status === 'running' || task.status === 'completed'}
          loading={loading && task.status === 'running'}
        >
          <Play className="h-4 w-4 mr-2" />
          {task.status === 'running' ? 'Running...' : 'Run Task'}
        </Button>
      </div>
    </Card>
  );
}