import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Play, 
  Edit, 
  Trash2, 
  Shield, 
  Calendar, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { Task } from '../../store/slices/tasksSlice';

interface TaskListProps {
  tasks: Task[];
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onRun: (taskId: string) => void;
  loading?: boolean;
}

export function TaskList({ tasks, onEdit, onDelete, onRun, loading = false }: TaskListProps) {
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
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">Create your first task to start scanning VPN services</p>
        </Card>
      ) : (
        tasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
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
                  <h3 className="text-lg font-semibold text-gray-900">{task.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Badge variant="primary">{task.vpnType}</Badge>
                    <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    <span>{task.targets.length} targets</span>
                    <span>{task.workers.length} workers</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
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
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span className={isOverdue(task.deadline) ? 'text-error-600 font-medium' : ''}>
                    {isOverdue(task.deadline) ? 'Overdue: ' : 'Deadline: '}
                    {new Date(task.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            {task.description && (
              <div className="mb-4 text-sm text-gray-600">
                <p>{task.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Targets</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {task.targets.length > 0 ? (
                    task.targets.map((target, index) => (
                      <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span className="text-sm text-gray-600 truncate">{target}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-2 text-center">No targets</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Workers</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {task.workers.length > 0 ? (
                    task.workers.map((worker, index) => (
                      <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{worker}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-2 text-center">No workers</p>
                  )}
                </div>
              </div>
            </div>
            
            {task.attachments && task.attachments.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                      <FileText className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-700">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                variant={task.status === 'running' ? 'warning' : 'success'} 
                onClick={() => onRun(task.id)}
                disabled={task.status === 'running' || task.status === 'completed'}
                loading={loading && task.status === 'running'}
              >
                <Play className="h-4 w-4 mr-2" />
                {task.status === 'running' ? 'Running...' : 'Run Task'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onEdit(task.id)}
                disabled={task.status === 'running'}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onDelete(task.id)}
                disabled={task.status === 'running'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}