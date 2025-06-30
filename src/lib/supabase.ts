import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(localStorage.getItem('supabase_url') && localStorage.getItem('supabase_anon_key'));
}

// Initialize Supabase with provided credentials
export async function initializeSupabase(url: string, key: string): Promise<void> {
  try {
    // Validate URL format
    new URL(url);
    
    // Basic validation for the key
    if (!key || key.length < 20) {
      throw new Error('Invalid Supabase anon key format');
    }
    
    // Store credentials in localStorage
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
    
    // Test the connection
    const supabase = createClient(url, key);
    const { error } = await supabase.from('_test_connection').select('count', { count: 'exact', head: true });
    
    // If the table doesn't exist, that's fine - we just want to test the connection
    if (error && !error.message.includes('does not exist') && !error.message.includes('PGRST116')) {
      throw error;
    }
    
    return;
  } catch (error: any) {
    console.error('Supabase initialization error:', error);
    clearSupabaseConfig();
    throw new Error(`Failed to initialize Supabase: ${error.message}`);
  }
}

// Get Supabase client (throws error if not configured)
export function getSupabase() {
  const url = localStorage.getItem('supabase_url');
  const key = localStorage.getItem('supabase_anon_key');
  
  if (!url || !key) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(url, key);
}

// Get Supabase client (returns null if not configured)
export function getSupabaseSafe() {
  try {
    return getSupabase();
  } catch (error) {
    return null;
  }
}

// Clear Supabase configuration
export function clearSupabaseConfig() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
}

// Helper function to execute SQL via RPC (if available)
export async function executeSql(sql: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error: any) {
    console.error('SQL execution error:', error);
    toast.error(`SQL error: ${error.message}`);
    return false;
  }
}