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

export function useWebSocket(url?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Уменьшили количество попыток
  const isConnecting = useRef(false);

  // Определяем URL для WebSocket
  const getWebSocketUrl = useCallback(() => {
    if (url) return url;
    
    // Пробуем разные варианты URL
    const currentHost = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Для локальной разработки
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'ws://localhost:8080/ws';
    }
    
    // Для WebContainer (StackBlitz)
    if (currentHost.includes('webcontainer-api.io')) {
      const baseUrl = currentHost.replace(/:\d+/, '');
      return `${protocol}//${baseUrl}:8080/ws`;
    }
    
    // Fallback
    return `${protocol}//${currentHost.replace(/:\d+/, '')}:8080/ws`;
  }, [url]);

  const connect = useCallback(() => {
    if (isConnecting.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log('🔌 Attempting WebSocket connection to:', wsUrl);
    
    try {
      isConnecting.current = true;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        isConnecting.current = false;
        console.log('🔌 WebSocket connected successfully');
        
        // Показываем уведомление только при переподключении
        if (reconnectAttempts.current > 0) {
          toast.success('Reconnected to server');
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        isConnecting.current = false;
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        
        // Не показываем ошибку при первом подключении
        if (reconnectAttempts.current > 0) {
          setError('Connection lost');
        }
        
        // Auto-reconnect только если это не намеренное закрытие
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 10000);
          console.log(`🔌 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Failed to connect to server. Please check if the Go server is running on port 8080.');
        }
      };
      
      wsRef.current.onerror = (err) => {
        isConnecting.current = false;
        console.error('🔌 WebSocket error:', err);
        
        // Устанавливаем ошибку только если это не первая попытка подключения
        if (reconnectAttempts.current === 0) {
          setError('Server not available. Make sure the Go server is running.');
        }
      };
    } catch (err) {
      isConnecting.current = false;
      console.error('🔌 WebSocket creation error:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [getWebSocketUrl]);

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
          toast.success(`Scanner started: ${message.data.vpn_type || 'Unknown'}`);
          break;
          
        case 'scanner_stopped':
          console.log('🛑 Scanner stopped:', message.data);
          toast.success(`Scanner stopped: ${message.data.vpn_type || 'Unknown'}`);
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
    }
  };

  useEffect(() => {
    // Небольшая задержка перед первым подключением
    const timer = setTimeout(() => {
      connect();
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000); // Нормальное закрытие
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
        return true;
      } catch (err) {
        console.error('Failed to send message:', err);
        toast.error('Failed to send command to server');
        return false;
      }
    } else {
      console.warn('🔌 WebSocket not connected, cannot send message');
      toast.error('Not connected to server');
      return false;
    }
  }, []);

  const startScanner = useCallback((vpnType: string) => {
    return sendMessage('start_scanner', { vpn_type: vpnType });
  }, [sendMessage]);

  const stopScanner = useCallback((vpnType: string) => {
    return sendMessage('stop_scanner', { vpn_type: vpnType });
  }, [sendMessage]);

  const getLogs = useCallback(() => {
    return sendMessage('get_logs', {});
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