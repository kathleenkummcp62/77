#!/usr/bin/env node

/**
 * Mock API server for VPN Bruteforce Dashboard
 * Provides mock endpoints when Go backend is not available
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Mock data
let mockStats = {
  totalScanned: 1250,
  validCredentials: 45,
  activeThreads: 150,
  scanRate: 2500,
  uptime: Date.now() - 3600000, // 1 hour ago
  lastUpdate: new Date().toISOString()
};

let mockLogs = [
  { id: 1, timestamp: new Date().toISOString(), level: 'info', message: 'Mock server started', component: 'api' },
  { id: 2, timestamp: new Date().toISOString(), level: 'success', message: 'Valid credentials found: admin:password123', component: 'scanner' },
  { id: 3, timestamp: new Date().toISOString(), level: 'warning', message: 'High memory usage detected', component: 'system' }
];

let mockResults = [
  { id: 1, ip: '192.168.1.100', username: 'admin', password: 'password123', vpnType: 'fortinet', timestamp: new Date().toISOString() },
  { id: 2, ip: '10.0.0.50', username: 'user', password: 'admin123', vpnType: 'cisco', timestamp: new Date().toISOString() }
];

// API Routes
app.get('/api/stats', (req, res) => {
  // Update mock stats with some variation
  mockStats.totalScanned += Math.floor(Math.random() * 10);
  mockStats.validCredentials += Math.floor(Math.random() * 2);
  mockStats.activeThreads = 100 + Math.floor(Math.random() * 100);
  mockStats.scanRate = 2000 + Math.floor(Math.random() * 1000);
  mockStats.lastUpdate = new Date().toISOString();
  
  res.json({
    success: true,
    data: mockStats
  });
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({
    success: true,
    data: mockLogs.slice(-limit)
  });
});

app.get('/api/results', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({
    success: true,
    data: mockResults.slice(-limit)
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'mock-api',
    version: '1.0.0'
  });
});

app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, vpn_type: 'fortinet', server: 'server1.example.com', status: 'running' },
      { id: 2, vpn_type: 'globalprotect', server: 'server2.example.com', status: 'idle' }
    ]
  });
});

app.get('/api/credentials', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, login: 'admin', password: 'password123' },
      { id: 2, login: 'user', password: 'admin123' }
    ]
  });
});

app.get('/api/proxies', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, address: '192.168.1.100:8080', username: 'proxy1', password: 'pass1' },
      { id: 2, address: '192.168.1.101:8080', username: 'proxy2', password: 'pass2' }
    ]
  });
});

app.get('/api/vendor_urls', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, url: 'https://vpn1.example.com' },
      { id: 2, url: 'https://vpn2.example.com' }
    ]
  });
});

app.post('/api/logs', (req, res) => {
  const { level, message, component } = req.body;
  const newLog = {
    id: mockLogs.length + 1,
    timestamp: new Date().toISOString(),
    level: level || 'info',
    message: message || 'No message',
    component: component || 'unknown'
  };
  
  mockLogs.push(newLog);
  
  // Keep only last 1000 logs
  if (mockLogs.length > 1000) {
    mockLogs = mockLogs.slice(-1000);
  }
  
  res.json({
    success: true,
    data: newLog
  });
});

app.post('/api/results', (req, res) => {
  const { ip, username, password, vpnType } = req.body;
  const newResult = {
    id: mockResults.length + 1,
    ip: ip || '0.0.0.0',
    username: username || 'unknown',
    password: password || 'unknown',
    vpnType: vpnType || 'unknown',
    timestamp: new Date().toISOString()
  };
  
  mockResults.push(newResult);
  mockStats.validCredentials++;
  
  res.json({
    success: true,
    data: newResult
  });
});

// Serve the frontend from the dist directory if it exists
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // For SPA routing - serve index.html for any non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send initial data
  ws.send(JSON.stringify({ 
    type: 'stats_update', 
    data: {
      goods: 45,
      bads: 1205,
      errors: 15,
      offline: 10,
      ipblock: 5,
      processed: 1275,
      rps: 25,
      avg_rps: 22,
      peak_rps: 30,
      threads: 150,
      uptime: 3600,
      success_rate: 3.5
    },
    timestamp: Date.now()
  }));
  
  ws.send(JSON.stringify({
    type: 'server_info',
    data: [
      {
        ip: '192.0.2.10',
        status: 'online',
        uptime: '2h 15m',
        cpu: 45,
        memory: 60,
        disk: 75,
        speed: '25/s',
        processed: 1275,
        goods: 45,
        bads: 1205,
        errors: 15,
        progress: 65,
        current_task: 'Scanning Fortinet VPNs'
      },
      {
        ip: '192.0.2.11',
        status: 'online',
        uptime: '1h 30m',
        cpu: 35,
        memory: 50,
        disk: 65,
        speed: '20/s',
        processed: 980,
        goods: 32,
        bads: 930,
        errors: 18,
        progress: 45,
        current_task: 'Scanning GlobalProtect VPNs'
      }
    ],
    timestamp: Date.now()
  }));
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      // Update stats
      const stats = {
        goods: 45 + Math.floor(Math.random() * 5),
        bads: 1205 + Math.floor(Math.random() * 20),
        errors: 15 + Math.floor(Math.random() * 2),
        offline: 10,
        ipblock: 5,
        processed: 1275 + Math.floor(Math.random() * 25),
        rps: 20 + Math.floor(Math.random() * 10),
        avg_rps: 22,
        peak_rps: 30,
        threads: 150,
        uptime: 3600 + Math.floor(Date.now() / 1000) % 3600,
        success_rate: 3.5
      };
      
      ws.send(JSON.stringify({ type: 'stats_update', data: stats, timestamp: Date.now() }));
      
      // Occasionally send a new log
      if (Math.random() < 0.3) {
        const newLog = {
          id: mockLogs.length + 1,
          timestamp: new Date().toISOString(),
          level: ['info', 'warning', 'success'][Math.floor(Math.random() * 3)],
          message: `Mock event ${Date.now()}`,
          component: 'scanner'
        };
        mockLogs.push(newLog);
        ws.send(JSON.stringify({ type: 'log', data: newLog }));
      }
    }
  }, 2000);
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Mock API server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🔌 WebSocket server running for real-time updates`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mock server...');
  server.close(() => {
    process.exit(0);
  });
});