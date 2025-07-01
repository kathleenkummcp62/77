import React, { useState, useRef } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { FileUpload } from './FileUpload';
import { 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  Shield, 
  AlertTriangle,
  Upload
} from 'lucide-react';
import { Task } from '../../store/slices/tasksSlice';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'status' | 'createdAt'>) => void;
  onCancel: () => void;
  initialValues?: Partial<Task>;
  isEdit?: boolean;
}

export function TaskForm({ onSubmit, onCancel, initialValues, isEdit = false }: TaskFormProps) {
  const [formData, setFormData] = useState({
    name: initialValues?.name || '',
    description: initialValues?.description || '',
    vpnType: initialValues?.vpnType || 'fortinet',
    priority: initialValues?.priority || 'medium',
    deadline: initialValues?.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targets: initialValues?.targets || [],
    workers: initialValues?.workers || [],
    attachments: initialValues?.attachments || []
  });
  const [targetInput, setTargetInput] = useState('');
  const [workerInput, setWorkerInput] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddTarget = () => {
    if (!targetInput) return;
    
    setFormData(prev => ({
      ...prev,
      targets: [...prev.targets, targetInput]
    }));
    setTargetInput('');
    
    // Clear targets error if it exists
    if (errors.targets) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.targets;
        return newErrors;
      });
    }
  };

  const handleAddWorker = () => {
    if (!workerInput) return;
    
    setFormData(prev => ({
      ...prev,
      workers: [...prev.workers, workerInput]
    }));
    setWorkerInput('');
    
    // Clear workers error if it exists
    if (errors.workers) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.workers;
        return newErrors;
      });
    }
  };

  const handleRemoveTarget = (index: number) => {
    setFormData(prev => ({
      ...prev,
      targets: prev.targets.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveWorker = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index)
    }));
  };

  const handleFilesSelected = (files: File[]) => {
    setAttachmentFiles(prev => [...prev, ...files]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }
    
    if (formData.targets.length === 0) {
      newErrors.targets = 'At least one target is required';
    }
    
    if (formData.workers.length === 0) {
      newErrors.workers = 'At least one worker is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Convert File objects to attachment objects
    const attachments = attachmentFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    }));
    
    onSubmit({
      ...formData,
      attachments
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Name <span className="text-error-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-2 border ${errors.name ? 'border-error-300 focus:ring-error-500 focus:border-error-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'} rounded-lg`}
              placeholder="Enter task name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error-600">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VPN Type
            </label>
            <select
              name="vpnType"
              value={formData.vpnType}
              onChange={handleChange}
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
            name="description"
            value={formData.description}
            onChange={handleChange}
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
              name="priority"
              value={formData.priority}
              onChange={handleChange}
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
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
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
            <Button type="button" variant="primary" onClick={handleAddTarget}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              type="button"
              variant="ghost"
              onClick={() => {
                // This would open an import modal in a real implementation
              }}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          
          {formData.targets.length > 0 && (
            <div className={`max-h-40 overflow-y-auto border ${errors.targets ? 'border-error-300' : 'border-gray-200'} rounded-lg p-2`}>
              {formData.targets.map((target, index) => (
                <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-sm text-gray-600 truncate">{target}</span>
                  <button
                    type="button"
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
          
          {errors.targets && (
            <p className="mt-1 text-sm text-error-600">{errors.targets}</p>
          )}
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
            <Button type="button" variant="primary" onClick={handleAddWorker}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {formData.workers.length > 0 && (
            <div className={`max-h-40 overflow-y-auto border ${errors.workers ? 'border-error-300' : 'border-gray-200'} rounded-lg p-2`}>
              {formData.workers.map((worker, index) => (
                <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{worker}</span>
                  <button
                    type="button"
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
          
          {errors.workers && (
            <p className="mt-1 text-sm text-error-600">{errors.workers}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attachments
          </label>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            maxFiles={5}
            maxSize={5 * 1024 * 1024} // 5MB
            accept=".txt,.csv,.json,.yaml,.yml"
            multiple={true}
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
          >
            {isEdit ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Card>
  );
}