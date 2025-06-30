#!/usr/bin/env node

/**
 * WebSocket client for testing the WebSocket server
 * This script connects to the WebSocket server and logs messages
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint - this is critical for the startup process
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'mock-api-server'
  });
});

// Mock API endpoints
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      goods: 89,
      bads: 1161,
      errors: 23,
      offline: 15,
      ipblock: 5,
      processed: 1250,
      rps: 42,
      avg_rps: 38,
      peak_rps: 65,
      threads: 100,
      uptime: 1800,
      success_rate: 7.12
    }
  });
});

app.get('/api/servers', (req, res) => {
  res.json({
    success: true,
    data: [
      { 
        ip: '192.168.1.100', 
        status: 'online', 
        uptime: '2h 15m',
        cpu: 45,
        memory: 67,
        disk: 32,
        speed: '42/s',
        processed: 450,
        goods: 32,
        bads: 398,
        errors: 20,
        progress: 65,
        current_task: 'Scanning Fortinet VPN'
      },
      { 
        ip: '10.0.0.50', 
        status: 'online', 
        uptime: '1h 30m',
        cpu: 38,
        memory: 52,
        disk: 45,
        speed: '38/s',
        processed: 350,
        goods: 25,
        bads: 310,
        errors: 15,
        progress: 42,
        current_task: 'Scanning GlobalProtect VPN'
      },
      { 
        ip: '172.16.0.25', 
        status: 'online', 
        uptime: '3h 10m',
        cpu: 62,
        memory: 78,
        disk: 55,
        speed: '45/s',
        processed: 650,
        goods: 42,
        bads: 580,
        errors: 28,
        progress: 78,
        current_task: 'Scanning SonicWall VPN'
      }
    ]
  });
});

app.get('/api/credentials', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, ip: '192.168.1.100', username: 'admin', password: 'password123' },
      { id: 2, ip: '10.0.0.50', username: 'user1', password: 'test123' }
    ]
  });
});

app.get('/api/proxies', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, address: '127.0.0.1:8080', username: 'proxy_user', password: 'proxy_pass' }
    ]
  });
});

app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, vpn_type: 'fortinet', server: 'server1.example.com', status: 'running' },
      { id: 2, vpn_type: 'globalprotect', server: 'server2.example.com', status: 'pending' }
    ]
  });
});

app.get('/api/vendor_urls', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, url: 'https://vpn.example.com' }
    ]
  });
});

app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    data: [
      { timestamp: new Date().toISOString(), level: 'info', message: 'System started', source: 'system' },
      { timestamp: new Date().toISOString(), level: 'info', message: 'Database connected', source: 'database' }
    ]
  });
});

// POST endpoints
app.post('/api/credentials', (req, res) => {
  res.json({
    success: true,
    data: { id: 3, ...req.body }
  });
});

app.post('/api/proxies', (req, res) => {
  res.json({
    success: true,
    data: { id: 2, ...req.body }
  });
});

app.post('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: { id: 3, ...req.body }
  });
});

app.post('/api/vendor_urls', (req, res) => {
  res.json({
    success: true,
    data: { id: 2, ...req.body }
  });
});

app.post('/api/start', (req, res) => {
  res.json({
    success: true,
    data: { status: 'started', vpn_type: req.body.vpn_type || 'unknown' }
  });
});

app.post('/api/stop', (req, res) => {
  res.json({
    success: true,
    data: { status: 'stopped', vpn_type: req.body.vpn_type || 'unknown' }
  });
});

app.post('/api/config', (req, res) => {
  res.json({
    success: true,
    data: { status: 'updated' }
  });
});

// PUT and DELETE endpoints for each resource
['credentials', 'proxies', 'tasks', 'vendor_urls'].forEach(resource => {
  app.put(`/api/${resource}/:id`, (req, res) => {
    res.json({
      success: true,
      data: { id: parseInt(req.params.id), ...req.body }
    });
  });
  
  app.delete(`/api/${resource}/:id`, (req, res) => {
    res.json({
      success: true,
      data: { id: parseInt(req.params.id) }
    });
  });
  
  app.post(`/api/${resource}/bulk_delete`, (req, res) => {
    res.json({
      success: true,
      data: { count: req.body.ids?.length || 0 }
    });
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'initial_stats',
    data: {
      goods: 89,
      bads: 1161,
      errors: 23,
      offline: 15,
      ipblock: 5,
      processed: 1250,
      rps: 42,
      avg_rps: 38,
      peak_rps: 65,
      threads: 100,
      uptime: 1800,
      success_rate: 7.12
    },
    timestamp: Date.now()
  }));
  
  ws.send(JSON.stringify({
    type: 'server_info',
    data: [
      { 
        ip: '192.168.1.100', 
        status: 'online', 
        uptime: '2h 15m',
        cpu: 45,
        memory: 67,
        disk: 32,
        speed: '42/s',
        processed: 450,
        goods: 32,
        bads: 398,
        errors: 20,
        progress: 65,
        current_task: 'Scanning Fortinet VPN'
      },
      { 
        ip: '10.0.0.50', 
        status: 'online', 
        uptime: '1h 30m',
        cpu: 38,
        memory: 52,
        disk: 45,
        speed: '38/s',
        processed: 350,
        goods: 25,
        bads: 310,
        errors: 15,
        progress: 42,
        current_task: 'Scanning GlobalProtect VPN'
      },
      { 
        ip: '172.16.0.25', 
        status: 'online', 
        uptime: '3h 10m',
        cpu: 62,
        memory: 78,
        disk: 55,
        speed: '45/s',
        processed: 650,
        goods: 42,
        bads: 580,
        errors: 28,
        progress: 78,
        current_task: 'Scanning SonicWall VPN'
      }
    ],
    timestamp: Date.now()
  }));
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stats_update',
        data: {
          goods: Math.floor(Math.random() * 100) + 50,
          bads: Math.floor(Math.random() * 1200) + 800,
          errors: Math.floor(Math.random() * 30) + 10,
          offline: Math.floor(Math.random() * 20) + 5,
          ipblock: Math.floor(Math.random() * 10) + 1,
          processed: Math.floor(Math.random() * 2000) + 1000,
          rps: Math.floor(Math.random() * 50) + 30,
          avg_rps: Math.floor(Math.random() * 45) + 25,
          peak_rps: Math.floor(Math.random() * 30) + 60,
          threads: 100,
          uptime: Math.floor(Date.now() / 1000) % 86400,
          success_rate: (Math.random() * 10).toFixed(2)
        },
        timestamp: Date.now()
      }));
    }
  }, 5000);
  
  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);
      
      // Handle different message types
      if (data.type === 'start_scanner') {
        const vpnType = typeof data.data === 'string' ? data.data : data.data.vpn_type;
        ws.send(JSON.stringify({
          type: 'scanner_started',
          data: { status: 'success', scanner: vpnType },
          timestamp: Date.now()
        }));
      } else if (data.type === 'stop_scanner') {
        const vpnType = typeof data.data === 'string' ? data.data : data.data.vpn_type;
        ws.send(JSON.stringify({
          type: 'scanner_stopped',
          data: { status: 'success', scanner: vpnType },
          timestamp: Date.now()
        }));
      } else if (data.type === 'get_logs') {
        const limit = data.data?.limit || 100;
        const logs = Array.from({ length: limit }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)],
          message: `Log message ${i + 1}`,
          source: ['system', 'scanner', 'database'][Math.floor(Math.random() * 3)]
        }));
        ws.send(JSON.stringify({
          type: 'logs_data',
          data: logs,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock API server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mock API server...');
  server.close(() => {
    process.exit(0);
  });
});