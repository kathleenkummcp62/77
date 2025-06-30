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
  totalScanned: 1250,
  validCredentials: 45,
  activeThreads: 150,
  scanRate: 2500,
  uptime: Date.now() - 3600000, // 1 hour ago
  lastUpdate: new Date().toISOString(),
  goods: 45,
  bads: 1205,
  errors: 12,
  offline: 5,
  ipblock: 3,
  processed: 1250,
  rps: 25,
  avg_rps: 22,
  peak_rps: 30,
  threads: 150,
  success_rate: 3.6
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

let mockServers = [
  {
    ip: '194.0.234.203',
    status: 'online',
    uptime: '2h 15m',
    cpu: 45,
    memory: 62,
    disk: 38,
    speed: '250/s',
    processed: 15420,
    goods: 1927,
    bads: 12893,
    errors: 600,
    progress: 78,
    current_task: 'Scanning Fortinet VPN'
  },
  {
    ip: '77.90.185.26',
    status: 'online',
    uptime: '1h 45m',
    cpu: 52,
    memory: 58,
    disk: 42,
    speed: '280/s',
    processed: 18950,
    goods: 2156,
    bads: 15794,
    errors: 1000,
    progress: 65,
    current_task: 'Scanning GlobalProtect VPN'
  },
  {
    ip: '185.93.89.206',
    status: 'online',
    uptime: '3h 12m',
    cpu: 38,
    memory: 45,
    disk: 30,
    speed: '0/s',
    processed: 12340,
    goods: 1876,
    bads: 9864,
    errors: 600,
    progress: 42,
    current_task: 'Idle - Ready for tasks'
  },
  {
    ip: '185.93.89.35',
    status: 'online',
    uptime: '4h 28m',
    cpu: 25,
    memory: 32,
    disk: 45,
    speed: '0/s',
    processed: 21780,
    goods: 1482,
    bads: 19298,
    errors: 1000,
    progress: 100,
    current_task: 'Idle - Ready for tasks'
  }
];

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'mock-api',
    version: '1.0.0'
  });
});

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
  mockStats.validCredentials++;
  
  res.json({
    success: true,
    data: newResult
  });
});

// CRUD endpoints for database tables
const mockTables = {
  vendor_urls: [
    { id: 1, url: 'https://vpn1.example.com' },
    { id: 2, url: 'https://vpn2.example.com' }
  ],
  credentials: [
    { id: 1, ip: '192.168.1.1', username: 'admin', password: 'password123' },
    { id: 2, ip: '10.0.0.1', username: 'user', password: 'secret' }
  ],
  proxies: [
    { id: 1, address: '127.0.0.1:8080', username: 'proxy_user', password: 'proxy_pass' }
  ],
  tasks: [
    { id: 1, vpn_type: 'fortinet', vendor_url_id: 1, server: 'server1', status: 'running' },
    { id: 2, vpn_type: 'globalprotect', vendor_url_id: 2, server: 'server2', status: 'pending' }
  ]
};

// Generic CRUD handlers
function setupCrudEndpoints(resource) {
  // GET all
  app.get(`/api/${resource}`, (req, res) => {
    res.json({
      success: true,
      data: mockTables[resource] || []
    });
  });

  // POST new
  app.post(`/api/${resource}`, (req, res) => {
    const newItem = {
      id: (mockTables[resource]?.length || 0) + 1,
      ...req.body
    };
    
    if (!mockTables[resource]) {
      mockTables[resource] = [];
    }
    
    mockTables[resource].push(newItem);
    
    res.json({
      success: true,
      data: newItem
    });
  });

  // PUT update
  app.put(`/api/${resource}/:id`, (req, res) => {
    const id = parseInt(req.params.id);
    const index = mockTables[resource]?.findIndex(item => item.id === id) || -1;
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    mockTables[resource][index] = {
      ...mockTables[resource][index],
      ...req.body,
      id // Ensure ID doesn't change
    };
    
    res.json({
      success: true,
      data: mockTables[resource][index]
    });
  });

  // DELETE
  app.delete(`/api/${resource}/:id`, (req, res) => {
    const id = parseInt(req.params.id);
    const index = mockTables[resource]?.findIndex(item => item.id === id) || -1;
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    mockTables[resource].splice(index, 1);
    
    res.json({
      success: true
    });
  });

  // Bulk delete
  app.post(`/api/${resource}/bulk_delete`, (req, res) => {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IDs array'
      });
    }
    
    if (mockTables[resource]) {
      mockTables[resource] = mockTables[resource].filter(item => !ids.includes(item.id));
    }
    
    res.json({
      success: true
    });
  });
}

// Setup CRUD endpoints for all tables
setupCrudEndpoints('vendor_urls');
setupCrudEndpoints('credentials');
setupCrudEndpoints('proxies');
setupCrudEndpoints('tasks');

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
      mockStats.totalScanned += Math.floor(Math.random() * 5);
      mockStats.activeThreads = 100 + Math.floor(Math.random() * 100);
      mockStats.scanRate = 2000 + Math.floor(Math.random() * 1000);
      mockStats.lastUpdate = new Date().toISOString();
      mockStats.processed += Math.floor(Math.random() * 5);
      mockStats.rps = 20 + Math.floor(Math.random() * 10);
      
      ws.send(JSON.stringify({ 
        type: 'stats_update', 
        data: mockStats,
        timestamp: Date.now()
      }));
      
      // Occasionally update server stats
      if (Math.random() < 0.3) {
        mockServers.forEach(server => {
          if (server.status === 'online') {
            server.cpu = Math.min(95, server.cpu + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 5));
            server.memory = Math.min(95, server.memory + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
            server.processed += Math.floor(Math.random() * 10);
            server.goods += Math.floor(Math.random() * 2);
            server.bads += Math.floor(Math.random() * 8);
          }
        });
        
        ws.send(JSON.stringify({
          type: 'server_info',
          data: mockServers,
          timestamp: Date.now()
        }));
      }
      
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
  
  // Handle WebSocket messages from client
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      console.log('Received message:', parsedMessage.type);
      
      // Handle different message types
      switch (parsedMessage.type) {
        case 'start_scanner':
          const vpnType = typeof parsedMessage.data === 'string' 
            ? parsedMessage.data 
            : parsedMessage.data?.vpn_type || 'unknown';
          
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
          break;
          
        case 'stop_scanner':
          const stopVpnType = typeof parsedMessage.data === 'string'
            ? parsedMessage.data
            : parsedMessage.data?.vpn_type || 'unknown';
          
          console.log(`Stopping scanner: ${stopVpnType}`);
          
          // Send response
          ws.send(JSON.stringify({
            type: 'scanner_stopped',
            data: {
              status: 'success',
              scanner: stopVpnType
            },
            timestamp: Date.now()
          }));
          break;
          
        case 'get_logs':
          const limit = parsedMessage.data?.limit || 100;
          
          // Send logs
          ws.send(JSON.stringify({
            type: 'logs_data',
            data: mockLogs.slice(-limit),
            timestamp: Date.now()
          }));
          break;
          
        default:
          console.log(`Unknown message type: ${parsedMessage.type}`);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
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