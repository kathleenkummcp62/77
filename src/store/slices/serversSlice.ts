import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ServerInfo } from '../../types';

interface ServersState {
  servers: ServerInfo[];
  loading: boolean;
  error: string | null;
}

const initialState: ServersState = {
  servers: [],
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
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const { setServers, updateServer, removeServer, setLoading, setError } = serversSlice.actions;

export default serversSlice.reducer;