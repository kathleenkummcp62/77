#!/usr/bin/env node

/**
 * Unified starter script for VPN Bruteforce Dashboard
 * This script starts both the mock backend and React frontend in a single process
 */

import { spawn } from 'cross-spawn';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import waitOn from 'wait-on';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const BACKEND_PORT = 8080;
const FRONTEND_PORT = 5173;
const UNIFIED_PORT = 3000;

// Start the mock backend server (Go is not available in WebContainer)
async function startBackend() {
  console.log('🚀 Starting mock backend server...');
  console.log('ℹ️  Using mock API server (Go not available in WebContainer)');
  console.log('⏳ Waiting for backend server to initialize...');
  
  const mockServer = spawn('node', ['scripts/mock-api-server.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: BACKEND_PORT.toString() }
  });
  
  mockServer.on('error', (err) => {
    console.error('❌ Failed to start mock server:', err);
    process.exit(1);
  });
  
  // Increase delay to allow the server to fully initialize
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  return mockServer;
}

// Start the frontend server
function startFrontend() {
  console.log('🚀 Starting frontend server...');
  
  const frontend = spawn('npm', ['run', 'frontend'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_WS_PORT: BACKEND_PORT.toString() }
  });
  
  frontend.on('error', (err) => {
    console.error('❌ Failed to start frontend server:', err);
    process.exit(1);
  });
  
  return frontend;
}

// Start the unified server
async function startUnifiedServer() {
  // Start the backend
  const backendProcess = await startBackend();
  
  // Wait for the backend to be ready with increased timeout
  try {
    console.log('⏳ Checking backend health...');
    await waitOn({
      resources: [`http://localhost:${BACKEND_PORT}/api/health`],
      timeout: 90000, // Increased timeout to 90 seconds
      interval: 3000, // Increased interval to 3 seconds
      delay: 2000, // Increased initial delay
      verbose: true, // Enable verbose logging
      log: true // Enable logging
    });
    console.log('✅ Backend server is ready');
  } catch (error) {
    console.error('❌ Backend server failed to start within timeout period');
    console.error('ℹ️  This might be due to slow initialization. Trying to continue...');
    
    // Try a simple HTTP request to check if the server is actually running
    try {
      const response = await fetch(`http://localhost:${BACKEND_PORT}/api/health`);
      if (response.ok) {
        console.log('✅ Backend server is actually running, continuing...');
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('❌ Backend server is not responding:', fetchError.message);
      backendProcess.kill();
      process.exit(1);
    }
  }
  
  // Start the frontend
  const frontendProcess = startFrontend();
  
  // Wait for the frontend to be ready
  try {
    await waitOn({
      resources: [`http://localhost:${FRONTEND_PORT}`],
      timeout: 90000, // Increased timeout to 90 seconds
      interval: 2000,
      delay: 1000
    });
    console.log('✅ Frontend server is ready');
  } catch (error) {
    console.error('❌ Frontend server failed to start:', error);
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(1);
  }
  
  // Create a proxy server to unify the frontend and backend
  const app = express();
  
  // Proxy API requests to the backend
  app.use('/api', createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    changeOrigin: true
  }));
  
  // Proxy WebSocket requests to the backend
  app.use('/ws', createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    ws: true,
    changeOrigin: true
  }));
  
  // Proxy all other requests to the frontend
  app.use('/', createProxyMiddleware({
    target: `http://localhost:${FRONTEND_PORT}`,
    changeOrigin: true,
    ws: true
  }));
  
  // Start the proxy server
  const server = app.listen(UNIFIED_PORT, () => {
    console.log(`\n🚀 VPN Bruteforce Dashboard is running at http://localhost:${UNIFIED_PORT}`);
    console.log('ℹ️  Running with mock backend (Go not available in WebContainer)');
    console.log('Press Ctrl+C to stop');
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    server.close();
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    server.close();
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });
}

// Main function
async function main() {
  console.log('=== VPN Bruteforce Dashboard ===');
  
  // Check if required packages are installed
  if (!fs.existsSync(path.join(projectRoot, 'node_modules/http-proxy-middleware'))) {
    console.log('📦 Installing required packages...');
    spawn.sync('npm', ['install', 'http-proxy-middleware', 'express', 'wait-on', 'cross-spawn'], {
      stdio: 'inherit'
    });
  }
  
  // Start the unified server
  await startUnifiedServer();
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});