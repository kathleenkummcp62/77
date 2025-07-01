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
  PieChart
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { 
  fetchResults, 
  downloadFile, 
  toggleFileSelection, 
  clearFileSelection, 
  selectAllFiles 
} from '../../store/slices/resultsSlice';
import { ScanResultsOverview } from '../charts/ScanResultsOverview';

export function Results() {
  const dispatch = useAppDispatch();
  const { files, selectedFiles, loading } = useAppSelector(state => state.results);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid' | 'errors' | 'logs'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    dispatch(fetchResults());
  }, [dispatch]);

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
    dispatch(downloadFile(fileId));
  };

  const handleBulkAction = (action: string) => {
    if (selectedFiles.length === 0) {
      return;
    }
    
    if (action === 'download') {
      selectedFiles.forEach(fileId => {
        dispatch(downloadFile(fileId));
      });
    }
  };

  const handlePreview = (fileId: string) => {
    // Реализация предпросмотра файла
  };

  const totalStats = {
    validCredentials: files.filter(f => f.type === 'valid').reduce((sum, f) => sum + f.count, 0),
    totalFiles: files.length,
    totalSize: '12.1 MB',
    lastUpdate: '2 minutes ago'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Results Management</h1>
          <p className="text-gray-600 mt-1">View, download, and manage scan results</p>
        </div>
        <div className="flex space-x-3">
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
            onClick={() => window.location.hash = '#reports'}
          >
            <PieChart className="h-4 w-4 mr-2" />
            View Reports
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
                onClick={() => dispatch(selectAllFiles())}
                disabled={files.length === 0}
              >
                Select All
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => dispatch(clearFileSelection())}
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
              <Button size="sm" variant="secondary" onClick={() => handleBulkAction('archive')}>
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
              <Button size="sm" variant="error" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* File List */}
      <Card>
        <div className="space-y-4">
          {filteredFiles.map(file => {
            const TypeIcon = getTypeIcon(file.type);
            return (
              <div key={file.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.id)}
                  onChange={() => dispatch(toggleFileSelection(file.id))}
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
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(file.name)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => handleDownload(file.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFiles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </Card>

      {/* Results Overview */}
      <ScanResultsOverview />

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="secondary" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
          <Button variant="secondary" className="w-full">
            <Archive className="h-4 w-4 mr-2" />
            Create Archive
          </Button>
          <Button variant="secondary" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="secondary" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Old Files
          </Button>
        </div>
      </Card>
    </div>
  );
}