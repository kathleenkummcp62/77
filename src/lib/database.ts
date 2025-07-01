import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient, QueryResult } from 'pg';
import toast from 'react-hot-toast';

// PostgreSQL connection pool
let pgPool: Pool | null = null;

// Supabase client
let supabaseClient: SupabaseClient | null = null;

// Database type
export type DatabaseType = 'local' | 'supabase' | 'both';

// Current database configuration
let currentDbType: DatabaseType = 'local';

/**
 * Initialize the database connection
 */
export async function initializeDatabase(type: DatabaseType = 'local'): Promise<boolean> {
  try {
    currentDbType = type;
    
    // Initialize local PostgreSQL if needed
    if (type === 'local' || type === 'both') {
      if (!pgPool) {
        const { Pool } = await import('pg');
        pgPool = new Pool({
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'postgres',
          database: 'vpn_data',
          max: 20, // Maximum number of clients in the pool
          idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
          connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        });
        
        // Test the connection
        const client = await pgPool.connect();
        client.release();
        console.log('Local PostgreSQL connection established');
      }
    }
    
    // Initialize Supabase if needed
    if (type === 'supabase' || type === 'both') {
      if (!supabaseClient) {
        const url = localStorage.getItem('supabase_url');
        const key = localStorage.getItem('supabase_anon_key');
        
        if (!url || !key) {
          throw new Error('Supabase configuration not found');
        }
        
        supabaseClient = createClient(url, key);
        
        // Test the connection
        const { error } = await supabaseClient.from('_test_connection').select('count', { count: 'exact', head: true });
        if (error && !error.message.includes('does not exist') && !error.message.includes('PGRST116')) {
          throw error;
        }
        
        console.log('Supabase connection established');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    toast.error(`Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Close database connections
 */
export async function closeDatabase(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  
  supabaseClient = null;
}

/**
 * Get the current database type
 */
export function getDatabaseType(): DatabaseType {
  return currentDbType;
}

/**
 * Set the current database type
 */
export function setDatabaseType(type: DatabaseType): void {
  currentDbType = type;
}

/**
 * Execute a query on the local PostgreSQL database
 */
export async function queryLocal<T = any>(
  sql: string, 
  params: any[] = []
): Promise<QueryResult<T>> {
  if (!pgPool) {
    throw new Error('Local PostgreSQL not initialized');
  }
  
  // Execute query
  const result = await pgPool.query<T>(sql, params);
  
  return result;
}

/**
 * Execute a query on Supabase
 */
export async function querySupabase<T = any>(
  table: string,
  options: {
    select?: string;
    eq?: Record<string, any>;
    in?: Record<string, any[]>;
    gt?: Record<string, any>;
    lt?: Record<string, any>;
    order?: Record<string, 'asc' | 'desc'>;
    limit?: number;
    offset?: number;
  } = {}
): Promise<T[]> {
  if (!supabaseClient) {
    throw new Error('Supabase not initialized');
  }
  
  const { 
    select = '*', 
    eq = {}, 
    in: inFilter = {}, 
    gt = {}, 
    lt = {}, 
    order = {}, 
    limit, 
    offset
  } = options;
  
  // Build query
  let query = supabaseClient.from(table).select(select);
  
  // Apply filters
  Object.entries(eq).forEach(([column, value]) => {
    query = query.eq(column, value);
  });
  
  Object.entries(inFilter).forEach(([column, values]) => {
    query = query.in(column, values);
  });
  
  Object.entries(gt).forEach(([column, value]) => {
    query = query.gt(column, value);
  });
  
  Object.entries(lt).forEach(([column, value]) => {
    query = query.lt(column, value);
  });
  
  // Apply ordering
  Object.entries(order).forEach(([column, direction]) => {
    query = query.order(column, { ascending: direction === 'asc' });
  });
  
  // Apply pagination
  if (limit !== undefined) {
    query = query.limit(limit);
  }
  
  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }
  
  // Execute query
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return data as T[];
}

/**
 * Execute a query on the appropriate database(s)
 */
export async function query<T = any>(
  sql: string,
  params: any[] = [],
  options: {
    table?: string; // For Supabase
    pagination?: { page: number; pageSize: number };
  } = {}
): Promise<{ rows: T[]; count?: number }> {
  const { table, pagination } = options;
  
  // Handle pagination
  let paginatedSql = sql;
  let countSql: string | undefined;
  
  if (pagination) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    
    // Create count query
    countSql = `SELECT COUNT(*) FROM (${sql.replace(/SELECT .* FROM/i, 'SELECT 1 FROM')}) AS count_query`;
    
    // Add pagination to the original query
    paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${offset}`;
  }
  
  try {
    if (currentDbType === 'local') {
      // Query local PostgreSQL
      const result = await queryLocal<T>(paginatedSql, params);
      
      let count: number | undefined;
      if (countSql) {
        const countResult = await queryLocal<{ count: string }>(countSql, params);
        count = parseInt(countResult.rows[0]?.count || '0', 10);
      }
      
      return { rows: result.rows, count };
    } else if (currentDbType === 'supabase') {
      // Query Supabase
      if (!table) {
        throw new Error('Table name is required for Supabase queries');
      }
      
      // For Supabase, we need to convert the SQL to Supabase's query builder
      // This is a simplified implementation and may not work for complex queries
      const data = await querySupabase<T>(table, {
        limit: pagination?.pageSize,
        offset: pagination ? (pagination.page - 1) * pagination.pageSize : undefined
      });
      
      let count: number | undefined;
      if (pagination) {
        const { data: countData, error } = await supabaseClient!
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          count = countData?.length || 0;
        }
      }
      
      return { rows: data, count };
    } else if (currentDbType === 'both') {
      // Query both and return local results (Supabase is used for replication)
      const localResult = await queryLocal<T>(paginatedSql, params);
      
      let count: number | undefined;
      if (countSql) {
        const countResult = await queryLocal<{ count: string }>(countSql, params);
        count = parseInt(countResult.rows[0]?.count || '0', 10);
      }
      
      // Also query Supabase for replication purposes, but don't wait for it
      if (table) {
        querySupabase(table, {}).catch(console.error);
      }
      
      return { rows: localResult.rows, count };
    } else {
      throw new Error(`Unsupported database type: ${currentDbType}`);
    }
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Insert data into the database
 */
export async function insert<T = any>(
  table: string,
  data: Record<string, any> | Record<string, any>[],
  options: {
    returning?: string;
  } = {}
): Promise<T[]> {
  const { returning = '*' } = options;
  
  try {
    if (currentDbType === 'local' || currentDbType === 'both') {
      // Insert into local PostgreSQL
      const isArray = Array.isArray(data);
      const items = isArray ? data : [data];
      
      if (items.length === 0) {
        return [];
      }
      
      // Build the query
      const columns = Object.keys(items[0]);
      const placeholders = items.map((_, i) => 
        `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
      ).join(', ');
      
      const values = items.flatMap(item => columns.map(col => item[col]));
      
      const sql = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING ${returning}
      `;
      
      const result = await queryLocal<T>(sql, values);
      
      // Also insert into Supabase if using both
      if (currentDbType === 'both' && supabaseClient) {
        // Don't wait for Supabase to complete
        supabaseClient.from(table).insert(data).select(returning).catch(console.error);
      }
      
      return result.rows;
    } else if (currentDbType === 'supabase') {
      // Insert into Supabase
      if (!supabaseClient) {
        throw new Error('Supabase not initialized');
      }
      
      const { data: result, error } = await supabaseClient
        .from(table)
        .insert(data)
        .select(returning);
      
      if (error) {
        throw error;
      }
      
      return result as T[];
    } else {
      throw new Error(`Unsupported database type: ${currentDbType}`);
    }
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
}

/**
 * Update data in the database
 */
export async function update<T = any>(
  table: string,
  id: number | string,
  data: Record<string, any>,
  options: {
    idColumn?: string;
    returning?: string;
  } = {}
): Promise<T[]> {
  const { idColumn = 'id', returning = '*' } = options;
  
  try {
    if (currentDbType === 'local' || currentDbType === 'both') {
      // Update in local PostgreSQL
      const columns = Object.keys(data);
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      
      const sql = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${idColumn} = $${columns.length + 1}
        RETURNING ${returning}
      `;
      
      const values = [...columns.map(col => data[col]), id];
      
      const result = await queryLocal<T>(sql, values);
      
      // Also update in Supabase if using both
      if (currentDbType === 'both' && supabaseClient) {
        // Don't wait for Supabase to complete
        supabaseClient
          .from(table)
          .update(data)
          .eq(idColumn, id)
          .select(returning)
          .catch(console.error);
      }
      
      return result.rows;
    } else if (currentDbType === 'supabase') {
      // Update in Supabase
      if (!supabaseClient) {
        throw new Error('Supabase not initialized');
      }
      
      const { data: result, error } = await supabaseClient
        .from(table)
        .update(data)
        .eq(idColumn, id)
        .select(returning);
      
      if (error) {
        throw error;
      }
      
      return result as T[];
    } else {
      throw new Error(`Unsupported database type: ${currentDbType}`);
    }
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
}

/**
 * Delete data from the database
 */
export async function remove(
  table: string,
  id: number | string | (number | string)[],
  options: {
    idColumn?: string;
  } = {}
): Promise<void> {
  const { idColumn = 'id' } = options;
  
  try {
    if (currentDbType === 'local' || currentDbType === 'both') {
      // Delete from local PostgreSQL
      let sql: string;
      let values: any[];
      
      if (Array.isArray(id)) {
        // Bulk delete
        sql = `DELETE FROM ${table} WHERE ${idColumn} = ANY($1)`;
        values = [id];
      } else {
        // Single delete
        sql = `DELETE FROM ${table} WHERE ${idColumn} = $1`;
        values = [id];
      }
      
      await queryLocal(sql, values);
      
      // Also delete from Supabase if using both
      if (currentDbType === 'both' && supabaseClient) {
        // Don't wait for Supabase to complete
        if (Array.isArray(id)) {
          supabaseClient
            .from(table)
            .delete()
            .in(idColumn, id)
            .catch(console.error);
        } else {
          supabaseClient
            .from(table)
            .delete()
            .eq(idColumn, id)
            .catch(console.error);
        }
      }
    } else if (currentDbType === 'supabase') {
      // Delete from Supabase
      if (!supabaseClient) {
        throw new Error('Supabase not initialized');
      }
      
      let error;
      
      if (Array.isArray(id)) {
        // Bulk delete
        ({ error } = await supabaseClient
          .from(table)
          .delete()
          .in(idColumn, id));
      } else {
        // Single delete
        ({ error } = await supabaseClient
          .from(table)
          .delete()
          .eq(idColumn, id));
      }
      
      if (error) {
        throw error;
      }
    } else {
      throw new Error(`Unsupported database type: ${currentDbType}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

/**
 * Begin a transaction
 */
export async function beginTransaction(): Promise<PoolClient> {
  if (!pgPool) {
    throw new Error('Local PostgreSQL not initialized');
  }
  
  const client = await pgPool.connect();
  await client.query('BEGIN');
  
  return client;
}

/**
 * Commit a transaction
 */
export async function commitTransaction(client: PoolClient): Promise<void> {
  await client.query('COMMIT');
  client.release();
}

/**
 * Rollback a transaction
 */
export async function rollbackTransaction(client: PoolClient): Promise<void> {
  await client.query('ROLLBACK');
  client.release();
}

/**
 * Clear the cache via backend API
 */
export async function clearCache(pattern?: string): Promise<void> {
  try {
    const url = pattern ? `/api/cache?pattern=${encodeURIComponent(pattern)}` : '/api/cache';
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Clear cache error:', error);
    throw error;
  }
}

/**
 * Get cache statistics via backend API
 */
export async function getCacheStats(): Promise<{ keys: number; hits: number; misses: number; ksize: number; vsize: number }> {
  try {
    const response = await fetch('/api/cache');
    
    if (!response.ok) {
      throw new Error(`Failed to get cache stats: ${response.statusText}`);
    }
    
    const stats = await response.json();
    return stats;
  } catch (error) {
    console.error('Get cache stats error:', error);
    // Return default stats if API call fails
    return { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 };
  }
}

/**
 * Synchronize data between local PostgreSQL and Supabase
 */
export async function syncDatabases(tables: string[]): Promise<{ table: string; status: 'success' | 'error'; message?: string }[]> {
  if (currentDbType !== 'both') {
    throw new Error('Database synchronization is only available in "both" mode');
  }
  
  if (!pgPool || !supabaseClient) {
    throw new Error('Both local PostgreSQL and Supabase must be initialized');
  }
  
  const results: { table: string; status: 'success' | 'error'; message?: string }[] = [];
  
  for (const table of tables) {
    try {
      // Get all data from local PostgreSQL
      const { rows } = await queryLocal(`SELECT * FROM ${table}`);
      
      if (rows.length === 0) {
        results.push({ table, status: 'success', message: 'No data to sync' });
        continue;
      }
      
      // Delete all data from Supabase table
      const { error: deleteError } = await supabaseClient.from(table).delete().neq('id', 0);
      
      if (deleteError && !deleteError.message.includes('no rows')) {
        throw deleteError;
      }
      
      // Insert all data into Supabase
      const { error: insertError } = await supabaseClient.from(table).insert(rows);
      
      if (insertError) {
        throw insertError;
      }
      
      results.push({ table, status: 'success' });
    } catch (error) {
      console.error(`Error syncing table ${table}:`, error);
      results.push({ 
        table, 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return results;
}

/**
 * Create database schema
 */
export async function createSchema(sql: string): Promise<void> {
  if (currentDbType === 'local' || currentDbType === 'both') {
    if (!pgPool) {
      throw new Error('Local PostgreSQL not initialized');
    }
    
    await pgPool.query(sql);
  }
  
  if (currentDbType === 'supabase' || currentDbType === 'both') {
    if (!supabaseClient) {
      throw new Error('Supabase not initialized');
    }
    
    const { error } = await supabaseClient.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
  }
}

/**
 * Add indexes to tables
 */
export async function addIndexes(indexes: { table: string; column: string; name?: string; unique?: boolean }[]): Promise<void> {
  for (const index of indexes) {
    const { table, column, name = `idx_${table}_${column}`, unique = false } = index;
    
    const sql = `
      CREATE ${unique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS ${name}
      ON ${table} (${column})
    `;
    
    if (currentDbType === 'local' || currentDbType === 'both') {
      if (!pgPool) {
        throw new Error('Local PostgreSQL not initialized');
      }
      
      await pgPool.query(sql);
    }
    
    if (currentDbType === 'supabase' || currentDbType === 'both') {
      if (!supabaseClient) {
        throw new Error('Supabase not initialized');
      }
      
      const { error } = await supabaseClient.rpc('exec_sql', { sql });
      
      if (error && !error.message.includes('already exists')) {
        throw error;
      }
    }
  }
}