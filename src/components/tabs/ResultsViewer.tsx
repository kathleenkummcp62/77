import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Download, 
  FileText, 
  Search, 
  Filter, 
  Eye,
  Copy,
  Trash2,
  Archive,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Server,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { DataExportModal } from '../export/DataExportModal';
import toast from 'react-hot-toast';

interface ResultFile {
  id: string;
  name: string;
  type: 'valid' | 'invalid' | 'errors' | 'logs';
  server: string;
  vpnType: string;
  size: string;
  count: number;
  created: string;
  lastModified: string;
  content?: string;
}

export function ResultsViewer() {
  const [files, setFiles] = useState<ResultFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid' | 'errors' | 'logs'>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<ResultFile | null>(null);

  // Load mock data
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockResults: ResultFile[] = [
        {
          id: '1',
          name: 'valid_fortinet_192.0.2.10.txt',
          type: 'valid',
          server: '192.0.2.10',
          vpnType: 'Fortinet',
          size: '2.3 MB',
          count: 1927,
          created: '2024-01-15 10:30:00',
          lastModified: '2024-01-15 12:45:00',
          content: 'https://200.113.15.26:4443;guest;guest\nhttps://195.150.192.5:443;guest;guest\nhttps://88.117.174.186:443;guest;guest'
        },
        {
          id: '2',
          name: 'valid_globalprotect_192.0.2.11.txt',
          type: 'valid',
          server: '192.0.2.11',
          vpnType: 'GlobalProtect',
          size: '3.1 MB',
          count: 2156,
          created: '2024-01-15 09:15:00',
          lastModified: '2024-01-15 12:30:00',
          content: 'https://216.229.124.44:443;test;test\nhttps://72.26.131.86:443;test;test\nhttps://216.247.223.23:443;test;test'
        },
        {
          id: '3',
          name: 'valid_sonicwall_192.0.2.12.txt',
          type: 'valid',
          server: '192.0.2.12',
          vpnType: 'SonicWall',
          size: '1.8 MB',
          count: 1876,
          created: '2024-01-15 08:45:00',
          lastModified: '2024-01-15 11:20:00',
          content: 'https://69.21.239.19:4433;test;test;LocalDomain\nhttps://68.189.7.50:4433;test;test;hudmech.local'
        },
        {
          id: '4',
          name: 'errors_cisco_192.0.2.13.txt',
          type: 'errors',
          server: '192.0.2.13',
          vpnType: 'Cisco',
          size: '856 KB',
          count: 1000,
          created: '2024-01-15 07:30:00',
          lastModified: '2024-01-15 11:45:00',
          content: 'Error: Connection timeout\nError: SSL certificate verification failed'
        },
        {
          id: '5',
          name: 'logs_system_192.0.2.10.txt',
          type: 'logs',
          server: '192.0.2.10',
          vpnType: 'System',
          size: '4.2 MB',
          count: 15420,
          created: '2024-01-15 06:00:00',
          lastModified: '2024-01-15 12:50:00',
          content: '[INFO] Starting scan\n[INFO] Loaded 1000 credentials\n[ERROR] Connection timeout'
        }
      ];
      
      setFiles(mockResults);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.server.includes(searchTerm) ||
                         file.vpnType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'valid': return 'success';
      case 'invalid': return 'error';
      case 'errors': return 'warning';
      case 'logs': return 'primary';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'valid': return CheckCircle;
      case 'invalid': return AlertTriangle;
      case 'errors': return AlertTriangle;
      case 'logs': return FileText;
      default: return FileText;
    }
  };

  const handleDownload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.content) {
      toast.error('File content not available');
      return;
    }
    
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${file.name}`);
  };

  const handleBulkAction = (action: string) => {
    if (selectedFiles.length === 0) {
      toast.error('No files selected');
      return;
    }
    
    if (action === 'download') {
      selectedFiles.forEach(fileId => {
        handleDownload(fileId);
      });
    } else if (action === 'export') {
      setShowExportModal(true);
    } else if (action === 'delete') {
      setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
      setSelectedFiles([]);
      toast.success(`Deleted ${selectedFiles.length} files`);
    }
  };

  const handlePreview = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setPreviewFile(file);
    }
  };

  const handleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id));
    }
  };

  const totalStats = {
    validCredentials: files.filter(f => f.type === 'valid').reduce((sum, f) => sum + f.count, 0),
    totalFiles: files.length,
    totalSize: formatTotalSize(files),
    lastUpdate: files.length > 0 
      ? new Date(Math.max(...files.map(f => new Date(f.lastModified).getTime()))).toLocaleString() 
      : 'N/A'
  };

  function formatTotalSize(files: ResultFile[]): string {
    const totalBytes = files.reduce((sum, file) => {
      const size = file.size;
      const unit = size.split(' ')[1];
      const value = parseFloat(size.split(' ')[0]);
      
      if (unit === 'KB') return sum + value * 1024;
      if (unit === 'MB') return sum + value * 1024 * 1024;
      if (unit === 'GB') return sum + value * 1024 * 1024 * 1024;
      return sum + value;
    }, 0);
    
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
    if (totalBytes < 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // Prepare data for export
  const getExportData = () => {
    const exportFiles = selectedFiles.length > 0 
      ? filteredFiles.filter(f => selectedFiles.includes(f.id))
      : filteredFiles;
    
    return exportFiles.map(file => ({
      Name: file.name,
      Type: file.type,
      Server: file.server,
      'VPN Type': file.vpnType,
      Size: file.size,
      Count: file.count,
      Created: file.created,
      'Last Modified': file.lastModified
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Results Viewer</h1>
          <p className="text-gray-600 mt-1">View, download, and manage scan results</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="ghost"
            onClick={() => {
              // Simulate refresh
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                toast.success('Results refreshed');
              }, 1000);
            }}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="ghost">
            <Archive className="h-4 w-4 mr-2" />
            Archive Old
          </Button>
          <Button 
            variant="primary"
            onClick={() => handleBulkAction('download')}
            disabled={files.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
          <Button 
            variant="secondary"
            onClick={() => setShowExportModal(true)}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valid Credentials</p>
              <p className="text-3xl font-bold text-success-600">{totalStats.validCredentials.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Result Files</p>
              <p className="text-3xl font-bold text-primary-600">{totalStats.totalFiles}</p>
            </div>
            <FileText className="h-8 w-8 text-primary-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-3xl font-bold text-gray-600">{totalStats.totalSize}</p>
            </div>
            <Archive className="h-8 w-8 text-gray-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Update</p>
              <p className="text-3xl font-bold text-warning-600">{totalStats.lastUpdate}</p>
            </div>
            <Calendar className="h-8 w-8 text-warning-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="valid">Valid Credentials</option>
              <option value="invalid">Invalid Attempts</option>
              <option value="errors">Error Logs</option>
              <option value="logs">System Logs</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{filteredFiles.length} files</span>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleSelectAll}
              >
                {selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSelectedFiles([])}
                disabled={selectedFiles.length === 0}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedFiles.length} file(s) selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="primary" onClick={() => handleBulkAction('download')}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('export')}>
                <PieChart className="h-4 w-4 mr-1" />
                Export Report
              </Button>
              <Button size="sm" variant="error" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-${getTypeColor(previewFile.type)}-100`}>
                  {React.createElement(getTypeIcon(previewFile.type), { 
                    className: `h-5 w-5 text-${getTypeColor(previewFile.type)}-600` 
                  })}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Server className="h-4 w-4" />
                <span>{previewFile.server}</span>
              </div>
              <Badge variant="primary">{previewFile.vpnType}</Badge>
              <span>{previewFile.size}</span>
              <span>{previewFile.count.toLocaleString()} entries</span>
              <span>Modified: {new Date(previewFile.lastModified).toLocaleString()}</span>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {previewFile.content || 'No content available'}
              </pre>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (previewFile.content) {
                    navigator.clipboard.writeText(previewFile.content);
                    toast.success('Content copied to clipboard');
                  }
                }}
                disabled={!previewFile.content}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Content
              </Button>
              <Button 
                variant="primary" 
                onClick={() => handleDownload(previewFile.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* File List */}
      <Card>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            filteredFiles.map(file => {
              const TypeIcon = getTypeIcon(file.type);
              return (
                <div key={file.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => handleFileSelection(file.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />

                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-lg bg-${getTypeColor(file.type)}-100`}>
                      <TypeIcon className={`h-5 w-5 text-${getTypeColor(file.type)}-600`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{file.name}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getTypeColor(file.type) as any} size="sm">
                          {file.type}
                        </Badge>
                        <Badge variant="gray" size="sm">
                          {file.vpnType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Server className="h-4 w-4" />
                        <span>{file.server}</span>
                      </div>
                      <span>{file.size}</span>
                      <span>{file.count.toLocaleString()} entries</span>
                      <span>Modified: {new Date(file.lastModified).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => handlePreview(file.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(file.content || '');
                      toast.success('Content copied to clipboard');
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleDownload(file.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={getExportData()}
        title="Scan Results Report"
      />
    </div>
  );
}