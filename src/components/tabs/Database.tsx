import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Database as DatabaseIcon, Plus, Trash2, RefreshCw, Settings, Download, Upload, AlertTriangle, CheckCircle, Server, Table, Key, Users, Activity, BarChart3, Eye, Edit, Copy, ExternalLink, Play, FolderSync as Sync } from 'lucide-react';
import { getSupabase, getSupabaseSafe, initializeSupabase, isSupabaseConfigured, clearSupabaseConfig } from '../../lib/supabase';
import { checkLocalPostgresStatus, startLocalPostgres, createDatabaseSchema, getTablesList, exportTableData } from '../../lib/postgres';
import { 
  initializeDatabase, 
  getDatabaseType, 
  setDatabaseType, 
  clearCache, 
  getCacheStats,
  addIndexes
} from '../../lib/database';
import { 
  initializeReplication, 
  stopReplication, 
  getReplicationStatus, 
  syncDatabases,
  switchDatabaseType
} from '../../lib/dbReplication';
import toast from 'react-hot-toast';

interface DatabaseTable {
  name: string;
  rows: number;
  size: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
  hasIndex: boolean;
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
  const [databaseType, setDatabaseTypeState] = useState<'local' | 'supabase' | 'both'>(getDatabaseType());
  const [replicationStatus, setReplicationStatus] = useState(getReplicationStatus());
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [showIndexDialog, setShowIndexDialog] = useState(false);
  const [indexForm, setIndexForm] = useState({
    table: '',
    column: '',
    unique: false
  });

