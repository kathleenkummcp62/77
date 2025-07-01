import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ServerInfo, ServerHistoryPoint } from '../../types';

interface ServersState {
  servers: ServerInfo[];
  serverHistory: Record<string, ServerHistoryPoint[]>;
  loading: boolean;
  error: string | null;
}

const initialState: ServersState = {
  servers: [],
  serverHistory: {},
  loading: false,
  error: null
};

const serversSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    setServers: (state, action: PayloadAction<ServerInfo[]>) => {
      state.servers = action.payload;
    },
    updateServer: (state, action: PayloadAction<ServerInfo>) => {
      const index = state.servers.findIndex(server => server.ip === action.payload.ip);
      if (index !== -1) {
        state.servers[index] = action.payload;
      } else {
        state.servers.push(action.payload);
      }
    },
    removeServer: (state, action: PayloadAction<string>) => {
      state.servers = state.servers.filter(server => server.ip !== action.payload);
      // Also remove from history
      delete state.serverHistory[action.payload];
    },
    updateServerHistory: (state, action: PayloadAction<ServerInfo[]>) => {
      const timestamp = Date.now();
      
      action.payload.forEach(server => {
        // Extract RPS from speed string (e.g., "1.5 req/s" -> 1.5)
        let rps = 0;
        if (server.speed && typeof server.speed === 'string') {
          const match = server.speed.match(/(\d+\.?\d*)/);
          if (match) {
            rps = parseFloat(match[1]);
          }
        }
        
        const historyPoint: ServerHistoryPoint = {
          ip: server.ip,
          cpu: server.cpu || 0,
          memory: server.memory || 0,
          rps,
          timestamp
        };
        
        // Initialize history array if it doesn't exist
        if (!state.serverHistory[server.ip]) {
          state.serverHistory[server.ip] = [];
        }
        
        // Add new point and limit to last 100 points
        state.serverHistory[server.ip].push(historyPoint);
        if (state.serverHistory[server.ip].length > 100) {
          state.serverHistory[server.ip] = state.serverHistory[server.ip].slice(-100);
        }
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const { setServers, updateServer, removeServer, updateServerHistory, setLoading, setError } = serversSlice.actions;

export default serversSlice.reducer;