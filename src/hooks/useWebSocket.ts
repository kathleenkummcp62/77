import { useState, useEffect, useRef } from 'react';

export function useWebSocket<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = (err) => {
        setError('WebSocket connection error');
        setIsConnected(false);
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
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
  }, [url]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { data, isConnected, error, sendMessage };
}