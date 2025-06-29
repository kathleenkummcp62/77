import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface StatsData {
  goods: number;
  bads: number;
  errors: number;
  offline: number;
  ipblock: number;
  processed: number;
  rps: number;
  avg_rps: number;
  peak_rps: number;
  threads: number;
  uptime: number;
  success_rate: number;
}

interface ServerInfo {
  ip: string;
  status: string;
  uptime: string;
  cpu: number;
  memory: number;
  disk: number;
  speed: string;
  processed: number;
  goods: number;
  bads: number;
  errors: number;
  progress: number;
  current_task: string;
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      // Проверяем, что URL валидный
      if (!url || !url.startsWith('ws')) {
        setError('Invalid WebSocket URL');
        return;
      }

      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log('🔌 WebSocket connected');
        toast.success('Connected to server');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          toast.error('Invalid message received from server');
        }
      };
      
      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        
        // Показываем уведомление только если это не первое подключение
        if (reconnectAttempts.current > 0) {
          toast.error('Connection lost. Attempting to reconnect...');
        }
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError('Failed to reconnect after multiple attempts');
          toast.error('Connection failed. Please check server status.');
        }
      };
      
      wsRef.current.onerror = (err) => {
        setError('WebSocket connection error');
        setIsConnected(false);
        console.error('🔌 WebSocket error:', err);
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('🔌 WebSocket creation error:', err);
      toast.error('Failed to connect to server');
    }
  }, [url]);

  const handleMessage = (message: WebSocketMessage) => {
    try {
      switch (message.type) {
        case 'initial_stats':
        case 'stats_update':
          setStats(message.data as StatsData);
          break;
          
        case 'server_info':
          setServers(message.data as ServerInfo[]);
          break;
          
        case 'logs_data':
          setLogs(message.data as string[]);
          break;
          
        case 'scanner_started':
          console.log('🚀 Scanner started:', message.data);
          toast.success(`Scanner started: ${message.data.vpn_type}`);
          break;
          
        case 'scanner_stopped':
          console.log('🛑 Scanner stopped:', message.data);
          toast.success(`Scanner stopped: ${message.data.vpn_type}`);
          break;
          
        case 'scanner_command':
          console.log('📡 Scanner command:', message.data);
          break;
          
        case 'config_update':
          console.log('⚙️ Config updated:', message.data);
          toast.success('Configuration updated');
          break;
          
        case 'error':
          console.error('Server error:', message.data);
          toast.error(message.data.message || 'Server error occurred');
          break;
          
        default:
          console.log('📨 Unknown message type:', message.type, message.data);
      }
    } catch (err) {
      console.error('Error handling message:', err);
      toast.error('Error processing server message');
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const message: WebSocketMessage = {
          type,
          data,
          timestamp: Date.now()
        };
        wsRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send message:', err);
        toast.error('Failed to send command to server');
      }
    } else {
      console.warn('🔌 WebSocket not connected, cannot send message');
      toast.error('Not connected to server');
    }
  }, []);

  const startScanner = useCallback((vpnType: string) => {
    sendMessage('start_scanner', { vpn_type: vpnType });
  }, [sendMessage]);

  const stopScanner = useCallback((vpnType: string) => {
    sendMessage('stop_scanner', { vpn_type: vpnType });
  }, [sendMessage]);

  const getLogs = useCallback(() => {
    sendMessage('get_logs', {});
  }, [sendMessage]);

  return {
    isConnected,
    stats,
    servers,
    logs,
    error,
    sendMessage,
    startScanner,
    stopScanner,
    getLogs
  };
}