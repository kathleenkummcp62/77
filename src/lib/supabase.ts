import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Проверяем наличие настроек
const getSupabaseConfig = () => {
  const url = localStorage.getItem('supabase_url');
  const key = localStorage.getItem('supabase_anon_key');
  return { url, key };
};

// Создаем клиент только если есть настройки
let supabaseClient: SupabaseClient | null = null;

const initClient = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

// Инициализируем клиент
initClient();

// Экспортируем геттер вместо прямого клиента
export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      throw new Error('Supabase not configured. Please set up your credentials first.');
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

// Для обратной совместимости
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabase();
    return client[prop as keyof SupabaseClient];
  }
});

export const initializeSupabase = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  
  // Пересоздаем клиент с новыми настройками
  supabaseClient = createClient(url, key);
  
  // Перезагружаем страницу для применения новых настроек
  window.location.reload();
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
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