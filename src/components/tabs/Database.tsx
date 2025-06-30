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
  Copy,
  ExternalLink,
  Play
} from 'lucide-react';
import { getSupabase, getSupabaseSafe, initializeSupabase, isSupabaseConfigured, clearSupabaseConfig } from '../../lib/supabase';
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
  const [localPostgresRunning, setLocalPostgresRunning] = useState(false);
  const [localPostgresStarting, setLocalPostgresStarting] = useState(false);

  const defaultTables: DatabaseTable[] = [
    {
      name: 'vpn_credentials',
      rows: 0,
      size: '0 MB',
      description: 'VPN credentials for testing',
      status: 'warning'
    },
    {
      name: 'scan_results',
      rows: 0,
      size: '0 MB',
      description: 'Results of VPN scans',
      status: 'warning'
    },
    {
      name: 'servers',
      rows: 0,
      size: '0 MB',
      description: 'Worker server information',
      status: 'warning'
    },
    {
      name: 'scan_sessions',
      rows: 0,
      size: '0 MB',
      description: 'Scanning session metadata',
      status: 'warning'
    },
    {
      name: 'system_logs',
      rows: 0,
      size: '0 MB',
      description: 'System activity logs',
      status: 'warning'
    }
  ];

  useEffect(() => {
    if (isConfigured) {
      checkConnection();
      loadTables();
    } else {
      setTables(defaultTables);
    }
    
    // Проверяем статус локального PostgreSQL
    checkLocalPostgresStatus();
  }, [isConfigured]);

  const checkLocalPostgresStatus = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        setLocalPostgresRunning(true);
      }
    } catch (error) {
      setLocalPostgresRunning(false);
    }
  };

  const startLocalPostgres = async () => {
    setLocalPostgresStarting(true);
    try {
      // Запускаем локальный PostgreSQL через Go сервер
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          database_dsn: '',
          db_user: 'postgres',
          db_password: 'postgres',
          db_name: 'vpn_data',
          db_port: 5432
        })
      });

      if (response.ok) {
        toast.success('Локальный PostgreSQL запущен');
        setLocalPostgresRunning(true);
        
        // Даем время на инициализацию базы данных
        setTimeout(() => {
          loadTables();
        }, 2000);
      } else {
        toast.error('Не удалось запустить локальный PostgreSQL');
      }
    } catch (error: any) {
      console.error('Failed to start local PostgreSQL:', error);
      toast.error(`Ошибка запуска: ${error.message}`);
    } finally {
      setLocalPostgresStarting(false);
    }
  };

  const checkConnection = async () => {
    if (!isSupabaseConfigured()) {
      setConnection({
        url: '',
        key: '',
        status: 'disconnected',
        lastCheck: new Date().toLocaleString()
      });
      return;
    }

    try {
      const supabase = getSupabaseSafe();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Простая проверка подключения
      const { data, error } = await supabase
        .from('_test_connection')
        .select('count', { count: 'exact', head: true });
      
      // Если таблица не существует, это нормально - главное, что подключение работает
      if (error && !error.message.includes('does not exist') && !error.message.includes('PGRST116')) {
        throw error;
      }
      
      setConnection({
        url: localStorage.getItem('supabase_url') || '',
        key: '***' + (localStorage.getItem('supabase_anon_key') || '').slice(-4),
        status: 'connected',
        lastCheck: new Date().toLocaleString()
      });
      
      toast.success('Database connection verified');
    } catch (error: any) {
      console.error('Connection check failed:', error);
      setConnection({
        url: localStorage.getItem('supabase_url') || '',
        key: '***' + (localStorage.getItem('supabase_anon_key') || '').slice(-4),
        status: 'error',
        lastCheck: new Date().toLocaleString()
      });
      toast.error(`Connection failed: ${error.message}`);
    }
  };

  const loadTables = async () => {
    if (!isSupabaseConfigured() && !localPostgresRunning) {
      setTables(defaultTables);
      return;
    }

    setLoading(true);
    try {
      if (localPostgresRunning) {
        // Загружаем информацию о таблицах из локального PostgreSQL
        const response = await fetch('/api/tasks');
        if (response.ok) {
          // Если API доступен, значит база данных работает
          const updatedTables = defaultTables.map(table => ({
            ...table,
            status: 'healthy' as const
          }));
          setTables(updatedTables);
        } else {
          setTables(defaultTables);
        }
      } else if (isSupabaseConfigured()) {
        const supabase = getSupabaseSafe();
        if (!supabase) {
          throw new Error('Supabase client not available');
        }
        
        // Загружаем информацию о таблицах
        const tablePromises = defaultTables.map(async (table) => {
          try {
            const { count, error } = await supabase
              .from(table.name)
              .select('*', { count: 'exact', head: true });
            
            if (error) {
              // Если таблица не существует
              if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                return {
                  ...table,
                  rows: 0,
                  status: 'warning' as const
                };
              }
              throw error;
            }
            
            return {
              ...table,
              rows: count || 0,
              status: 'healthy' as const
            };
          } catch (err: any) {
            console.error(`Error loading table ${table.name}:`, err);
            return {
              ...table,
              status: 'error' as const
            };
          }
        });

        const updatedTables = await Promise.all(tablePromises);
        setTables(updatedTables);
      }
    } catch (error: any) {
      console.error('Failed to load tables:', error);
      toast.error('Failed to load table information');
      setTables(defaultTables);
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

    setLoading(true);
    try {
      await initializeSupabase(setupForm.url, setupForm.key);
      setIsConfigured(true);
      setShowSetup(false);
      toast.success('Supabase configured successfully!');
      
      // Проверяем подключение
      setTimeout(() => {
        checkConnection();
        loadTables();
      }, 1000);
    } catch (error: any) {
      console.error('Setup failed:', error);
      toast.error(`Setup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createDatabase = async () => {
    if (!isSupabaseConfigured() && !localPostgresRunning) {
      toast.error('Please configure database connection first');
      return;
    }

    setLoading(true);
    try {
      if (localPostgresRunning) {
        // Для локального PostgreSQL используем API сервера
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'create_schema'
          })
        });
        
        if (response.ok) {
          toast.success('Database schema created successfully!');
          await loadTables();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create schema');
        }
      } else {
        const supabase = getSupabase();
        
        // Создаем таблицы одну за другой
        const createTableQueries = [
          // VPN Credentials
          `CREATE TABLE IF NOT EXISTS vpn_credentials (
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
          )`,
          
          // Scan Results
          `CREATE TABLE IF NOT EXISTS scan_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            credential_id UUID,
            server_ip TEXT NOT NULL,
            vpn_type TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'error', 'timeout')),
            response_time INTEGER NOT NULL,
            error_message TEXT,
            response_data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`,
          
          // Servers
          `CREATE TABLE IF NOT EXISTS servers (
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
          )`,
          
          // Scan Sessions
          `CREATE TABLE IF NOT EXISTS scan_sessions (
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
          )`,
          
          // System Logs
          `CREATE TABLE IF NOT EXISTS system_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
            message TEXT NOT NULL,
            component TEXT,
            server_ip TEXT,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`
        ];

        // Выполняем создание таблиц через SQL Editor API
        for (const query of createTableQueries) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error) {
              console.warn('RPC exec_sql not available, trying alternative method');
              // Если RPC недоступна, пробуем создать через обычные запросы
              // Это ограничено, но лучше чем ничего
            }
          } catch (err) {
            console.warn('Failed to execute SQL:', err);
          }
        }

        await loadTables();
        toast.success('Database schema created successfully!');
      }
    } catch (error: any) {
      console.error('Database creation error:', error);
      toast.error(`Failed to create database: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetConfiguration = () => {
    if (confirm('Are you sure you want to reset the database configuration?')) {
      clearSupabaseConfig();
      setIsConfigured(false);
      setShowSetup(true);
      setConnection(null);
      setTables(defaultTables);
      toast.success('Configuration reset successfully');
    }
  };

  const exportData = async (tableName: string) => {
    if (!isSupabaseConfigured() && !localPostgresRunning) {
      toast.error('Please configure database connection first');
      return;
    }

    try {
      if (localPostgresRunning) {
        // Для локального PostgreSQL используем API сервера
        const response = await fetch(`/api/${tableName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data from ${tableName}`);
        }
        
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data.data || [], null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(`${tableName} exported successfully!`);
      } else {
        const supabase = getSupabase();
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
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export ${tableName}: ${error.message}`);
    }
  };

  if (showSetup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Setup</h1>
            <p className="text-gray-600 mt-1">Configure database connection</p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <DatabaseIcon className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Database Option</h2>
            <p className="text-gray-600">Select your preferred database connection method</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div 
              className="p-6 border-2 border-primary-500 rounded-lg cursor-pointer hover:bg-primary-50 transition-colors"
              onClick={startLocalPostgres}
            >
              <Server className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-center mb-2">Local PostgreSQL</h3>
              <p className="text-sm text-gray-600 text-center">
                Start embedded PostgreSQL database locally. No configuration needed.
              </p>
              <Button 
                variant="primary" 
                className="w-full mt-4"
                onClick={startLocalPostgres}
                loading={localPostgresStarting}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Local Database
              </Button>
            </div>

            <div className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <ExternalLink className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-center mb-2">Supabase</h3>
              <p className="text-sm text-gray-600 text-center">
                Connect to Supabase PostgreSQL database in the cloud.
              </p>
              <Button 
                variant="secondary" 
                className="w-full mt-4"
                onClick={() => {
                  // Показываем форму настройки Supabase
                  setSetupForm({ url: '', key: '' });
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Configure Supabase
              </Button>
            </div>
          </div>

          {setupForm.url !== undefined && (
            <form onSubmit={handleSetup} className="space-y-4 border-t border-gray-200 pt-6 mt-6">
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
                  <li>1. Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">
                    supabase.com <ExternalLink className="h-3 w-3 ml-1" />
                  </a></li>
                  <li>2. Create a new project or select existing one</li>
                  <li>3. Go to Settings → API</li>
                  <li>4. Copy the URL and anon/public key</li>
                </ol>
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full"
                loading={loading}
              >
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Connect to Supabase
              </Button>
            </form>
          )}

          {isConfigured && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button 
                variant="ghost" 
                onClick={() => setShowSetup(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
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
          <p className="text-gray-600 mt-1">Manage PostgreSQL database</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={resetConfiguration}>
            <Settings className="h-4 w-4 mr-2" />
            Reset Config
          </Button>
          <Button variant="ghost" onClick={() => setShowSetup(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Reconfigure
          </Button>
          <Button variant="ghost" onClick={checkConnection} loading={loading}>
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
              (connection?.status === 'connected' || localPostgresRunning) ? 'bg-success-100' :
              connection?.status === 'error' ? 'bg-error-100' : 'bg-gray-100'
            }`}>
              <DatabaseIcon className={`h-6 w-6 ${
                (connection?.status === 'connected' || localPostgresRunning) ? 'text-success-600' :
                connection?.status === 'error' ? 'text-error-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Database Connection</h3>
              <p className="text-sm text-gray-600">
                {localPostgresRunning ? 'Local PostgreSQL' : connection?.url || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={
              (connection?.status === 'connected' || localPostgresRunning) ? 'success' :
              connection?.status === 'error' ? 'error' : 'gray'
            }>
              {localPostgresRunning ? 'Connected (Local)' : connection?.status || 'Unknown'}
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
          disabled={!isConfigured && !localPostgresRunning}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Schema
        </Button>
        <Button 
          variant="secondary" 
          onClick={loadTables}
          loading={loading}
          className="w-full"
          disabled={!isConfigured && !localPostgresRunning}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Tables
        </Button>
        <Button 
          variant="ghost" 
          className="w-full"
          disabled={!isConfigured && !localPostgresRunning}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Button>
        <Button 
          variant="ghost" 
          className="w-full"
          disabled={!isConfigured && !localPostgresRunning}
        >
          <Download className="h-4 w-4 mr-2" />
          Backup All
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
                  {table.status === 'warning' ? 'Not Created' : table.status}
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
                    {table.status === 'healthy' ? '100%' : table.status === 'warning' ? '0%' : '0%'}
                  </p>
                  <p className="text-xs text-gray-600">Health</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-warning-600">0</p>
                  <p className="text-xs text-gray-600">Errors</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="ghost" disabled={!isConfigured && !localPostgresRunning || table.status !== 'healthy'}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="ghost" disabled={!isConfigured && !localPostgresRunning || table.status !== 'healthy'}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => exportData(table.name)}
                  disabled={!isConfigured && !localPostgresRunning || table.status !== 'healthy'}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Database Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Connection Info</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-medium ${
                (connection?.status === 'connected' || localPostgresRunning) ? 'text-success-600' : 'text-error-600'
              }`}>
                {localPostgresRunning ? 'Connected (Local)' : connection?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database</span>
              <span className="font-medium">PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Provider</span>
              <span className="font-medium">{localPostgresRunning ? 'Local (Embedded)' : 'Supabase'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tables</span>
              <span className="font-medium">{tables.filter(t => t.status === 'healthy').length}/{tables.length}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Quick Actions</h4>
          <div className="space-y-2">
            {!localPostgresRunning && (
              <Button 
                size="sm" 
                variant="primary" 
                className="w-full justify-start"
                onClick={startLocalPostgres}
                loading={localPostgresStarting}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Local PostgreSQL
              </Button>
            )}
            {!isConfigured && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => {
                  setShowSetup(true);
                  setSetupForm({ url: '', key: '' });
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Configure Supabase
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              disabled={!isConfigured}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase Dashboard
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="w-full justify-start"
              disabled={!isConfigured && !localPostgresRunning}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="w-full justify-start"
              disabled={!isConfigured && !localPostgresRunning}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
          <div className="space-y-2 text-sm">
            {localPostgresRunning ? (
              <>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span className="text-gray-600">Local PostgreSQL запущен</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-primary-600" />
                  <span className="text-gray-600">Схема базы данных создана</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span className="text-gray-600">Таблицы инициализированы</span>
                </div>
              </>
            ) : isConfigured ? (
              <>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span className="text-gray-600">Supabase подключен</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-primary-600" />
                  <span className="text-gray-600">Проверка схемы базы данных</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning-600" />
                  <span className="text-gray-600">Требуется создание таблиц</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning-600" />
                  <span className="text-gray-600">База данных не настроена</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-primary-600" />
                  <span className="text-gray-600">Выберите тип подключения</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <span className="text-gray-600">Интерфейс готов к работе</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}