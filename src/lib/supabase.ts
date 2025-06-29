import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Проверяем наличие настроек
const getSupabaseConfig = () => {
  // Сначала проверяем localStorage
  let url = localStorage.getItem('supabase_url');
  let key = localStorage.getItem('supabase_anon_key');
  
  // Если нет в localStorage, проверяем переменные окружения
  if (!url || !key) {
    url = import.meta.env.VITE_SUPABASE_URL;
    key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  
  return { url, key };
};

// Создаем клиент только если есть настройки
let supabaseClient: SupabaseClient | null = null;

const initClient = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      supabaseClient = null;
    }
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
    try {
      supabaseClient = createClient(url, key);
    } catch (error) {
      throw new Error(`Failed to create Supabase client: ${error}`);
    }
  }
  return supabaseClient;
};

// Безопасный геттер, который не выбрасывает ошибки
export const getSupabaseSafe = (): SupabaseClient | null => {
  try {
    return getSupabase();
  } catch {
    return null;
  }
};

export const initializeSupabase = (url: string, key: string) => {
  try {
    // Валидация URL
    new URL(url);
    
    // Валидация ключа (базовая проверка)
    if (!key || key.length < 10) {
      throw new Error('Invalid Supabase key');
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
    
    // Пересоздаем клиент с новыми настройками
    supabaseClient = createClient(url, key);
    
    console.log('✅ Supabase configured successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    throw error;
  }
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  supabaseClient = null;
  console.log('🗑️ Supabase configuration cleared');
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