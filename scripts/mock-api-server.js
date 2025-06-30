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
    totalScans: 1250,
    successfulConnections: 89,
    failedAttempts: 1161,
    activeWorkers: 4,
    uptime: '2h 15m'
  });
});

app.get('/api/servers', (req, res) => {
  res.json([
    { id: 1, ip: '192.168.1.100', status: 'active', type: 'cisco', lastSeen: '2024-01-15T10:30:00Z' },
    { id: 2, ip: '10.0.0.50', status: 'inactive', type: 'fortinet', lastSeen: '2024-01-15T09:45:00Z' },
    { id: 3, ip: '172.16.0.25', status: 'active', type: 'paloalto', lastSeen: '2024-01-15T10:28:00Z' }
  ]);
});

app.get('/api/results', (req, res) => {
  res.json([
    { id: 1, ip: '192.168.1.100', username: 'admin', password: 'password123', vpnType: 'cisco', timestamp: '2024-01-15T10:30:00Z', status: 'success' },
    { id: 2, ip: '10.0.0.50', username: 'user1', password: 'test123', vpnType: 'fortinet', timestamp: '2024-01-15T10:25:00Z', status: 'success' }
  ]);
});

app.post('/api/tasks', (req, res) => {
  const task = {
    id: Date.now(),
    ...req.body,
    status: 'queued',
    createdAt: new Date().toISOString()
  };
  res.status(201).json(task);
});

app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, name: 'Cisco VPN Scan', status: 'running', progress: 65, createdAt: '2024-01-15T10:00:00Z' },
    { id: 2, name: 'Fortinet Scan', status: 'completed', progress: 100, createdAt: '2024-01-15T09:30:00Z' }
  ]);
});

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stats_update',
        data: {
          totalScans: Math.floor(Math.random() * 2000) + 1000,
          successfulConnections: Math.floor(Math.random() * 100) + 50,
          activeWorkers: Math.floor(Math.random() * 8) + 2,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }, 5000);
  
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