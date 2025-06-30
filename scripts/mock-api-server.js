import express from 'express';
import cors from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Mock database
const db = {
  credentials: [],
  tasks: [],
  proxies: [],
  vendor_urls: [],
  logs: []
};

// Load initial data
async function loadInitialData() {
  try {
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
            
            db.credentials.push({
              id: db.credentials.length + 1,
              ip,
              username,
              password
            });
          }
        }
      }
    }
    
    // Add some vendor URLs
    db.vendor_urls = [
      { id: 1, url: 'https://vpn.example.com' },
      { id: 2, url: 'https://vpn2.example.com' },
      { id: 3, url: 'https://vpn3.example.com' }
    ];
    
    // Add some tasks
    db.tasks = [
      { id: 1, vpn_type: 'fortinet', vendor_url_id: 1, server: 'server1.example.com', status: 'pending' },
      { id: 2, vpn_type: 'paloalto', vendor_url_id: 2, server: 'server2.example.com', status: 'running' }
    ];
    
    // Add some proxies
    db.proxies = [
      { id: 1, address: '192.168.1.1:8080', username: 'proxyuser', password: 'proxypass' }
    ];
    
    // Add some logs
    db.logs = [
      { id: 1, timestamp: new Date().toISOString(), level: 'info', message: 'System started', source: 'system' },
      { id: 2, timestamp: new Date().toISOString(), level: 'info', message: 'Database connected', source: 'database' }
    ];
    
    console.log('Initial data loaded');
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

// API routes
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      goods: 1247,
      bads: 8934,
      errors: 156,
      offline: 89,
      ipblock: 23,
      processed: 10449,
      rps: 2847.3,
      avg_rps: 2500.1,
      peak_rps: 3100.5,
      threads: 2500,
      uptime: 3600,
      success_rate: 12.5
    }
  });
});

app.get('/api/servers', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        ip: '194.0.234.203',
        status: 'online',
        uptime: '2h 15m',
        cpu: 45,
        memory: 67,
        disk: 32,
        speed: '2.8k/s',
        processed: 15420,
        goods: 1927,
        bads: 12893,
        errors: 600,
        progress: 78,
        current_task: 'Scanning Fortinet VPNs'
      },
      {
        ip: '77.90.185.26',
        status: 'online',
        uptime: '1h 45m',
        cpu: 52,
        memory: 71,
        disk: 28,
        speed: '3.1k/s',
        processed: 18950,
        goods: 2156,
        bads: 15794,
        errors: 1000,
        progress: 65,
        current_task: 'Scanning GlobalProtect VPNs'
      },
      {
        ip: '185.93.89.206',
        status: 'online',
        uptime: '3h 12m',
        cpu: 38,
        memory: 55,
        disk: 41,
        speed: '2.5k/s',
        processed: 12340,
        goods: 1876,
        bads: 9864,
        errors: 600,
        progress: 42,
        current_task: 'Scanning SonicWall VPNs'
      },
      {
        ip: '185.93.89.35',
        status: 'online',
        uptime: '4h 28m',
        cpu: 62,
        memory: 83,
        disk: 45,
        speed: '2.9k/s',
        processed: 21780,
        goods: 1482,
        bads: 19298,
        errors: 1000,
        progress: 91,
        current_task: 'Scanning Cisco VPNs'
      }
    ]
  });
});

// CRUD routes for vendor_urls
app.get('/api/vendor_urls', (req, res) => {
  res.json({ success: true, data: db.vendor_urls });
});

app.post('/api/vendor_urls', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }
  
  const newItem = { id: db.vendor_urls.length + 1, url };
  db.vendor_urls.push(newItem);
  res.json({ success: true, data: newItem });
});

app.put('/api/vendor_urls/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { url } = req.body;
  
  const index = db.vendor_urls.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.vendor_urls[index] = { ...db.vendor_urls[index], url };
  res.json({ success: true });
});

app.delete('/api/vendor_urls/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  const index = db.vendor_urls.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.vendor_urls.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/vendor_urls/bulk_delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, error: 'Invalid IDs' });
  }
  
  db.vendor_urls = db.vendor_urls.filter(item => !ids.includes(item.id));
  res.json({ success: true });
});

// CRUD routes for credentials
app.get('/api/credentials', (req, res) => {
  res.json({ success: true, data: db.credentials });
});

app.post('/api/credentials', (req, res) => {
  const { ip, username, password } = req.body;
  if (!ip || !username) {
    return res.status(400).json({ success: false, error: 'IP and username are required' });
  }
  
  const newItem = { id: db.credentials.length + 1, ip, username, password: password || '' };
  db.credentials.push(newItem);
  res.json({ success: true, data: newItem });
});

