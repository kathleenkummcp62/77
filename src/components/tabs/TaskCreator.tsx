import React, { useState, useEffect } from 'react';
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
  Upload,
  Calendar,
  Clock
} from 'lucide-react';
import { DataImportModal } from '../import/DataImportModal';
import { DataExportModal } from '../export/DataExportModal';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store';
import { addTask, updateTask, deleteTask, runTask } from '../../store/slices/tasksSlice';

interface TaskFormData {
  name: string;
  description: string;
  vpnType: string;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  targets: string[];
  workers: string[];
  attachments: File[];
}

export function TaskCreator() {
  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector(state => state.tasks);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importType, setImportType] = useState<'tasks' | 'targets'>('targets');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [workerInput, setWorkerInput] = useState('');
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    vpnType: 'fortinet',
    priority: 'medium',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targets: [],
    workers: [],
    attachments: []
  });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        
        dispatch(updateTask({
          ...task,
          targets: [...task.targets, ...newTargets]
        }));
        
        toast.success(`Imported ${newTargets.length} targets to task "${task.name}"`);
      }
    } else if (importType === 'tasks') {
      // Import tasks
      data.forEach((item, index) => {
        const newTask = {
          id: `new-${Date.now()}-${index}`,
          name: item.name || `Task ${Date.now()}`,
          description: item.description || '',
          vpnType: item.vpnType || 'fortinet',
          priority: item.priority || 'medium',
          deadline: item.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          targets: item.targets || [],
          workers: item.workers || [],
          status: 'pending',
          createdAt: new Date().toISOString(),
          attachments: []
        };
        
        dispatch(addTask(newTask));
      });
      
      toast.success(`Imported ${data.length} tasks`);
    }
  };

  const handleAddTask = () => {
    if (!formData.name) {
      toast.error('Task name is required');
      return;
    }
    
    if (formData.targets.length === 0) {
      toast.error('At least one target is required');
      return;
    }
    
    if (formData.workers.length === 0) {
      toast.error('At least one worker is required');
      return;
    }
    
    const newTask = {
      id: `new-${Date.now()}`,
      ...formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attachments: attachmentFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      }))
    };
    
    dispatch(addTask(newTask));
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      vpnType: 'fortinet',
      priority: 'medium',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targets: [],
      workers: [],
      attachments: []
    });
    setAttachmentFiles([]);
    setShowNewTaskForm(false);
    
    toast.success('Task created successfully');
  };

  const handleAddTarget = () => {
    if (!targetInput) return;
    
    setFormData({
      ...formData,
      targets: [...formData.targets, targetInput]
    });
    setTargetInput('');
  };

  const handleAddWorker = () => {
    if (!workerInput) return;
    
    setFormData({
      ...formData,
      workers: [...formData.workers, workerInput]
    });
    setWorkerInput('');
  };

  const handleRemoveTarget = (index: number) => {
    setFormData({
      ...formData,
      targets: formData.targets.filter((_, i) => i !== index)
    });
  };

  const handleRemoveWorker = (index: number) => {
    setFormData({
      ...formData,
      workers: formData.workers.filter((_, i) => i !== index)
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setAttachmentFiles([...attachmentFiles, ...files]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachmentFiles(attachmentFiles.filter((_, i) => i !== index));
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
    
    dispatch(updateTask(editData));
    
    setEditingTask(null);
    setEditData({});
    toast.success('Task updated');
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      dispatch(deleteTask(id));
      toast.success('Task deleted');
    }
  };

  const handleRunTask = (id: string) => {
    dispatch(runTask(id));
    toast.success('Task started');
  };

  const getExportData = () => {
    return tasks.map(task => ({
      name: task.name,
      description: task.description,
      vpnType: task.vpnType,
      priority: task.priority,
      deadline: task.deadline,
      targets: task.targets.join('\n'),
      workers: task.workers.join('\n'),
      status: task.status,
      createdAt: task.createdAt
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'gray';
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name <span className="text-error-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter task name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VPN Type
                </label>
                <select
                  value={formData.vpnType}
                  onChange={(e) => setFormData({ ...formData, vpnType: e.target.value })}
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Targets <span className="text-error-600">*</span>
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
              
              {formData.targets.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {formData.targets.map((target, index) => (
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
                {formData.targets.length} targets added
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workers <span className="text-error-600">*</span>
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
              
              {formData.workers.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {formData.workers.map((worker, index) => (
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
                {formData.workers.length} workers added
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachments
              </label>
              <div className="flex space-x-2 mb-2">
                <Button 
                  variant="ghost" 
                  className="border border-gray-300 w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
              </div>
              
              {attachmentFiles.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {attachmentFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {attachmentFiles.length} files attached
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="ghost" onClick={() => setShowNewTaskForm(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleAddTask}
                loading={loading}
              >
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
                  {task.status}
                </Badge>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {task.description && (
              <div className="mb-4 text-sm text-gray-600">
                {editingTask === task.id ? (
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                ) : (
                  <p>{task.description}</p>
                )}
              </div>
            )}
            
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
                  {(editingTask === task.id ? editData.targets : task.targets).map((target: string, index: number) => (
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
                  {(editingTask === task.id ? editData.workers : task.workers).map((worker: string, index: number) => (
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
            
            {task.attachments && task.attachments.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((attachment: any, index: number) => (
                    <Badge key={index} variant="gray" className="flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      {attachment.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
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
                    disabled={task.status === 'running' || task.status === 'completed'}
                    loading={loading && task.status === 'running'}
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

function FileText(props: any) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}