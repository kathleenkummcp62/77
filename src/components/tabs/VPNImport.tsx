import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Upload, 
  Download, 
  FileText, 
  Server, 
  Shield,
  Database,
  Plus,
  Trash2,
  Copy,
  Edit,
  Save,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { DataImportModal } from '../import/DataImportModal';
import { DataExportModal } from '../export/DataExportModal';
import toast from 'react-hot-toast';

interface VPNCredential {
  id: string;
  url: string;
  username: string;
  password: string;
  domain?: string;
  vpnType: string;
}

interface Worker {
  id: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  status: 'online' | 'offline' | 'unknown';
}

export function VPNImport() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importType, setImportType] = useState<'urls' | 'credentials' | 'workers' | 'vpn-types'>('credentials');
  const [credentials, setCredentials] = useState<VPNCredential[]>([
    { id: '1', url: 'https://200.113.15.26:4443', username: 'guest', password: 'guest', vpnType: 'fortinet' },
    { id: '2', url: 'https://195.150.192.5:443', username: 'guest', password: 'guest', vpnType: 'fortinet' },
    { id: '3', url: 'https://216.229.124.44:443', username: 'test', password: 'test', vpnType: 'paloalto' }
  ]);
  const [workers, setWorkers] = useState<Worker[]>([
    { id: '1', ip: '194.0.234.203', port: 22, username: 'root', password: '1jt5a7p4FZTM0vY', status: 'online' },
    { id: '2', ip: '77.90.185.26', port: 22, username: 'root', password: '2dF9bS7UV6wvHy3', status: 'online' }
  ]);
  const [editingCredential, setEditingCredential] = useState<string | null>(null);
  const [editingWorker, setEditingWorker] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleImport = (data: any[]) => {
    switch (importType) {
      case 'credentials':
        const newCredentials = data.map((item, index) => ({
          id: `new-${Date.now()}-${index}`,
          url: item.url || '',
          username: item.username || '',
          password: item.password || '',
          domain: item.domain,
          vpnType: item.vpnType || guessVPNType(item.url || '')
        }));
        setCredentials([...credentials, ...newCredentials]);
        toast.success(`Imported ${newCredentials.length} credentials`);
        break;
      
      case 'workers':
        const newWorkers = data.map((item, index) => ({
          id: `new-${Date.now()}-${index}`,
          ip: item.ip || '',
          port: item.port || 22,
          username: item.username || 'root',
          password: item.password || '',
          status: 'unknown' as const
        }));
        setWorkers([...workers, ...newWorkers]);
        toast.success(`Imported ${newWorkers.length} workers`);
        break;
      
      default:
        toast.error('Import type not implemented');
    }
  };

  const guessVPNType = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('fortinet') || lowerUrl.includes('fortigate')) return 'fortinet';
    if (lowerUrl.includes('paloalto') || lowerUrl.includes('globalprotect')) return 'paloalto';
    if (lowerUrl.includes('sonicwall')) return 'sonicwall';
    if (lowerUrl.includes('sophos')) return 'sophos';
    if (lowerUrl.includes('watchguard')) return 'watchguard';
    if (lowerUrl.includes('cisco') || lowerUrl.includes('asa')) return 'cisco';
    return 'unknown';
  };

  const handleEditCredential = (id: string) => {
    const credential = credentials.find(c => c.id === id);
    if (credential) {
      setEditingCredential(id);
      setEditData({ ...credential });
    }
  };

  const handleSaveCredential = () => {
    if (!editingCredential) return;
    
    setCredentials(prev => prev.map(c => 
      c.id === editingCredential ? { ...c, ...editData } : c
    ));
    
    setEditingCredential(null);
    setEditData({});
    toast.success('Credential updated');
  };

  const handleEditWorker = (id: string) => {
    const worker = workers.find(w => w.id === id);
    if (worker) {
      setEditingWorker(id);
      setEditData({ ...worker });
    }
  };

  const handleSaveWorker = () => {
    if (!editingWorker) return;
    
    setWorkers(prev => prev.map(w => 
      w.id === editingWorker ? { ...w, ...editData } : w
    ));
    
    setEditingWorker(null);
    setEditData({});
    toast.success('Worker updated');
  };

  const handleDeleteItems = () => {
    if (selectedItems.length === 0) return;
    
    // Check if we're deleting credentials or workers
    const isCredential = credentials.some(c => selectedItems.includes(c.id));
    
    if (isCredential) {
      setCredentials(prev => prev.filter(c => !selectedItems.includes(c.id)));
    } else {
      setWorkers(prev => prev.filter(w => !selectedItems.includes(w.id)));
    }
    
    toast.success(`Deleted ${selectedItems.length} items`);
    setSelectedItems([]);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = (type: 'credentials' | 'workers') => {
    if (type === 'credentials') {
      const allCredentialIds = credentials.map(c => c.id);
      setSelectedItems(prev => 
        prev.length === allCredentialIds.length 
          ? prev.filter(id => !allCredentialIds.includes(id)) 
          : [...prev.filter(id => !allCredentialIds.includes(id)), ...allCredentialIds]
      );
    } else {
      const allWorkerIds = workers.map(w => w.id);
      setSelectedItems(prev => 
        prev.length === allWorkerIds.length 
          ? prev.filter(id => !allWorkerIds.includes(id)) 
          : [...prev.filter(id => !allWorkerIds.includes(id)), ...allWorkerIds]
      );
    }
  };

  const handleExport = (type: 'credentials' | 'workers') => {
    setImportType(type === 'credentials' ? 'credentials' : 'workers');
    setShowExportModal(true);
  };

  const getExportData = () => {
    if (importType === 'credentials') {
      return credentials.map(c => ({
        url: c.url,
        username: c.username,
        password: c.password,
        domain: c.domain || '',
        vpnType: c.vpnType
      }));
    } else if (importType === 'workers') {
      return workers.map(w => ({
        ip: w.ip,
        port: w.port,
        username: w.username,
        password: w.password,
        status: w.status
      }));
    }
    return [];
  };

  const getExportColumns = () => {
    if (importType === 'credentials') {
      return [
        { key: 'url', header: 'URL' },
        { key: 'username', header: 'Username' },
        { key: 'password', header: 'Password' },
        { key: 'domain', header: 'Domain' },
        { key: 'vpnType', header: 'VPN Type' }
      ];
    } else if (importType === 'workers') {
      return [
        { key: 'ip', header: 'IP Address' },
        { key: 'port', header: 'Port' },
        { key: 'username', header: 'Username' },
        { key: 'password', header: 'Password' },
        { key: 'status', header: 'Status' }
      ];
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Import & Export</h1>
          <p className="text-gray-600 mt-1">Manage VPN credentials and worker servers</p>
        </div>
      </div>

      {/* Import/Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary-600" />
            VPN Credentials
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Import or export VPN credentials for testing. Supports various formats and import methods.
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="primary"
                onClick={() => {
                  setImportType('credentials');
                  setShowImportModal(true);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Credentials
              </Button>
              <Button 
                variant="ghost"
                onClick={() => handleExport('credentials')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Server className="h-5 w-5 mr-2 text-primary-600" />
            Worker Servers
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Import or export worker server configurations. Add SSH credentials for remote servers.
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="primary"
                onClick={() => {
                  setImportType('workers');
                  setShowImportModal(true);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Workers
              </Button>
              <Button 
                variant="ghost"
                onClick={() => handleExport('workers')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Credentials Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">VPN Credentials</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="primary">{credentials.length} credentials</Badge>
            {selectedItems.length > 0 && credentials.some(c => selectedItems.includes(c.id)) && (
              <Button 
                size="sm" 
                variant="error"
                onClick={handleDeleteItems}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => handleSelectAll('credentials')}
            >
              {selectedItems.length === credentials.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={credentials.length > 0 && credentials.every(c => selectedItems.includes(c.id))}
                    onChange={() => handleSelectAll('credentials')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VPN Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credentials.map((credential) => (
                <tr key={credential.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(credential.id)}
                      onChange={() => handleSelectItem(credential.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCredential === credential.id ? (
                      <input
                        type="text"
                        value={editData.url || ''}
                        onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      credential.url
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCredential === credential.id ? (
                      <input
                        type="text"
                        value={editData.username || ''}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      credential.username
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCredential === credential.id ? (
                      <input
                        type="text"
                        value={editData.password || ''}
                        onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      credential.password
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCredential === credential.id ? (
                      <input
                        type="text"
                        value={editData.domain || ''}
                        onChange={(e) => setEditData({ ...editData, domain: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      credential.domain || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCredential === credential.id ? (
                      <select
                        value={editData.vpnType || ''}
                        onChange={(e) => setEditData({ ...editData, vpnType: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      >
                        <option value="fortinet">Fortinet</option>
                        <option value="paloalto">PaloAlto</option>
                        <option value="sonicwall">SonicWall</option>
                        <option value="sophos">Sophos</option>
                        <option value="watchguard">WatchGuard</option>
                        <option value="cisco">Cisco</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    ) : (
                      <Badge variant="primary">{credential.vpnType}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCredential === credential.id ? (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="success" onClick={handleSaveCredential}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCredential(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditCredential(credential.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${credential.url};${credential.username};${credential.password}${credential.domain ? ';' + credential.domain : ''}`
                            );
                            toast.success('Credential copied to clipboard');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Workers Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Worker Servers</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="primary">{workers.length} workers</Badge>
            {selectedItems.length > 0 && workers.some(w => selectedItems.includes(w.id)) && (
              <Button 
                size="sm" 
                variant="error"
                onClick={handleDeleteItems}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => handleSelectAll('workers')}
            >
              {selectedItems.length === workers.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    checked={workers.length > 0 && workers.every(w => selectedItems.includes(w.id))}
                    onChange={() => handleSelectAll('workers')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Port
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(worker.id)}
                      onChange={() => handleSelectItem(worker.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingWorker === worker.id ? (
                      <input
                        type="text"
                        value={editData.ip || ''}
                        onChange={(e) => setEditData({ ...editData, ip: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      worker.ip
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingWorker === worker.id ? (
                      <input
                        type="number"
                        value={editData.port || 22}
                        onChange={(e) => setEditData({ ...editData, port: parseInt(e.target.value) || 22 })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      worker.port
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingWorker === worker.id ? (
                      <input
                        type="text"
                        value={editData.username || ''}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      worker.username
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingWorker === worker.id ? (
                      <input
                        type="text"
                        value={editData.password || ''}
                        onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    ) : (
                      worker.password
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge 
                      variant={
                        worker.status === 'online' ? 'success' : 
                        worker.status === 'offline' ? 'error' : 
                        'warning'
                      }
                    >
                      {worker.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingWorker === worker.id ? (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="success" onClick={handleSaveWorker}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingWorker(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditWorker(worker.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${worker.ip}:${worker.port}:${worker.username}:${worker.password}`
                            );
                            toast.success('Worker credentials copied to clipboard');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Import Format Help */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Format Guidelines</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">VPN Credentials Format</h4>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">URL;Username;Password</p>
                <code className="text-xs text-gray-600 block">https://vpn.example.com;admin;password123</code>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">URL;Username;Password;Domain</p>
                <code className="text-xs text-gray-600 block">https://vpn.example.com;admin;password123;example.local</code>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Special Format for WatchGuard</p>
                <code className="text-xs text-gray-600 block">https://vpn.example.com:443:Firebox-DB:domain:user:pass</code>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Special Format for Cisco</p>
                <code className="text-xs text-gray-600 block">https://vpn.example.com:443:user:pass:group</code>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Worker Servers Format</h4>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">IP;Port;Username;Password</p>
                <code className="text-xs text-gray-600 block">192.168.1.100;22;root;password123</code>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">IP:Port:Username:Password</p>
                <code className="text-xs text-gray-600 block">192.168.1.100:22:root:password123</code>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">IP (defaults: Port 22, User 'root')</p>
                <code className="text-xs text-gray-600 block">192.168.1.100</code>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-warning-800">Import Notes</h4>
              <ul className="mt-2 text-sm text-warning-700 space-y-1">
                <li>• The system will attempt to auto-detect delimiters (semicolon, colon, comma, tab)</li>
                <li>• For special formats (WatchGuard, Cisco), use the appropriate format as shown above</li>
                <li>• Empty lines and lines starting with # will be ignored</li>
                <li>• Passwords may contain special characters</li>
                <li>• Large files may take longer to process</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Import Modal */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        type={importType}
        title={
          importType === 'credentials' ? 'Import VPN Credentials' :
          importType === 'workers' ? 'Import Worker Servers' :
          importType === 'urls' ? 'Import VPN URLs' :
          'Import VPN Types'
        }
      />

      {/* Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={getExportData()}
        columns={getExportColumns()}
        title={
          importType === 'credentials' ? 'VPN Credentials' :
          importType === 'workers' ? 'Worker Servers' :
          importType === 'urls' ? 'VPN URLs' :
          'VPN Types'
        }
      />
    </div>
  );
}