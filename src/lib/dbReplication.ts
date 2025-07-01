import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient } from 'pg';
import toast from 'react-hot-toast';
import { initializeDatabase, getDatabaseType, setDatabaseType } from './database';

// Replication status
export interface ReplicationStatus {
  enabled: boolean;
  lastSync: Date | null;
  tables: {
    name: string;
    localRows: number;
    remoteRows: number;
    status: 'synced' | 'pending' | 'error';
    lastSync: Date | null;
  }[];
  error: string | null;
}

// Default replication status
const defaultStatus: ReplicationStatus = {
  enabled: false,
  lastSync: null,
  tables: [],
  error: null
};

// Current replication status
let replicationStatus: ReplicationStatus = { ...defaultStatus };

// Replication interval
let replicationInterval: NodeJS.Timeout | null = null;

// PostgreSQL connection pool
let pgPool: Pool | null = null;

// Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize database replication
 */
export async function initializeReplication(
  options: {
    pgConfig?: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
    supabaseUrl?: string;
    supabaseKey?: string;
    tables?: string[];
    syncInterval?: number; // in minutes
  } = {}
): Promise<boolean> {
  try {
    const {
      pgConfig = {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'vpn_data'
      },
      supabaseUrl = localStorage.getItem('supabase_url') || '',
      supabaseKey = localStorage.getItem('supabase_anon_key') || '',
      tables = ['credentials', 'proxies', 'tasks', 'vendor_urls', 'logs'],
      syncInterval = 15 // 15 minutes
    } = options;
    
    // Check if we have both PostgreSQL and Supabase configurations
    if (!supabaseUrl || !supabaseKey) {
      replicationStatus = {
        ...defaultStatus,
        error: 'Supabase configuration not found'
      };
      return false;
    }
    
    // Initialize database connections
    await initializeDatabase('both');
    
    // Initialize PostgreSQL connection pool
    if (!pgPool) {
      const { Pool } = await import('pg');
      pgPool = new Pool(pgConfig);
      
      // Test the connection
      const client = await pgPool.connect();
      client.release();
      console.log('PostgreSQL connection established for replication');
    }
    
    // Initialize Supabase client
    if (!supabaseClient) {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      
      // Test the connection
      const { error } = await supabaseClient.from('_test_connection').select('count', { count: 'exact', head: true });
      if (error && !error.message.includes('does not exist') && !error.message.includes('PGRST116')) {
        throw error;
      }
      
      console.log('Supabase connection established for replication');
    }
    
    // Initialize replication status
    replicationStatus = {
      enabled: true,
      lastSync: null,
      tables: tables.map(name => ({
        name,
        localRows: 0,
        remoteRows: 0,
        status: 'pending',
        lastSync: null
      })),
      error: null
    };
    
    // Start replication interval
    if (replicationInterval) {
      clearInterval(replicationInterval);
    }
    
    replicationInterval = setInterval(() => {
      syncDatabases().catch(console.error);
    }, syncInterval * 60 * 1000);
    
    // Perform initial sync
    await syncDatabases();
    
    return true;
  } catch (error) {
    console.error('Replication initialization error:', error);
    
    replicationStatus = {
      ...defaultStatus,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return false;
  }
}

/**
 * Stop database replication
 */
export function stopReplication(): void {
  if (replicationInterval) {
    clearInterval(replicationInterval);
    replicationInterval = null;
  }
  
  replicationStatus.enabled = false;
}

/**
 * Get replication status
 */
export function getReplicationStatus(): ReplicationStatus {
  return { ...replicationStatus };
}

/**
 * Synchronize databases
 */
export async function syncDatabases(): Promise<boolean> {
  if (!pgPool || !supabaseClient) {
    replicationStatus.error = 'Database connections not initialized';
    return false;
  }
  
  try {
    // Update replication status
    replicationStatus.error = null;
    
    // Sync each table
    for (const tableStatus of replicationStatus.tables) {
      try {
        await syncTable(tableStatus.name);
        
        // Update table status
        tableStatus.status = 'synced';
        tableStatus.lastSync = new Date();
      } catch (error) {
        console.error(`Error syncing table ${tableStatus.name}:`, error);
        
        tableStatus.status = 'error';
        replicationStatus.error = `Error syncing table ${tableStatus.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    // Update last sync time
    replicationStatus.lastSync = new Date();
    
    return true;
  } catch (error) {
    console.error('Database synchronization error:', error);
    
    replicationStatus.error = error instanceof Error ? error.message : 'Unknown error';
    
    return false;
  }
}

/**
 * Synchronize a single table
 */
async function syncTable(tableName: string): Promise<void> {
  if (!pgPool || !supabaseClient) {
    throw new Error('Database connections not initialized');
  }
  
  // Get table status
  const tableStatus = replicationStatus.tables.find(t => t.name === tableName);
  
  if (!tableStatus) {
    throw new Error(`Table ${tableName} not found in replication status`);
  }
  
  // Get local data
  const localResult = await pgPool.query(`SELECT * FROM ${tableName}`);
  tableStatus.localRows = localResult.rowCount || 0;
  
  // Get remote data
  const { data: remoteData, error: remoteError, count } = await supabaseClient
    .from(tableName)
    .select('*', { count: 'exact' });
  
  if (remoteError) {
    throw remoteError;
  }
  
  tableStatus.remoteRows = count || 0;
  
  // Compare row counts
  if (tableStatus.localRows === tableStatus.remoteRows) {
    // Tables are in sync
    return;
  }
  
  // Begin transaction
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Sync from local to Supabase
    if (tableStatus.localRows > 0) {
      // Delete all data from Supabase table
      const { error: deleteError } = await supabaseClient
        .from(tableName)
        .delete()
        .neq('id', 0);
      
      if (deleteError && !deleteError.message.includes('no rows')) {
        throw deleteError;
      }
      
      // Insert all data into Supabase
      const { error: insertError } = await supabaseClient
        .from(tableName)
        .insert(localResult.rows);
      
      if (insertError) {
        throw insertError;
      }
    } else if (tableStatus.remoteRows > 0) {
      // Sync from Supabase to local
      // Delete all data from local table
      await client.query(`DELETE FROM ${tableName}`);
      
      // Insert all data into local table
      if (remoteData && remoteData.length > 0) {
        const columns = Object.keys(remoteData[0]);
        const placeholders = remoteData.map((_, i) => 
          `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
        ).join(', ');
        
        const values = remoteData.flatMap(item => columns.map(col => item[col]));
        
        const sql = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES ${placeholders}
        `;
        
        await client.query(sql, values);
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Switch database type
 */
export async function switchDatabaseType(type: 'local' | 'supabase' | 'both'): Promise<boolean> {
  try {
    // Initialize the new database type
    const success = await initializeDatabase(type);
    
    if (!success) {
      throw new Error(`Failed to initialize ${type} database`);
    }
    
    // Update the current database type
    setDatabaseType(type);
    
    // If switching to 'both', start replication
    if (type === 'both') {
      await initializeReplication();
    } else {
      // Stop replication if not using 'both'
      stopReplication();
    }
    
    toast.success(`Switched to ${type} database`);
    return true;
  } catch (error) {
    console.error('Database switch error:', error);
    toast.error(`Failed to switch database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}