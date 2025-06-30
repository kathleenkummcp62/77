#!/usr/bin/env node

// Ensure Node.js 20+ is used
const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`\u274c Node.js 20 or newer is required. Current version: ${process.versions.node}`);
  console.error('Please upgrade Node.js to run the dashboard.');
  process.exit(1);
}

/**
 * Unified starter script for VPN Bruteforce Dashboard
 * This script starts both the mock backend and React frontend in a single process
 */

import { spawn } from 'child_process';
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

// Helper function to add delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start the mock backend server (Go is not available in WebContainer)
async function startBackend() {
  console.log('🚀 Starting mock backend server...');
  console.log('ℹ️  Using mock API server (Go not available in WebContainer)');
  
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
  
  // Wait for the backend to be ready with increased timeout and better error handling
  try {
    await waitOn({
      resources: [`http://localhost:${BACKEND_PORT}/api/health`],
      timeout: 30000, // 30 seconds
      interval: 1000, // Check every second
      window: 1000, // Wait 1 second after success before continuing
      validateStatus: function(status) {
        return status >= 200 && status < 300; // Only accept 2xx status codes
      },
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log('✅ Backend server is ready');
  } catch (error) {
    console.error('❌ Backend server failed to start:', error);
    console.error('💡 Try checking if port 8080 is available or restart the application');
    backendProcess.kill();
    process.exit(1);
  }
  
  // Start the frontend
  const frontendProcess = startFrontend();
  
  // Wait for the frontend to be ready
  try {
    await waitOn({
      resources: [`http://localhost:${FRONTEND_PORT}`],
      timeout: 60000, // 60 seconds
      interval: 1000, // Check every second
      window: 1000
    });
    console.log('✅ Frontend server is ready');
  } catch (error) {
    console.error('❌ Frontend server failed to start:', error);
    console.error('💡 Try checking if port 5173 is available or restart the application');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(1);
  }
  
  // Create a proxy server to unify the frontend and backend
  const app = express();
  
  // Proxy API requests to the backend
  app.use('/api', createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api'
    },
    onError: (err, req, res) => {
      console.error('Proxy error for API:', err);
      res.status(500).json({ error: 'Backend service unavailable' });
    }
  }));
  
  // Proxy WebSocket requests to the backend
  app.use('/ws', createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    ws: true,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error('Proxy error for WebSocket:', err);
    }
  }));
  
  // Proxy all other requests to the frontend
  app.use('/', createProxyMiddleware({
    target: `http://localhost:${FRONTEND_PORT}`,
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
      console.error('Proxy error for frontend:', err);
    }
  }));
  
  // Start the proxy server
  const server = app.listen(UNIFIED_PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VPN Bruteforce Dashboard is running at http://localhost:${UNIFIED_PORT}`);
    console.log(`🌐 External access: http://${getServerIP()}:${UNIFIED_PORT}`);
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

// Helper function to get server IP
function getServerIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (!net.internal && net.family === 'IPv4') {
        return net.address;
      }
    }
  }
  
  return 'localhost';
}

// Main function
async function main() {
  console.log('=== VPN Bruteforce Dashboard ===');
  
  // Check if required packages are installed
  const requiredPackages = ['http-proxy-middleware', 'express', 'wait-on', 'ws', 'cors'];
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    const installedDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const missingPackages = requiredPackages.filter(pkg => !installedDeps[pkg]);
    
    if (missingPackages.length > 0) {
      console.log(`📦 Installing missing packages: ${missingPackages.join(', ')}...`);
      spawn.sync('npm', ['install', '--no-save', ...missingPackages], {
        stdio: 'inherit'
      });
    }
  }
  
  // Start the unified server
  await startUnifiedServer();
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});