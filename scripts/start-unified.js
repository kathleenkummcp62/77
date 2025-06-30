#!/usr/bin/env node

/**
 * Unified starter script for VPN Bruteforce Dashboard
 * This script starts both the Go backend and React frontend in a single process
 */

import { spawn } from 'cross-spawn';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
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
const USE_MOCK_SERVER = process.env.USE_MOCK_SERVER === 'true';

// Check if Go is installed
async function checkGoInstalled() {
  try {
    const child = spawn('go', ['version']);
    return new Promise((resolve) => {
      child.on('close', (code) => {
        resolve(code === 0);
      });
    });
  } catch (error) {
    return false;
  }
}

// Start the backend server
async function startBackend() {
  console.log('🚀 Starting backend server...');
  
  if (USE_MOCK_SERVER) {
    console.log('🔄 Using mock API server instead of Go backend');
    const mockServer = spawn('node', ['scripts/mock-api-server.js'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: BACKEND_PORT.toString() }
    });
    
    mockServer.on('error', (err) => {
      console.error('❌ Failed to start mock server:', err);
      process.exit(1);
    });
    
    return mockServer;
  }
  
  const goInstalled = await checkGoInstalled();
  if (!goInstalled) {
    console.error('❌ Go is not installed. Please install Go to run the backend server.');
    console.log('🔄 Falling back to mock API server...');
    
    const mockServer = spawn('node', ['scripts/mock-api-server.js'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: BACKEND_PORT.toString() }
    });
    
    mockServer.on('error', (err) => {
      console.error('❌ Failed to start mock server:', err);
      process.exit(1);
    });
    
    return mockServer;
  }
  
  const backend = spawn('go', ['run', 'cmd/dashboard/main.go', `-port=${BACKEND_PORT}`], {
    stdio: 'inherit'
  });
  
  backend.on('error', (err) => {
    console.error('❌ Failed to start backend server:', err);
    process.exit(1);
  });
  
  return backend;
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
  
  // Wait for the backend to be ready
  try {
    await waitOn({
      resources: [`http://localhost:${BACKEND_PORT}/api/stats`],
      timeout: 30000,
      interval: 1000,
    });
    console.log('✅ Backend server is ready');
  } catch (error) {
    console.error('❌ Backend server failed to start:', error);
    backendProcess.kill();
    process.exit(1);
  }
  
  // Start the frontend
  const frontendProcess = startFrontend();
  
  // Wait for the frontend to be ready
  try {
    await waitOn({
      resources: [`http://localhost:${FRONTEND_PORT}`],
      timeout: 30000,
      interval: 1000,
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
  if (!await fs.pathExists(path.join(projectRoot, 'node_modules/http-proxy-middleware'))) {
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