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
import rateLimit from 'express-rate-limit';

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
  
  console.log('⏳ Waiting for backend server to initialize...');
  
  // Add a 10-second delay to allow the mock server to fully initialize
  console.log('⏳ Allowing mock server time to initialize...');
  await delay(10000);
  
  // Try to make a direct request to the API to check if it's running
  try {
    const response = await fetch(`http://127.0.0.1:${BACKEND_PORT}/api/health`);
    if (response.ok) {
      console.log('✅ Backend server is ready');
    } else {
      throw new Error(`Backend server returned status ${response.status}`);
    }
  } catch (error) {
    console.error('⚠️ Could not connect to backend health check, but continuing anyway:', error.message);
    console.log('✅ Continuing with startup despite health check failure...');
  }
  
  // Start the frontend
  const frontendProcess = startFrontend();
  
  // Wait for the frontend to be ready
  try {
    await waitOn({
      resources: [`http://127.0.0.1:${FRONTEND_PORT}`],
      timeout: 120000, // 120 seconds (increased from 60 seconds)
      interval: 2000, // Check every 2 seconds
      window: 5000 // Increased from 2000 to 5000 to allow more time for server stabilization
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
  
  // Add rate limiting middleware
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  
  // Apply rate limiting to API routes
  app.use('/api', apiLimiter);
  
  // Add CORS headers middleware
  app.use((req, res, next) => {
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // For development, allow any origin
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Proxy API requests to the backend
  app.use('/api', createProxyMiddleware({
    target: `http://127.0.0.1:${BACKEND_PORT}`,
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
    target: `http://127.0.0.1:${BACKEND_PORT}`,
    ws: true,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error('Proxy error for WebSocket:', err);
    }
  }));
  
  // Proxy all other requests to the frontend
  app.use('/', createProxyMiddleware({
    target: `http://127.0.0.1:${FRONTEND_PORT}`,
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
  const requiredPackages = ['http-proxy-middleware', 'express', 'wait-on', 'ws', 'cors', 'express-rate-limit'];
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