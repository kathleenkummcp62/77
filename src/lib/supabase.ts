import { createClient } from '@supabase/supabase-js';

// Эти переменные будут установлены через UI
const supabaseUrl = localStorage.getItem('supabase_url') || '';
const supabaseKey = localStorage.getItem('supabase_anon_key') || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const initializeSupabase = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  // Перезагружаем страницу для применения новых настроек
  window.location.reload();
};

export const isSupabaseConfigured = () => {
  return !!(localStorage.getItem('supabase_url') && localStorage.getItem('supabase_anon_key'));
};

// Database schemas
export interface VPNCredential {
  id: string;
  ip: string;
  username: string;
  password: string;
  vpn_type: string;
  port?: number;
  domain?: string;
  group_name?: string;
  status: 'pending' | 'testing' | 'valid' | 'invalid' | 'error';
  tested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  id: string;
  credential_id: string;
  server_ip: string;
  vpn_type: string;
  status: 'success' | 'failed' | 'error' | 'timeout';
  response_time: number;
  error_message?: string;
  response_data?: any;
  created_at: string;
}

export interface Server {
  id: string;
  ip: string;
  username: string;
  status: 'online' | 'offline' | 'error';
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  current_task?: string;
  last_seen: string;
  created_at: string;
}

export interface ScanSession {
  id: string;
  name: string;
  vpn_type: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error';
  total_credentials: number;
  processed_credentials: number;
  valid_found: number;
  errors_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}