app.put('/api/credentials/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { ip, username, password } = req.body;
  
  const index = db.credentials.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.credentials[index] = { 
    ...db.credentials[index], 
    ip: ip || db.credentials[index].ip,
    username: username || db.credentials[index].username,
    password: password !== undefined ? password : db.credentials[index].password
  };
  
  res.json({ success: true });
});

app.delete('/api/credentials/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  const index = db.credentials.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.credentials.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/credentials/bulk_delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, error: 'Invalid IDs' });
  }
  
  db.credentials = db.credentials.filter(item => !ids.includes(item.id));
  res.json({ success: true });
});

// CRUD routes for proxies
app.get('/api/proxies', (req, res) => {
  res.json({ success: true, data: db.proxies });
});

app.post('/api/proxies', (req, res) => {
  const { address, username, password } = req.body;
  if (!address) {
    return res.status(400).json({ success: false, error: 'Address is required' });
  }
  
  const newItem = { id: db.proxies.length + 1, address, username, password };
  db.proxies.push(newItem);
  res.json({ success: true, data: newItem });
});

app.put('/api/proxies/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { address, username, password } = req.body;
  
  const index = db.proxies.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.proxies[index] = { 
    ...db.proxies[index], 
    address: address || db.proxies[index].address,
    username: username !== undefined ? username : db.proxies[index].username,
    password: password !== undefined ? password : db.proxies[index].password
  };
  
  res.json({ success: true });
});

app.delete('/api/proxies/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  const index = db.proxies.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.proxies.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/proxies/bulk_delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, error: 'Invalid IDs' });
  }
  
  db.proxies = db.proxies.filter(item => !ids.includes(item.id));
  res.json({ success: true });
});

// CRUD routes for tasks
app.get('/api/tasks', (req, res) => {
  res.json({ success: true, data: db.tasks });
});

app.post('/api/tasks', (req, res) => {
  const { vpn_type, vendor_url_id, server, status } = req.body;
  if (!vpn_type) {
    return res.status(400).json({ success: false, error: 'VPN type is required' });
  }
  
  const newItem = { 
    id: db.tasks.length + 1, 
    vpn_type, 
    vendor_url_id: vendor_url_id || null,
    server: server || '',
    status: status || 'pending'
  };
  
  db.tasks.push(newItem);
  res.json({ success: true, data: newItem });
});

app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { vpn_type, vendor_url_id, server, status } = req.body;
  
  const index = db.tasks.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.tasks[index] = { 
    ...db.tasks[index], 
    vpn_type: vpn_type || db.tasks[index].vpn_type,
    vendor_url_id: vendor_url_id !== undefined ? vendor_url_id : db.tasks[index].vendor_url_id,
    server: server !== undefined ? server : db.tasks[index].server,
    status: status !== undefined ? status : db.tasks[index].status
  };
  
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  const index = db.tasks.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  db.tasks.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/tasks/bulk_delete', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, error: 'Invalid IDs' });
  }
  
  db.tasks = db.tasks.filter(item => !ids.includes(item.id));
  res.json({ success: true });
});

// Logs endpoint
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ success: true, data: db.logs.slice(0, limit) });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      input_file: 'credentials.txt',
      output_file: 'valid.txt',
      vpn_type: 'fortinet',
      threads: 3000,
      timeout: 3,
      max_retries: 3,
      rate_limit: 8000,
      verbose: false,
      max_idle_conns: 500,
      max_conns_per_host: 200,
      idle_conn_timeout: 15,
      tls_handshake_timeout: 3,
      auto_scale: true,
      min_threads: 1000,
      max_threads: 5000,
      scale_threshold: 0.8,
      retry_delay: 100,
      backoff_factor: 1.5,
      max_backoff: 5,
      buffer_size: 8192,
      pool_size: 1000,
      streaming_mode: true,
      proxy_enabled: false,
      proxy_type: 'socks5',
      proxy_rotation: true,
      proxy_list: []
    }
  });
});

app.post('/api/config', (req, res) => {
  res.json({ success: true, data: { status: 'updated' } });
});

// Scanner control endpoints
app.post('/api/start', (req, res) => {
  const { vpn_type } = req.body;
  if (!vpn_type) {
    return res.status(400).json({ success: false, error: 'vpn_type required' });
  }
  
  res.json({
    success: true,
    data: {
      status: 'started',
      vpn_type
    }
  });
});

