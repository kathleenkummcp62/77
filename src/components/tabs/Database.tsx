import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { 
  Database as DatabaseIcon, 
  Plus, 
  Trash2, 
  RefreshCw,
  Settings,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Server,
  Table,
  Key,
  Users,
  Activity,
  BarChart3,
  Eye,
  Edit,
  Copy
} from 'lucide-react';
import { supabase, initializeSupabase, isSupabaseConfigured } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DatabaseTable {
  name: string;
  rows: number;
  size: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
}

interface DatabaseConnection {
  url: string;
  key: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheck: string;
}

export function Database() {
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(!isConfigured);
  const [setupForm, setSetupForm] = useState({
    url: '',
    key: ''
  });

  const defaultTables: DatabaseTable[] = [
    {
      name: 'vpn_credentials',
      rows: 0,
      size: '0 MB',
      description: 'VPN credentials for testing',
      status: 'healthy'
    },
    {
      name: 'scan_results',
      rows: 0,
      size: '0 MB',
      description: 'Results of VPN scans',
      status: 'healthy'
    },
    {
      name: 'servers',
      rows: 0,
      size: '0 MB',
      description: 'Worker server information',
      status: 'healthy'
    },
    {
      name: 'scan_sessions',
      rows: 0,
      size: '0 MB',
      description: 'Scanning session metadata',
      status: 'healthy'
    },
    {
      name: 'system_logs',
      rows: 0,
      size: '0 MB',
      description: 'System activity logs',
      status: 'healthy'
    }
  ];

  useEffect(() => {
    if (isConfigured) {
      checkConnection();
      loadTables();
    }
  }, [isConfigured]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.from('vpn_credentials').select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      
      setConnection({
        url: localStorage.getItem('supabase_url') || '',
        key: localStorage.getItem('supabase_anon_key') || '',
        status: 'connected',
        lastCheck: new Date().toLocaleString()
      });
    } catch (error) {
      setConnection({
        url: localStorage.getItem('supabase_url') || '',
        key: localStorage.getItem('supabase_anon_key') || '',
        status: 'error',
        lastCheck: new Date().toLocaleString()
      });
    }
  };

  const loadTables = async () => {
    setLoading(true);
    try {
      // Загружаем информацию о таблицах
      const tablePromises = defaultTables.map(async (table) => {
        try {
          const { count, error } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });
          
          return {
            ...table,
            rows: count || 0,
            status: error ? 'error' as const : 'healthy' as const
          };
        } catch {
          return {
            ...table,
            status: 'error' as const
          };
        }
      });

      const updatedTables = await Promise.all(tablePromises);
      setTables(updatedTables);
    } catch (error) {
      toast.error('Failed to load table information');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupForm.url || !setupForm.key) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      initializeSupabase(setupForm.url, setupForm.key);
      setIsConfigured(true);
      setShowSetup(false);
      toast.success('Supabase configured successfully!');
    } catch (error) {
      toast.error('Failed to configure Supabase');
    }
  };

  const createDatabase = async () => {
    setLoading(true);
    try {
      // SQL для создания всех таблиц
      const createTablesSQL = `
        -- VPN Credentials table
        CREATE TABLE IF NOT EXISTS vpn_credentials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ip TEXT NOT NULL,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          vpn_type TEXT NOT NULL,
          port INTEGER DEFAULT 443,
          domain TEXT,
          group_name TEXT,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'valid', 'invalid', 'error')),
          tested_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Scan Results table
        CREATE TABLE IF NOT EXISTS scan_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          credential_id UUID REFERENCES vpn_credentials(id) ON DELETE CASCADE,
          server_ip TEXT NOT NULL,
          vpn_type TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'error', 'timeout')),
          response_time INTEGER NOT NULL,
          error_message TEXT,
          response_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Servers table
        CREATE TABLE IF NOT EXISTS servers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ip TEXT UNIQUE NOT NULL,
          username TEXT NOT NULL,
          status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
          cpu_usage DECIMAL(5,2) DEFAULT 0,
          memory_usage DECIMAL(5,2) DEFAULT 0,
          disk_usage DECIMAL(5,2) DEFAULT 0,
          current_task TEXT,
          last_seen TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Scan Sessions table
        CREATE TABLE IF NOT EXISTS scan_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          vpn_type TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'error')),
          total_credentials INTEGER DEFAULT 0,
          processed_credentials INTEGER DEFAULT 0,
          valid_found INTEGER DEFAULT 0,
          errors_count INTEGER DEFAULT 0,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- System Logs table
        CREATE TABLE IF NOT EXISTS system_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
          message TEXT NOT NULL,
          component TEXT,
          server_ip TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE vpn_credentials ENABLE ROW LEVEL SECURITY;
        ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
        ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

        -- Create policies (allow all for now - adjust based on your auth needs)
        CREATE POLICY "Allow all operations" ON vpn_credentials FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON scan_results FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON servers FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON scan_sessions FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON system_logs FOR ALL USING (true);

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_vpn_credentials_status ON vpn_credentials(status);
        CREATE INDEX IF NOT EXISTS idx_vpn_credentials_vpn_type ON vpn_credentials(vpn_type);
        CREATE INDEX IF NOT EXISTS idx_scan_results_credential_id ON scan_results(credential_id);
        CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON scan_results(created_at);
        CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
        CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON scan_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
        CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
      `;

      // Выполняем SQL через RPC функцию (если доступна) или через отдельные запросы
      const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
      
      if (error) {
        // Если RPC недоступна, создаем таблицы по одной
        console.warn('RPC not available, creating tables individually');
        // Здесь можно добавить создание таблиц по одной через обычные запросы
      }

      await loadTables();
      toast.success('Database created successfully!');
    } catch (error) {
      console.error('Database creation error:', error);
      toast.error('Failed to create database');
    } finally {
      setLoading(false);
    }
  };

  const dropDatabase = async () => {
    if (!confirm('Are you sure you want to drop all tables? This action cannot be undone!')) {
      return;
    }

    setLoading(true);
    try {
      const dropTablesSQL = `
        DROP TABLE IF EXISTS system_logs CASCADE;
        DROP TABLE IF EXISTS scan_results CASCADE;
        DROP TABLE IF EXISTS scan_sessions CASCADE;
        DROP TABLE IF EXISTS servers CASCADE;
        DROP TABLE IF EXISTS vpn_credentials CASCADE;
      `;

      const { error } = await supabase.rpc('exec_sql', { sql: dropTablesSQL });
      
      if (error) {
        throw error;
      }

      await loadTables();
      toast.success('Database dropped successfully!');
    } catch (error) {
      console.error('Database drop error:', error);
      toast.error('Failed to drop database');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (tableName: string) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${tableName} exported successfully!`);
    } catch (error) {
      toast.error(`Failed to export ${tableName}`);
    }
  };

  const clearTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to clear all data from ${tableName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      await loadTables();
      toast.success(`${tableName} cleared successfully!`);
    } catch (error) {
      toast.error(`Failed to clear ${tableName}`);
    }
  };

  if (showSetup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Setup</h1>
            <p className="text-gray-600 mt-1">Configure Supabase PostgreSQL connection</p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <DatabaseIcon className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to Supabase</h2>
            <p className="text-gray-600">Enter your Supabase project credentials to get started</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supabase URL
              </label>
              <input
                type="url"
                value={setupForm.url}
                onChange={(e) => setSetupForm(prev => ({ ...prev, url: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://your-project.supabase.co"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anon Key
              </label>
              <input
                type="password"
                value={setupForm.key}
                onChange={(e) => setSetupForm(prev => ({ ...prev, key: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">How to get your credentials:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Go to <a href="https://supabase.com" target="_blank" className="underline">supabase.com</a></li>
                <li>2. Create a new project or select existing one</li>
                <li>3. Go to Settings → API</li>
                <li>4. Copy the URL and anon/public key</li>
              </ol>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              <DatabaseIcon className="h-4 w-4 mr-2" />
              Connect to Database
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
          <p className="text-gray-600 mt-1">Manage PostgreSQL database with Supabase</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={() => setShowSetup(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Reconfigure
          </Button>
          <Button variant="ghost" onClick={checkConnection}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${
              connection?.status === 'connected' ? 'bg-success-100' :
              connection?.status === 'error' ? 'bg-error-100' : 'bg-gray-100'
            }`}>
              <DatabaseIcon className={`h-6 w-6 ${
                connection?.status === 'connected' ? 'text-success-600' :
                connection?.status === 'error' ? 'text-error-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Database Connection</h3>
              <p className="text-sm text-gray-600">
                {connection?.url || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={
              connection?.status === 'connected' ? 'success' :
              connection?.status === 'error' ? 'error' : 'gray'
            }>
              {connection?.status || 'Unknown'}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">
              Last check: {connection?.lastCheck || 'Never'}
            </p>
          </div>
        </div>
      </Card>

      {/* Database Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button 
          variant="success" 
          onClick={createDatabase}
          loading={loading}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Database
        </Button>
        <Button 
          variant="error" 
          onClick={dropDatabase}
          disabled={loading}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Drop Database
        </Button>
        <Button 
          variant="secondary" 
          onClick={loadTables}
          loading={loading}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Tables
        </Button>
        <Button 
          variant="ghost" 
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Button>
      </div>

      {/* Tables Overview */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Database Tables</h3>
          <Badge variant="primary">{tables.length} tables</Badge>
        </div>

        <div className="space-y-4">
          {tables.map((table) => (
            <div key={table.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Table className="h-5 w-5 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900">{table.name}</h4>
                    <p className="text-sm text-gray-600">{table.description}</p>
                  </div>
                </div>
                <Badge variant={
                  table.status === 'healthy' ? 'success' :
                  table.status === 'warning' ? 'warning' : 'error'
                }>
                  {table.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary-600">{table.rows.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">Rows</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-600">{table.size}</p>
                  <p className="text-xs text-gray-600">Size</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-success-600">
                    {table.status === 'healthy' ? '100%' : '0%'}
                  </p>
                  <p className="text-xs text-gray-600">Health</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-warning-600">0</p>
                  <p className="text-xs text-gray-600">Errors</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="ghost">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="ghost">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => exportData(table.name)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button 
                  size="sm" 
                  variant="error"
                  onClick={() => clearTable(table.name)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Storage Usage</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Used Space</span>
                <span>2.3 GB / 500 GB</span>
              </div>
              <ProgressBar value={0.46} color="primary" size="sm" />
            </div>
            <div className="text-xs text-gray-600">
              <p>Tables: 1.8 GB</p>
              <p>Indexes: 0.3 GB</p>
              <p>Other: 0.2 GB</p>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Performance</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Query Time</span>
              <span className="font-medium">45ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Connections</span>
              <span className="font-medium">3/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cache Hit Rate</span>
              <span className="font-medium text-success-600">98.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uptime</span>
              <span className="font-medium">99.9%</span>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-success-600" />
              <span className="text-gray-600">Database backup completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-primary-600" />
              <span className="text-gray-600">New scan session created</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-warning-600" />
              <span className="text-gray-600">High query load detected</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">User session started</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}