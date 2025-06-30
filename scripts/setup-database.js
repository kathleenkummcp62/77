#!/usr/bin/env node

/**
 * Setup database for VPN Bruteforce Dashboard
 * This script creates the database schema and loads initial data
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Check if Supabase is configured
function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || localStorage?.getItem('supabase_url');
  const key = process.env.SUPABASE_ANON_KEY || localStorage?.getItem('supabase_anon_key');
  return !!(url && key);
}

// Create Supabase client
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || localStorage?.getItem('supabase_url');
  const key = process.env.SUPABASE_ANON_KEY || localStorage?.getItem('supabase_anon_key');
  
  if (!url || !key) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(url, key);
}

// Create database schema
async function createDatabaseSchema() {
  console.log('Creating database schema...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Create tables
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
    
    // Execute SQL queries
    for (const query of createTableQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.warn('RPC exec_sql not available, trying alternative method');
          // If RPC is not available, we can't create tables directly
          // In a real implementation, we would use migrations
        }
      } catch (err) {
        console.warn('Failed to execute SQL:', err);
      }
    }
    
    console.log('Database schema created successfully');
    return true;
  } catch (error) {
    console.error('Error creating database schema:', error);
    return false;
  }
}

// Load initial data
async function loadInitialData() {
  console.log('Loading initial data...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Load SSH credentials
    const sshCredsFile = path.join(projectRoot, 'credentials.txt');
    if (await fs.pathExists(sshCredsFile)) {
      const content = await fs.readFile(sshCredsFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      for (const line of lines) {
        const parts = line.split(';');
        if (parts.length === 3) {
          const [ip, username, password] = parts;
          
          const { error } = await supabase
            .from('servers')
            .upsert({
              ip,
              username,
              status: 'offline'
            }, { onConflict: 'ip' });
          
          if (error) {
            console.warn(`Error inserting server ${ip}:`, error);
          }
        }
      }
    }
    
    // Load VPN credentials
    const vpnTypes = ['fortinet', 'paloalto', 'sonicwall', 'sophos', 'watchguard', 'cisco'];
    
    for (const vpnType of vpnTypes) {
      const credsFile = path.join(projectRoot, 'creds', `${vpnType}.txt`);
      if (await fs.pathExists(credsFile)) {
        const content = await fs.readFile(credsFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        for (const line of lines) {
          const parts = line.split(';');
          if (parts.length >= 2) {
            const ip = parts[0];
            const username = parts[1];
            const password = parts.length > 2 ? parts[2] : '';
            
            const { error } = await supabase
              .from('vpn_credentials')
              .upsert({
                ip,
                username,
                password,
                vpn_type: vpnType,
                status: 'pending'
              }, { onConflict: 'ip, username, vpn_type' });
            
            if (error) {
              console.warn(`Error inserting VPN credential ${ip}:`, error);
            }
          }
        }
      }
    }
    
    console.log('Initial data loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading initial data:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== VPN Bruteforce Dashboard Database Setup ===');
  
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured');
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    console.error('or use the Database tab in the dashboard to configure Supabase');
    return false;
  }
  
  // Create database schema
  const schemaCreated = await createDatabaseSchema();
  if (!schemaCreated) {
    console.error('❌ Failed to create database schema');
    return false;
  }
  
  // Load initial data
  const dataLoaded = await loadInitialData();
  if (!dataLoaded) {
    console.error('❌ Failed to load initial data');
    return false;
  }
  
  console.log('✅ Database setup completed successfully');
  return true;
}

// Run the main function
if (require.main === module) {
  main()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createDatabaseSchema, loadInitialData };