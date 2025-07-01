import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ServerInfo } from '../../types';
import toast from 'react-hot-toast';

interface ServersState {
  servers: ServerInfo[];
  selectedServers: string[];
  loading: boolean;
  error: string | null;
  serverHistory: Record<string, {
    timestamp: number;
    cpu: number;
    memory: number;
    rps: number;
  }[]>;
}

const initialState: ServersState = {
  servers: [],
  selectedServers: [],
  loading: false,
  error: null,
  serverHistory: {},
};

export const fetchServers = createAsyncThunk(
  'servers/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/servers');
      if (!response.ok) {
        throw new Error('Failed to fetch servers');
      }
      const data = await response.json();
      return data.data as ServerInfo[];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deployToServers = createAsyncThunk(
  'servers/deploy',
  async (serverIds: string[], { rejectWithValue }) => {
    try {
      // В реальном приложении здесь был бы API запрос
      // Для демонстрации просто возвращаем список серверов
      toast.success(`Deploying to ${serverIds.length} servers`);
      return serverIds;
    } catch (error: any) {
      toast.error(`Deployment failed: ${error.message}`);
      return rejectWithValue(error.message);
    }
  }
);

const serversSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    setServers: (state, action: PayloadAction<ServerInfo[]>) => {
      state.servers = action.payload;
      
      // Обновляем историю для каждого сервера
      action.payload.forEach(server => {
        if (!state.serverHistory[server.ip]) {
          state.serverHistory[server.ip] = [];
        }
        
        const now = Date.now();
        const lastPoint = state.serverHistory[server.ip][state.serverHistory[server.ip].length - 1];
        
        // Добавляем точку каждые 30 секунд
        if (!lastPoint || now - lastPoint.timestamp > 30000) {
          state.serverHistory[server.ip].push({
            timestamp: now,
            cpu: server.cpu,
            memory: server.memory,
            rps: parseInt(server.speed) || 0,
          });
          
          // Ограничиваем историю 100 точками
          if (state.serverHistory[server.ip].length > 100) {
            state.serverHistory[server.ip].shift();
          }
        }
      });
    },
    selectServer: (state, action: PayloadAction<string>) => {
      if (!state.selectedServers.includes(action.payload)) {
        state.selectedServers.push(action.payload);
      }
    },
    deselectServer: (state, action: PayloadAction<string>) => {
      state.selectedServers = state.selectedServers.filter(id => id !== action.payload);
    },
    toggleServerSelection: (state, action: PayloadAction<string>) => {
      if (state.selectedServers.includes(action.payload)) {
        state.selectedServers = state.selectedServers.filter(id => id !== action.payload);
      } else {
        state.selectedServers.push(action.payload);
      }
    },
    clearServerSelection: (state) => {
      state.selectedServers = [];
    },
    selectAllServers: (state) => {
      state.selectedServers = state.servers.map(server => server.ip);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServers.fulfilled, (state, action) => {
        state.loading = false;
        state.servers = action.payload;
      })
      .addCase(fetchServers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deployToServers.fulfilled, (state, action) => {
        toast.success(`Deployed to ${action.payload.length} servers`);
      });
  },
});

export const {
  setServers,
  selectServer,
  deselectServer,
  toggleServerSelection,
  clearServerSelection,
  selectAllServers,
} = serversSlice.actions;

export default serversSlice.reducer;