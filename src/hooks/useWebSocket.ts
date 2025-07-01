import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store';
import { setStats, setConnected, setError } from '../store/slices/scannerSlice';
import { setServers, updateServerHistory } from '../store/slices/serversSlice';
import { StatsData, ServerInfo } from '../types';
import { getAuthToken } from '../lib/auth';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useWebSocket(url?: string) {
  const dispatch = useAppDispatch();
  const [logs, setLogs] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnecting = useRef(false);
  const reconnectBackoff = useRef(1000); // Start with 1 second

  // Determine WebSocket URL based on environment
  const getWebSocketUrl = useCallback(() => {
    if (url) return url;
    
    const host = window.location.hostname;
    const port = import.meta.env.VITE_WS_PORT || '8080';
    
    // For WebContainer/StackBlitz environments
    if (host.includes('webcontainer') || host.includes('stackblitz') || host.includes('local-credentialless')) {
      // Use the same hostname but with ws:// protocol
      return `ws://${host}/ws`;
    }
    
    // For local development
    if (host === 'localhost' || host.includes('127.0.0.1')) {
      return `ws://${host}:${port}/ws`;
    }
    
    // For production - use secure WebSocket if page is loaded over HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}:${port}/ws`;
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
      
      // Add authentication token to the connection if available
      const token = getAuthToken();
      if (token && wsRef.current.url.indexOf('?') === -1) {
        wsRef.current.url = `${wsRef.current.url}?token=${token}`;
      }
      
      wsRef.current.onopen = () => {
        dispatch(setConnected(true));
        dispatch(setError(null));
        reconnectAttempts.current = 0;
        reconnectBackoff.current = 1000; // Reset backoff on successful connection
        isConnecting.current = false;
        console.log('🔌 WebSocket connected successfully');
        
        // Show notification only on reconnection
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
        dispatch(setConnected(false));
        isConnecting.current = false;
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        
        // Don't show error on first connection attempt
        if (reconnectAttempts.current > 0) {
          dispatch(setError('Connection lost'));
        }
        
        // Auto-reconnect only if not intentionally closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          // Exponential backoff with jitter
          const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
          const delay = Math.min(reconnectBackoff.current * jitter, 30000); // Cap at 30 seconds
          
          console.log(`🔌 Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            reconnectBackoff.current *= 2; // Exponential backoff
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          dispatch(setError('Failed to connect to server. Please check if the Go server is running on port 8080.'));
        }
      };
      
      wsRef.current.onerror = (err) => {
        isConnecting.current = false;
        console.error('🔌 WebSocket error:', err);
        
        // Set error only if not first connection attempt
        if (reconnectAttempts.current > 0) {
          dispatch(setError('Connection error. Please check if the server is running.'));
        } else {
          dispatch(setError('Server not available. Make sure the Go server is running.'));
        }
      };
    } catch (err) {
      isConnecting.current = false;
      console.error('🔌 WebSocket creation error:', err);
      dispatch(setError('Failed to create WebSocket connection'));
    }
  }, [dispatch, getWebSocketUrl]);

  const handleMessage = (message: WebSocketMessage) => {
    try {
      switch (message.type) {
        case 'initial_stats':
        case 'stats_update':
          dispatch(setStats(message.data as StatsData));
          break;
          
        case 'server_info':
          const serverData = message.data as ServerInfo[];
          dispatch(setServers(serverData));
          dispatch(updateServerHistory(serverData));
          break;
          
        case 'logs_data':
          setLogs(message.data as string[]);
          break;
          
        case 'scanner_started':
          console.log('🚀 Scanner started:', message.data);
          toast.success(`Scanner started: ${message.data.vpn_type || message.data.scanner || 'Unknown'}`);
          break;
          
        case 'scanner_stopped':
          console.log('🛑 Scanner stopped:', message.data);
          toast.success(`Scanner stopped: ${message.data.vpn_type || message.data.scanner || 'Unknown'}`);
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
          
        case 'auth_required':
          console.log('🔒 Authentication required');
          // Handle authentication required
          break;
          
        case 'auth_success':
          console.log('🔓 Authentication successful');
          toast.success('WebSocket authentication successful');
          break;
          
        case 'auth_failure':
          console.error('🔒 Authentication failed:', message.data);
          toast.error('WebSocket authentication failed');
          break;
          
        default:
          console.log('📨 Unknown message type:', message.type, message.data);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  };

  useEffect(() => {
    // Small delay before first connection
    const timer = setTimeout(() => {
      connect();
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000); // Normal closure
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
    return sendMessage('get_logs', { limit: 100 });
  }, [sendMessage]);

  return {
    logs,
    sendMessage,
    startScanner,
    stopScanner,
    getLogs,
    isConnected: useAppSelector(state => state.scanner.isConnected)
  };
}