import toast from 'react-hot-toast';

// Проверка статуса локального PostgreSQL
export async function checkLocalPostgresStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/stats');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Запуск локального PostgreSQL
export async function startLocalPostgres(): Promise<boolean> {
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start local PostgreSQL');
    }
    
    return true;
  } catch (error: any) {
    console.error('Failed to start local PostgreSQL:', error);
    toast.error(`Error starting database: ${error.message}`);
    return false;
  }
}

// Создание схемы базы данных
export async function createDatabaseSchema(): Promise<boolean> {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_schema'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create schema');
    }
    
    return true;
  } catch (error: any) {
    console.error('Failed to create database schema:', error);
    toast.error(`Error creating schema: ${error.message}`);
    return false;
  }
}

// Получение списка таблиц
export async function getTablesList(): Promise<any[]> {
  try {
    const response = await fetch('/api/tasks');
    if (!response.ok) {
      throw new Error('Failed to fetch tables');
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error: any) {
    console.error('Failed to get tables list:', error);
    return [];
  }
}

// Экспорт данных из таблицы
export async function exportTableData(tableName: string): Promise<boolean> {
  try {
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
    
    return true;
  } catch (error: any) {
    console.error('Export failed:', error);
    toast.error(`Failed to export ${tableName}: ${error.message}`);
    return false;
  }
}