import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Play, 
  Plus, 
  Trash2, 
  Edit,
  Save,
  X,
  Check,
  Server,
  Shield,
  AlertTriangle,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import { DataImportModal } from '../import/DataImportModal';
import { DataExportModal } from '../export/DataExportModal';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  name: string;
  vpnType: string;
  targets: string[];
  workers: string[];
  status: 'pending' | 'running' | 'completed' | 'error';
  createdAt: string;
}

export function TaskCreator() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Fortinet Scan',
      vpnType: 'fortinet',
      targets: [
        'https://200.113.15.26:4443;guest;guest',
        'https://195.150.192.5:443;guest;guest'
      ],
      workers: ['194.0.234.203', '77.90.185.26'],
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importType, setImportType] = useState<'tasks' | 'targets'>('targets');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [newTask, setNewTask] = useState({
    name: '',
    vpnType: 'fortinet',
    targets: [] as string[],
    workers: [] as string[]
  });
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [workerInput, setWorkerInput] = useState('');

  const handleImport = (data: any[]) => {
    if (importType === 'targets' && selectedTask) {
      // Import targets for selected task
      const task = tasks.find(t => t.id === selectedTask);
      if (task) {
        const newTargets = data.map(item => {
          if (typeof item === 'string') return item;
          if (item.url) {
            return `${item.url}${item.username ? ';' + item.username : ''}${item.password ? ';' + item.password : ''}${item.domain ? ';' + item.domain : ''}`;
          }
          return '';
        }).filter(Boolean);
        
        setTasks(prev => prev.map(t => 
          t.id === selectedTask 
            ? { ...t, targets: [...t.targets, ...newTargets] } 
            : t
        ));
        
        toast.success(`Imported ${newTargets.length} targets to task "${task.name}"`);
      }
    } else if (importType === 'tasks') {
      // Import tasks
      const newTasks = data.map((item, index) => ({
        id: `new-${Date.now()}-${index}`,
        name: item.name || `Task ${Date.now()}`,
        vpnType: item.vpnType || 'fortinet',
        targets: item.targets || [],
        workers: item.workers || [],
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      }));
      
      setTasks([...tasks, ...newTasks]);
      toast.success(`Imported ${newTasks.length} tasks`);
    }
  };

  const handleAddTask = () => {
    if (!newTask.name) {
      toast.error('Task name is required');
      return;
    }
    
    if (newTask.targets.length === 0) {
      toast.error('At least one target is required');
      return;
    }
    
    if (newTask.workers.length === 0) {
      toast.error('At least one worker is required');
      return;
    }
    
    const task: Task = {
      id: `new-${Date.now()}`,
      name: newTask.name,
      vpnType: newTask.vpnType,
      targets: newTask.targets,
      workers: newTask.workers,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    setTasks([...tasks, task]);
    setNewTask({
      name: '',
      vpnType: 'fortinet',
      targets: [],
      workers: []
    });
    setShowNewTaskForm(false);
    toast.success('Task created successfully');
  };

  const handleAddTarget = () => {
    if (!targetInput) return;
    
    setNewTask({
      ...newTask,
      targets: [...newTask.targets, targetInput]
    });
    setTargetInput('');
  };

  const handleAddWorker = () => {
    if (!workerInput) return;
    
    setNewTask({
      ...newTask,
      workers: [...newTask.workers, workerInput]
    });
    setWorkerInput('');
  };

  const handleRemoveTarget = (index: number) => {
    setNewTask({
      ...newTask,
      targets: newTask.targets.filter((_, i) => i !== index)
    });
  };

  const handleRemoveWorker = (index: number) => {
    setNewTask({
      ...newTask,
      workers: newTask.workers.filter((_, i) => i !== index)
    });
  };

  const handleEditTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(id);
      setEditData({ ...task });
    }
  };

  const handleSaveTask = () => {
    if (!editingTask) return;
    
    setTasks(prev => prev.map(t => 
      t.id === editingTask ? { ...t, ...editData } : t
    ));
    
    setEditingTask(null);
    setEditData({});
    toast.success('Task updated');
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted');
  };

  const handleRunTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'running' } : t
    ));
    toast.success('Task started');
  };

  const getExportData = () => {
    return tasks.map(task => ({
      name: task.name,
      vpnType: task.vpnType,
      targets: task.targets.join('\n'),
      workers: task.workers.join('\n'),
      status: task.status,
      createdAt: task.createdAt
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Creator</h1>
          <p className="text-gray-600 mt-1">Create and manage VPN scanning tasks</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="ghost"
            onClick={() => {
              setShowExportModal(true);
              setImportType('tasks');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Tasks
          </Button>
          <Button 
            variant="ghost"
            onClick={() => {
              setShowImportModal(true);
              setImportType('tasks');
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Tasks
          </Button>
          <Button 
            variant="primary"
            onClick={() => setShowNewTaskForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
            <button 
              onClick={() => setShowNewTaskForm(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name
              </label>
              <input
                type="text"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter task name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VPN Type
              </label>
              <select
                value={newTask.vpnType}
                onChange={(e) => setNewTask({ ...newTask, vpnType: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="fortinet">Fortinet</option>
                <option value="paloalto">PaloAlto</option>
                <option value="sonicwall">SonicWall</option>
                <option value="sophos">Sophos</option>
                <option value="watchguard">WatchGuard</option>
                <option value="cisco">Cisco</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Targets
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://vpn.example.com;username;password"
                />
                <Button variant="primary" onClick={handleAddTarget}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setImportType('targets');
                    setShowImportModal(true);
                  }}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              
              {newTask.targets.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {newTask.targets.map((target, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-600 truncate">{target}</span>
                      <button
                        onClick={() => handleRemoveTarget(index)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {newTask.targets.length} targets added
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workers
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={workerInput}
                  onChange={(e) => setWorkerInput(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="192.168.1.100"
                />
                <Button variant="primary" onClick={handleAddWorker}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {newTask.workers.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {newTask.workers.map((worker, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{worker}</span>
                      <button
                        onClick={() => handleRemoveWorker(index)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {newTask.workers.length} workers added
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="ghost" onClick={() => setShowNewTaskForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task) => (
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingTask === task.id ? (
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      task.name
                    )}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Badge variant="primary">{task.vpnType}</Badge>
                    <span>{task.targets.length} targets</span>
                    <span>{task.workers.length} workers</span>
                    <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
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
                {task.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center justify-between">
                  <span>Targets</span>
                  {editingTask === task.id && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setImportType('targets');
                        setSelectedTask(task.id);
                        setShowImportModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {task.targets.map((target, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-600 truncate">{target}</span>
                      {editingTask === task.id && (
                        <button
                          onClick={() => {
                            setEditData({
                              ...editData,
                              targets: editData.targets.filter((_: any, i: number) => i !== index)
                            });
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Workers</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {task.workers.map((worker, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{worker}</span>
                      {editingTask === task.id && (
                        <button
                          onClick={() => {
                            setEditData({
                              ...editData,
                              workers: editData.workers.filter((_: any, i: number) => i !== index)
                            });
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {editingTask === task.id ? (
                <>
                  <Button variant="success" onClick={handleSaveTask}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingTask(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant={task.status === 'running' ? 'warning' : 'success'} 
                    onClick={() => handleRunTask(task.id)}
                    disabled={task.status === 'running'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {task.status === 'running' ? 'Running...' : 'Run Task'}
                  </Button>
                  <Button variant="ghost" onClick={() => handleEditTask(task.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
        
        {tasks.length === 0 && !showNewTaskForm && (
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks created yet</h3>
            <p className="text-gray-600 mb-6">Create your first task to start scanning VPN services</p>
            <Button 
              variant="primary" 
              onClick={() => setShowNewTaskForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Task
            </Button>
          </Card>
        )}
      </div>

      {/* Import Modal */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        type={importType === 'tasks' ? 'vpn-types' : 'credentials'}
        title={importType === 'tasks' ? 'Import Tasks' : 'Import Targets'}
      />

      {/* Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={getExportData()}
        title="Tasks"
      />
    </div>
  );
}