app.post('/api/stop', (req, res) => {
  const { vpn_type } = req.body;
  if (!vpn_type) {
    return res.status(400).json({ success: false, error: 'vpn_type required' });
  }
  
  res.json({
    success: true,
    data: {
      status: 'stopped',
      vpn_type
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connections
const clients = new Set();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WebSocket client connected');
  
  // Send initial data
  sendInitialData(ws);
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

// Send initial data to a client
function sendInitialData(ws) {
  // Send initial stats
  ws.send(JSON.stringify({
    type: 'initial_stats',
    data: {
      goods: 1247,
      bads: 8934,
      errors: 156,
      offline: 89,
      ipblock: 23,
      processed: 10449,
      rps: 2847.3,
      avg_rps: 2500.1,
      peak_rps: 3100.5,
      threads: 2500,
      uptime: 3600,
      success_rate: 12.5
    },
    timestamp: Date.now()
  }));
  
  // Send server info
  ws.send(JSON.stringify({
    type: 'server_info',
    data: [
      {
        ip: '194.0.234.203',
        status: 'online',
        uptime: '2h 15m',
        cpu: 45,
        memory: 67,
        disk: 32,
        speed: '2.8k/s',
        processed: 15420,
        goods: 1927,
        bads: 12893,
        errors: 600,
        progress: 78,
        current_task: 'Scanning Fortinet VPNs'
      },
      {
        ip: '77.90.185.26',
        status: 'online',
        uptime: '1h 45m',
        cpu: 52,
        memory: 71,
        disk: 28,
        speed: '3.1k/s',
        processed: 18950,
        goods: 2156,
        bads: 15794,
        errors: 1000,
        progress: 65,
        current_task: 'Scanning GlobalProtect VPNs'
      },
      {
        ip: '185.93.89.206',
        status: 'online',
        uptime: '3h 12m',
        cpu: 38,
        memory: 55,
        disk: 41,
        speed: '2.5k/s',
        processed: 12340,
        goods: 1876,
        bads: 9864,
        errors: 600,
        progress: 42,
        current_task: 'Scanning SonicWall VPNs'
      },
      {
        ip: '185.93.89.35',
        status: 'online',
        uptime: '4h 28m',
        cpu: 62,
        memory: 83,
        disk: 45,
        speed: '2.9k/s',
        processed: 21780,
        goods: 1482,
        bads: 19298,
        errors: 1000,
        progress: 91,
        current_task: 'Scanning Cisco VPNs'
      }
    ],
    timestamp: Date.now()
  }));
}

// Handle WebSocket messages
function handleWebSocketMessage(ws, message) {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'start_scanner':
      // Handle start scanner command
      const vpnType = typeof message.data === 'string' ? message.data : message.data.vpn_type;
      
      // Send response
      ws.send(JSON.stringify({
        type: 'scanner_started',
        data: {
          status: 'success',
          scanner: vpnType
        },
        timestamp: Date.now()
      }));
      
      // Broadcast to all clients
      broadcastMessage({
        type: 'scanner_command',
        data: {
          action: 'start',
          vpn_type: vpnType,
          status: 'starting'
        },
        timestamp: Date.now()
      });
      break;
      
    case 'stop_scanner':
      // Handle stop scanner command
      const stopVpnType = typeof message.data === 'string' ? message.data : message.data.vpn_type;
      
      // Send response
      ws.send(JSON.stringify({
        type: 'scanner_stopped',
        data: {
          status: 'success',
          scanner: stopVpnType
        },
        timestamp: Date.now()
      }));
      
      // Broadcast to all clients
      broadcastMessage({
        type: 'scanner_command',
        data: {
          action: 'stop',
          vpn_type: stopVpnType,
          status: 'stopping'
        },
        timestamp: Date.now()
      });
      break;
      
    case 'get_logs':
      // Handle get logs command
      const limit = message.data?.limit || 100;
      
      // Send logs
      ws.send(JSON.stringify({
        type: 'logs_data',
        data: db.logs.slice(0, limit),
        timestamp: Date.now()
      }));
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

// Broadcast a message to all clients
function broadcastMessage(message) {
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(message));
    }
  }
}

// Start sending stats updates
function startStatsUpdates() {
  let goods = 1247;
  let bads = 8934;
  let errors = 156;
  let offline = 89;
  let ipblock = 23;
  let processed = 10449;
  let rps = 2847.3;
  let uptime = 3600;
  
  setInterval(() => {
    // Update stats
    goods += Math.floor(Math.random() * 10);
    bads += Math.floor(Math.random() * 50);
    errors += Math.floor(Math.random() * 3);
    offline += Math.floor(Math.random() * 2);
    ipblock += Math.random() > 0.8 ? 1 : 0;
    processed = goods + bads + errors + offline + ipblock;
    rps = 2500 + Math.random() * 1000;
    uptime += 1;
    
    const statsData = {
      goods,
      bads,
      errors,
      offline,
      ipblock,
      processed,
      rps,
      avg_rps: 2500 + Math.random() * 500,
      peak_rps: 3500,
      threads: 2500,
      uptime,
      success_rate: (goods / processed) * 100
    };
    
    // Broadcast stats update
    broadcastMessage({
      type: 'stats_update',
      data: statsData,
      timestamp: Date.now()
    });
  }, 1000);
}

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  
  // Load initial data
  loadInitialData();
  
  // Start sending stats updates
  startStatsUpdates();
});