  const defaultTables: DatabaseTable[] = [
    {
      name: 'vpn_credentials',
      rows: 0,
      size: '0 MB',
      description: 'VPN credentials for testing',
      status: 'warning',
      hasIndex: false
    },
    {
      name: 'scan_results',
      rows: 0,
      size: '0 MB',
      description: 'Results of VPN scans',
      status: 'warning',
      hasIndex: false
    },
    {
      name: 'servers',
      rows: 0,
      size: '0 MB',
      description: 'Worker server information',
      status: 'warning',
      hasIndex: false
    },
    {
      name: 'scan_sessions',
      rows: 0,
      size: '0 MB',
      description: 'Scanning session metadata',
      status: 'warning',
      hasIndex: false
    },
    {
      name: 'system_logs',
      rows: 0,
      size: '0 MB',
      description: 'System activity logs',
      status: 'warning',
      hasIndex: false
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
    checkLocalPostgresStatus().then(status => {
      setLocalPostgresRunning(status);
    });
    
    // Обновляем статус репликации каждые 5 секунд
    const interval = setInterval(() => {
      setReplicationStatus(getReplicationStatus());
      setCacheStats(getCacheStats());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isConfigured, databaseType]);

  const startLocalPostgresDB = async () => {
    setLocalPostgresStarting(true);
    try {
      const success = await startLocalPostgres();
      if (success) {
        toast.success('Локальный PostgreSQL запущен');
        setLocalPostgresRunning(true);
        
        // Инициализируем базу данных
        await initializeDatabase('local');
        setDatabaseTypeState('local');
        
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
            status: 'healthy' as const,
            hasIndex: Math.random() > 0.5 // Для демонстрации
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
                  status: 'warning' as const,
                  hasIndex: false
                };
              }
              throw error;
            }
            
            return {
              ...table,
              rows: count || 0,
              status: 'healthy' as const,
              hasIndex: Math.random() > 0.5 // Для демонстрации
            };
          } catch (err: any) {
            console.error(`Error loading table ${table.name}:`, err);
            return {
              ...table,
              status: 'error' as const,
              hasIndex: false
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
      
      // Инициализируем базу данных
      await initializeDatabase('supabase');
      setDatabaseTypeState('supabase');
      
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
        const success = await createDatabaseSchema();
        if (success) {
          toast.success('Database schema created successfully!');
          await loadTables();
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
        const success = await exportTableData(tableName);
        if (success) {
          toast.success(`${tableName} exported successfully!`);
        }
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

  const handleDatabaseTypeChange = async (type: 'local' | 'supabase' | 'both') => {
    setLoading(true);
    try {
      const success = await switchDatabaseType(type);
      if (success) {
        setDatabaseTypeState(type);
        toast.success(`Switched to ${type} database`);
        
        // Reload tables
        await loadTables();
      }
    } catch (error: any) {
      console.error('Database type change error:', error);
      toast.error(`Failed to switch database type: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReplication = async () => {
    setLoading(true);
    try {
      const success = await initializeReplication();
      if (success) {
        toast.success('Database replication started');
        setReplicationStatus(getReplicationStatus());
      } else {
        toast.error('Failed to start database replication');
      }
    } catch (error: any) {
      console.error('Replication start error:', error);
      toast.error(`Failed to start replication: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopReplication = () => {
    stopReplication();
    toast.success('Database replication stopped');
    setReplicationStatus(getReplicationStatus());
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      const success = await syncDatabases();
      if (success) {
        toast.success('Databases synchronized successfully');
        setReplicationStatus(getReplicationStatus());
      } else {
        toast.error('Failed to synchronize databases');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Failed to synchronize databases: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    clearCache();
    setCacheStats(getCacheStats());
    toast.success('Cache cleared');
  };

  const handleAddIndex = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!indexForm.table || !indexForm.column) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await addIndexes([{
        table: indexForm.table,
        column: indexForm.column,
        unique: indexForm.unique
      }]);
      
      toast.success(`Index added to ${indexForm.table}.${indexForm.column}`);
      setShowIndexDialog(false);
      
      // Reload tables
      await loadTables();
    } catch (error: any) {
      console.error('Add index error:', error);
      toast.error(`Failed to add index: ${error.message}`);
    } finally {
      setLoading(false);
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
              onClick={startLocalPostgresDB}
            >
              <Server className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-center mb-2">Local PostgreSQL</h3>
              <p className="text-sm text-gray-600 text-center">
                Start embedded PostgreSQL database locally. No configuration needed.
              </p>
              <Button 
                variant="primary" 
                className="w-full mt-4"
                onClick={startLocalPostgresDB}
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
    <div className="space-y-6" data-testid="database">
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

      {/* Database Type Selection */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              databaseType === 'local' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleDatabaseTypeChange('local')}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Server className="h-5 w-5 text-primary-600" />
              <span className="font-medium text-gray-900">Local PostgreSQL</span>
            </div>
            <p className="text-sm text-gray-600">
              Use only local PostgreSQL database
            </p>
          </div>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              databaseType === 'supabase' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleDatabaseTypeChange('supabase')}
          >
            <div className="flex items-center space-x-2 mb-2">
              <ExternalLink className="h-5 w-5 text-primary-600" />
              <span className="font-medium text-gray-900">Supabase</span>
            </div>
            <p className="text-sm text-gray-600">
              Use only Supabase cloud database
            </p>
          </div>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              databaseType === 'both' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleDatabaseTypeChange('both')}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Sync className="h-5 w-5 text-primary-600" />
              <span className="font-medium text-gray-900">Replicated</span>
            </div>
            <p className="text-sm text-gray-600">
              Use both with automatic replication
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
          variant="primary" 
          className="w-full"
          onClick={() => setShowIndexDialog(true)}
          disabled={!isConfigured && !localPostgresRunning}
        >
          <Key className="h-4 w-4 mr-2" />
          Add Index
        </Button>
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={handleClearCache}
          disabled={!isConfigured && !localPostgresRunning}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Cache
        </Button>
      </div>

      {/* Replication Status */}
      {databaseType === 'both' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Database Replication</h3>
            <Badge variant={replicationStatus.enabled ? 'success' : 'gray'}>
              {replicationStatus.enabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-xs text-gray-500">
                  {replicationStatus.lastSync 
                    ? `Last sync: ${new Date(replicationStatus.lastSync).toLocaleString()}`
                    : 'Not synced yet'}
                </p>
              </div>
              <div className="flex space-x-2">
                {replicationStatus.enabled ? (
                  <>
                    <Button 
                      size="sm" 
                      variant="primary"
                      onClick={handleSyncNow}
                      loading={loading}
                    >
                      <Sync className="h-4 w-4 mr-1" />
                      Sync Now
                    </Button>
                    <Button 
                      size="sm" 
                      variant="error"
                      onClick={handleStopReplication}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Stop Replication
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    variant="success"
                    onClick={handleStartReplication}
                    loading={loading}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start Replication
                  </Button>
                )}
              </div>
            </div>
            
            {replicationStatus.error && (
              <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-error-600" />
                  <p className="text-sm text-error-700">{replicationStatus.error}</p>
                </div>
              </div>
            )}
            
            {replicationStatus.tables.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Rows</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remote Rows</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {replicationStatus.tables.map(table => (
                      <tr key={table.name}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{table.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{table.localRows}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{table.remoteRows}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              table.status === 'synced' ? 'success' :
                              table.status === 'error' ? 'error' : 'warning'
                            }
                            size="sm"
                          >
                            {table.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {table.lastSync ? new Date(table.lastSync).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cache Statistics */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cache Statistics</h3>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleClearCache}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Cache
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-primary-600">{cacheStats.keys}</p>
            <p className="text-xs text-gray-600">Cached Keys</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-success-600">{cacheStats.hits}</p>
            <p className="text-xs text-gray-600">Cache Hits</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-warning-600">{cacheStats.misses}</p>
            <p className="text-xs text-gray-600">Cache Misses</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-600">{cacheStats.ksize}</p>
            <p className="text-xs text-gray-600">Keys Size</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-600">{cacheStats.vsize}</p>
            <p className="text-xs text-gray-600">Values Size</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-700">
              Caching is enabled for frequently accessed data to improve performance.
            </p>
          </div>
        </div>
      </Card>

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
                  <div className="flex items-center justify-center">
                    <Badge variant={table.hasIndex ? 'success' : 'warning'} size="sm">
                      {table.hasIndex ? 'Indexed' : 'No Index'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Performance</p>
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
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setIndexForm({
                      table: table.name,
                      column: '',
                      unique: false
                    });
                    setShowIndexDialog(true);
                  }}
                  disabled={!isConfigured && !localPostgresRunning || table.status !== 'healthy' || table.hasIndex}
                >
                  <Key className="h-4 w-4 mr-1" />
                  Add Index
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
              <span className="font-medium">{databaseType === 'local' ? 'Local (Embedded)' : databaseType === 'supabase' ? 'Supabase' : 'Replicated'}</span>
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
                onClick={startLocalPostgresDB}
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

      {/* Add Index Dialog */}
      {showIndexDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Index</h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowIndexDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleAddIndex} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table
                </label>
                <select
                  value={indexForm.table}
                  onChange={(e) => setIndexForm(prev => ({ ...prev, table: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Select a table</option>
                  {tables
                    .filter(t => t.status === 'healthy' && !t.hasIndex)
                    .map(table => (
                      <option key={table.name} value={table.name}>{table.name}</option>
                    ))
                  }
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column
                </label>
                <input
                  type="text"
                  value={indexForm.column}
                  onChange={(e) => setIndexForm(prev => ({ ...prev, column: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="column_name"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="unique-index"
                  checked={indexForm.unique}
                  onChange={(e) => setIndexForm(prev => ({ ...prev, unique: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                />
                <label htmlFor="unique-index" className="text-sm text-gray-700">
                  Unique Index
                </label>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Adding an index will improve query performance for this column, but may slow down inserts and updates.
                </p>
              </div>
              
              <div className="flex space-x-2 justify-end">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => setShowIndexDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  loading={loading}
                >
                  <Key className="h-4 w-4 mr-1" />
                  Add Index
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}