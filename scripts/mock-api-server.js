#!/usr/bin/env node

/**
 * Mock API server for VPN Bruteforce Dashboard
 * Provides mock endpoints when Go backend is not available
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

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
  goods: 45,
  bads: 1205,
  errors: 32,
  offline: 18,
  ipblock: 5,
  processed: 1305,
  rps: 250,
  avg_rps: 220,
  peak_rps: 300,
  threads: 150,
  uptime: 3600, // 1 hour in seconds
  success_rate: 3.45
};

let mockServers = [
  {
    ip: '194.0.234.203',
    status: 'online',
    uptime: '2h 15m',
    cpu: 45,
    memory: 32,
    disk: 58,
    speed: '250/s',
    processed: 450,
    goods: 15,
    bads: 420,
    errors: 15,
    progress: 78,
    current_task: 'Scanning Fortinet VPNs'
  },
  {
    ip: '77.90.185.26',
    status: 'online',
    uptime: '1h 45m',
    cpu: 38,
    memory: 28,
    disk: 42,
    speed: '220/s',
    processed: 380,
    goods: 12,
    bads: 350,
    errors: 18,
    progress: 65,
    current_task: 'Scanning GlobalProtect VPNs'
  },
  {
    ip: '185.93.89.206',
    status: 'online',
    uptime: '3h 10m',
    cpu: 52,
    memory: 45,
    disk: 63,
    speed: '280/s',
    processed: 520,
    goods: 18,
    bads: 480,
    errors: 22,
    progress: 42,
    current_task: 'Scanning SonicWall VPNs'
  },
  {
    ip: '185.93.89.35',
    status: 'online',
    uptime: '4h 25m',
    cpu: 48,
    memory: 36,
    disk: 51,
    speed: '240/s',
    processed: 480,
    goods: 14,
    bads: 450,
    errors: 16,
    progress: 91,
    current_task: 'Scanning Cisco VPNs'
  }
];

let mockLogs = [
  { id: 1, timestamp: new Date().toISOString(), level: 'info', message: 'Mock server started', component: 'api' },
  { id: 2, timestamp: new Date().toISOString(), level: 'success', message: 'Valid credentials found: guest:guest', component: 'scanner' },
  { id: 3, timestamp: new Date().toISOString(), level: 'warning', message: 'High memory usage detected', component: 'system' }
];

let mockResults = [
  { id: 1, ip: '200.113.15.26:4443', username: 'guest', password: 'guest', vpnType: 'fortinet', timestamp: new Date().toISOString() },
  { id: 2, ip: '216.229.124.44:443', username: 'test', password: 'test', vpnType: 'paloalto', timestamp: new Date().toISOString() }
];

// API Routes
app.get('/api/stats', (req, res) => {
  // Update mock stats with some variation
  mockStats.totalScanned = mockStats.processed;
  mockStats.validCredentials = mockStats.goods;
  mockStats.activeThreads = mockStats.threads;
  mockStats.scanRate = mockStats.rps;
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

app.get('/api/servers', (req, res) => {
  res.json({
    success: true,
    data: mockServers
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
  mockStats.goods++;
  mockStats.processed++;
  
  res.json({
    success: true,
    data: newResult
  });
});

// Add health endpoint for wait-on utility
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'mock-api',
    version: '1.0.0'
  });
});

// CRUD endpoints for database tables
const tables = {
  vendor_urls: [],
  credentials: [],
  proxies: [],
  tasks: []
};

// Generic CRUD handlers
function createCrudEndpoints(tableName) {
  // GET all
  app.get(`/api/${tableName}`, (req, res) => {
    res.json({
      success: true,
      data: tables[tableName]
    });
  });

  // POST new
  app.post(`/api/${tableName}`, (req, res) => {
    const newItem = {
      id: tables[tableName].length + 1,
      ...req.body
    };
    tables[tableName].push(newItem);
    res.json({
      success: true,
      data: newItem
    });
  });

  // PUT update
  app.put(`/api/${tableName}/:id`, (req, res) => {
    const id = parseInt(req.params.id);
    const index = tables[tableName].findIndex(item => item.id === id);
    
    if (index !== -1) {
      tables[tableName][index] = {
        ...tables[tableName][index],
        ...req.body,
        id // Ensure ID doesn't change
      };
      res.json({
        success: true,
        data: tables[tableName][index]
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
  });

  // DELETE
  app.delete(`/api/${tableName}/:id`, (req, res) => {
    const id = parseInt(req.params.id);
    const index = tables[tableName].findIndex(item => item.id === id);
    
    if (index !== -1) {
      tables[tableName].splice(index, 1);
      res.json({
        success: true
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
  });

  // Bulk delete
  app.post(`/api/${tableName}/bulk_delete`, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }
    
    tables[tableName] = tables[tableName].filter(item => !ids.includes(item.id));
    res.json({
      success: true
    });
  });
}

// Create CRUD endpoints for all tables
Object.keys(tables).forEach(createCrudEndpoints);

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send initial data
  ws.send(JSON.stringify({ 
    type: 'initial_stats', 
    data: mockStats,
    timestamp: Date.now()
  }));
  
  ws.send(JSON.stringify({
    type: 'server_info',
    data: mockServers,
    timestamp: Date.now()
  }));
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      // Update stats
      mockStats.processed += Math.floor(Math.random() * 5);
      mockStats.goods += Math.floor(Math.random() * 2);
      mockStats.bads += Math.floor(Math.random() * 3);
      mockStats.rps = 200 + Math.floor(Math.random() * 100);
      mockStats.uptime += 1;
      mockStats.success_rate = (mockStats.goods / mockStats.processed) * 100;
      
      // Update servers
      mockServers = mockServers.map(server => ({
        ...server,
        cpu: Math.min(95, server.cpu + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 5)),
        memory: Math.min(95, server.memory + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)),
        processed: server.processed + Math.floor(Math.random() * 10),
        goods: server.goods + Math.floor(Math.random() * 2),
        progress: Math.min(100, server.progress + Math.floor(Math.random() * 2))
      }));
      
      ws.send(JSON.stringify({ 
        type: 'stats_update', 
        data: mockStats,
        timestamp: Date.now()
      }));
      
      ws.send(JSON.stringify({
        type: 'server_info',
        data: mockServers,
        timestamp: Date.now()
      }));
      
      // Occasionally send a new log
      if (Math.random() < 0.3) {
        const newLog = {
          id: mockLogs.length + 1,
          timestamp: new Date().toISOString(),
          level: ['info', 'warning', 'success'][Math.floor(Math.random() * 3)],
          message: `Event ${Date.now()}`,
          component: 'scanner'
        };
        mockLogs.push(newLog);
        ws.send(JSON.stringify({ type: 'log', data: newLog }));
      }
    }
  }, 2000);
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      // Handle different message types
      if (data.type === 'start_scanner') {
        const vpnType = typeof data.data === 'string' ? data.data : data.data.vpn_type;
        console.log(`Starting scanner: ${vpnType}`);
        
        // Send response
        ws.send(JSON.stringify({
          type: 'scanner_started',
          data: {
            status: 'success',
            scanner: vpnType
          },
          timestamp: Date.now()
        }));
      }
      
      if (data.type === 'stop_scanner') {
        const vpnType = typeof data.data === 'string' ? data.data : data.data.vpn_type;
        console.log(`Stopping scanner: ${vpnType}`);
        
        // Send response
        ws.send(JSON.stringify({
          type: 'scanner_stopped',
          data: {
            status: 'success',
            scanner: vpnType
          },
          timestamp: Date.now()
        }));
      }
      
      if (data.type === 'get_logs') {
        const limit = data.data?.limit || 100;
        
        // Send logs
        ws.send(JSON.stringify({
          type: 'logs_data',
          data: mockLogs.slice(-limit),
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