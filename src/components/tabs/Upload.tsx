import React, { useState, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Upload as UploadIcon, 
  FileText, 
  Server, 
  CheckCircle, 
  AlertTriangle,
  X,
  Download,
  Folder,
  HardDrive
} from 'lucide-react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  server?: string;
}

export function Upload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<'credentials' | 'scripts' | 'configs'>('credentials');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const servers = [
    { ip: '194.0.234.203', status: 'online', space: '2.1 GB' },
    { ip: '77.90.185.26', status: 'online', space: '1.8 GB' },
    { ip: '185.93.89.206', status: 'online', space: '3.2 GB' },
    { ip: '185.93.89.35', status: 'online', space: '2.7 GB' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const newFiles: UploadFile[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleUpload = () => {
    if (selectedServers.length === 0) {
      alert('Please select at least one server');
      return;
    }

    files.forEach(file => {
      if (file.status === 'pending') {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading' as const } : f
        ));

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { 
                ...f, 
                status: 'completed' as const, 
                progress: 100,
                server: selectedServers[Math.floor(Math.random() * selectedServers.length)]
              } : f
            ));
          } else {
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, progress } : f
            ));
          }
        }, 500);
      }
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadPath = () => {
    switch (uploadMode) {
      case 'credentials': return '/root/NAM/Check/';
      case 'scripts': return '/root/NAM/Servis/';
      case 'configs': return '/root/NAM/Config/';
      default: return '/root/NAM/';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">File Upload</h1>
          <p className="text-gray-600 mt-1">Upload files to worker servers</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpload}
            disabled={files.length === 0 || selectedServers.length === 0}
          >
            Upload to Servers
          </Button>
        </div>
      </div>

      {/* Upload Mode Selection */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'credentials', label: 'Credential Files', desc: 'part_*.txt, gener.txt', icon: FileText, path: '/root/NAM/Check/' },
            { id: 'scripts', label: 'Script Files', desc: 'sers*.py, sers*.go', icon: Server, path: '/root/NAM/Servis/' },
            { id: 'configs', label: 'Config Files', desc: 'config.txt, proxy_config.txt', icon: Folder, path: '/root/NAM/Config/' }
          ].map(mode => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  uploadMode === mode.id 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setUploadMode(mode.id as any)}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className="h-6 w-6 text-primary-600" />
                  <span className="font-medium text-gray-900">{mode.label}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{mode.desc}</p>
                <p className="text-xs text-gray-500 font-mono">{mode.path}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Target Path:</strong> <code className="bg-blue-100 px-1 rounded">{getUploadPath()}</code>
          </p>
        </div>
      </Card>

      {/* Server Selection */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Servers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {servers.map(server => (
            <div
              key={server.ip}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedServers.includes(server.ip)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setSelectedServers(prev => 
                  prev.includes(server.ip)
                    ? prev.filter(s => s !== server.ip)
                    : [...prev, server.ip]
                );
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{server.ip}</span>
                <Badge variant={server.status === 'online' ? 'success' : 'error'}>
                  {server.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <HardDrive className="h-4 w-4" />
                <span>Free: {server.space}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex space-x-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setSelectedServers(servers.map(s => s.ip))}
          >
            Select All
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setSelectedServers([])}
          >
            Clear Selection
          </Button>
        </div>
      </Card>

      {/* File Upload Area */}
      <Card>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
          <p className="text-gray-600 mb-4">Supports: .txt, .py, .go, .json, .yaml</p>
          <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".txt,.py,.go,.json,.yaml,.yml"
          />
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upload Queue</h3>
            <div className="flex space-x-2">
              <Badge variant="primary">{files.length} files</Badge>
              <Badge variant="success">
                {files.filter(f => f.status === 'completed').length} completed
              </Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            {files.map(file => (
              <div key={file.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  {file.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-success-600" />
                  ) : file.status === 'error' ? (
                    <AlertTriangle className="h-5 w-5 text-error-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                      {file.server && (
                        <Badge variant="gray" size="sm">{file.server}</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(file.id)}
                        className="p-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <ProgressBar value={file.progress} color="primary" size="sm" />
                  )}
                  
                  <div className="flex items-center justify-between mt-1">
                    <Badge 
                      variant={
                        file.status === 'completed' ? 'success' :
                        file.status === 'error' ? 'error' :
                        file.status === 'uploading' ? 'warning' : 'gray'
                      }
                      size="sm"
                    >
                      {file.status}
                    </Badge>
                    {file.status === 'uploading' && (
                      <span className="text-xs text-gray-500">{Math.round(file.progress)}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Templates
          </Button>
          <Button variant="secondary" className="w-full">
            <Server className="h-4 w-4 mr-2" />
            Check Server Space
          </Button>
          <Button variant="secondary" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            View Upload History
          </Button>
        </div>
      </Card>
    </div>
  );
}