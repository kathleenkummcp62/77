import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Database as DatabaseIcon, 
  Server, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle,
  Settings,
  Play,
  Download,
  Upload,
  Table,
  Key,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Database() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [dbType, setDbType] = useState<'local' | 'supabase'>('local');
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'vpn_data'
  });
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: '',
    key: ''
  });
  const [tables, setTables] = useState<{name: string, rows: number}[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  // Simulate connection check on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnecting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, always succeed
      setConnected(true);
      
      // Fetch tables
      fetchTables();
      
      toast.success('Connected to database');
    } catch (error) {
      console.error('Connection error:', error);
      setConnected(false);
      toast.error('Failed to connect to database');
    } finally {
      setConnecting(false);
    }
  };

  const fetchTables = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock tables
      setTables([
        { name: 'credentials', rows: 1250 },
        { name: 'tasks', rows: 45 },
        { name: 'vendor_urls', rows: 120 },
        { name: 'proxies', rows: 30 },
        { name: 'logs', rows: 5678 }
      ]);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    
    try {
      // Validate connection details
      if (dbType === 'local') {
        if (!dbConfig.host || !dbConfig.user || !dbConfig.database) {
          throw new Error('Please fill in all required fields');
        }
      } else {
        if (!supabaseConfig.url || !supabaseConfig.key) {
          throw new Error('Please fill in all required fields');
        }
      }
      
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setConnected(true);
      fetchTables();
      setShowConfig(false);
      
      toast.success(`Connected to ${dbType === 'local' ? 'PostgreSQL' : 'Supabase'} database`);
    } catch (error: any) {
      console.error('Connection error:', error);
      setConnected(false);
      toast.error(error.message || 'Failed to connect to database');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setTables([]);
    toast.success('Disconnected from database');
  };

  const handleExportTable = (tableName: string) => {
    toast.success(`Exporting table: ${tableName}`);
    // In a real app, this would trigger a download
  };

  const handleRunMigration = async () => {
    try {
      // Simulate migration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh tables
      fetchTables();
      
      toast.success('Migration completed successfully');
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Failed to run migration');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
          <p className="text-gray-600 mt-1">Configure and manage database connections</p>
        </div>
        <div className="flex space-x-3">
          {connected ? (
            <>
              <Button 
                variant="ghost" 
                onClick={fetchTables}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setShowConfig(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="error"
                onClick={handleDisconnect}
              >
                <X className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button 
              variant="primary"
              onClick={() => setShowConfig(true)}
            >
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Configure Connection
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 ${connected ? 'bg-success-100' : 'bg-gray-100'} rounded-lg`}>
              <DatabaseIcon className={`h-6 w-6 ${connected ? 'text-success-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Database Connection</h3>
              <p className="text-sm text-gray-600">
                {connected 
                  ? `Connected to ${dbType === 'local' ? 'PostgreSQL' : 'Supabase'} database` 
                  : 'Not connected to any database'}
              </p>
            </div>
          </div>
          <Badge variant={connected ? 'success' : 'error'}>
            {connecting ? 'Connecting...' : (connected ? 'Connected' : 'Disconnected')}
          </Badge>
        </div>
        
        {connected && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Connection Type</p>
              <p className="text-lg font-semibold text-gray-900">{dbType === 'local' ? 'PostgreSQL' : 'Supabase'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Host</p>
              <p className="text-lg font-semibold text-gray-900">
                {dbType === 'local' ? dbConfig.host : 'Supabase Cloud'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Database</p>
              <p className="text-lg font-semibold text-gray-900">
                {dbType === 'local' ? dbConfig.database : 'Supabase Project'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Configuration Form */}
      {showConfig && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Database Configuration</h3>
            <div className="flex space-x-2">
              <Button 
                variant={dbType === 'local' ? 'primary' : 'ghost'}
                onClick={() => setDbType('local')}
              >
                <Server className="h-4 w-4 mr-2" />
                PostgreSQL
              </Button>
              <Button 
                variant={dbType === 'supabase' ? 'primary' : 'ghost'}
                onClick={() => setDbType('supabase')}
              >
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Supabase
              </Button>
            </div>
          </div>
          
          {dbType === 'local' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) || 5432 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="5432"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="postgres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="vpn_data"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase URL
                </label>
                <input
                  type="text"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://your-project.supabase.co"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  value={supabaseConfig.key}
                  onChange={(e) => setSupabaseConfig({ ...supabaseConfig, key: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="your-anon-key"
                />
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Supabase Connection</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      You can find your Supabase URL and Anon Key in your Supabase project settings under API.
                      Make sure to use the anon/public key for client-side access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="ghost" onClick={() => setShowConfig(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConnect}
              loading={connecting}
            >
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </div>
        </Card>
      )}

      {/* Database Tables */}
      {connected && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Database Tables</h3>
            <div className="flex space-x-2">
              <Button variant="ghost" onClick={fetchTables}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="primary" onClick={handleRunMigration}>
                <Play className="h-4 w-4 mr-2" />
                Run Migrations
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rows
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
                {tables.map((table) => (
                  <tr key={table.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Table className="h-4 w-4 text-gray-500" />
                        <span>{table.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {table.rows.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleExportTable(table.name)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {tables.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No tables found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Database Info */}
      {connected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="h-5 w-5 mr-2 text-primary-600" />
              Schema Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tables</span>
                <span className="font-medium">{tables.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Rows</span>
                <span className="font-medium">{tables.reduce((sum, table) => sum + table.rows, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Migration</span>
                <span className="font-medium">2024-07-01</span>
              </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2 text-primary-600" />
              Security
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Encryption</span>
                <Badge variant="success">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">SSL</span>
                <Badge variant="success">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Row-Level Security</span>
                <Badge variant={dbType === 'supabase' ? 'success' : 'warning'}>
                  {dbType === 'supabase' ? 'Enabled' : 'N/A'}
                </Badge>
              </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary-600" />
              Maintenance
            </h3>
            <div className="space-y-4">
              <Button variant="ghost" className="w-full justify-start">
                <RefreshCw className="h-4 w-4 mr-2" />
                Vacuum Database
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Backup Database
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Restore Backup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Connection Help */}
      {!connected && !showConfig && (
        <Card className="p-8 text-center">
          <DatabaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Database Not Connected</h3>
          <p className="text-gray-600 mb-6">Connect to a database to manage your VPN scanning data</p>
          <Button 
            variant="primary" 
            onClick={() => setShowConfig(true)}
          >
            <DatabaseIcon className="h-4 w-4 mr-2" />
            Configure Connection
          </Button>
        </Card>
      )}
    </div>
  );
}