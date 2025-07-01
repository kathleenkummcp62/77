import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

interface ResultFile {
  id: string;
  name: string;
  type: 'valid' | 'invalid' | 'errors' | 'logs';
  server: string;
  vpnType: string;
  size: string;
  count: number;
  created: string;
  lastModified: string;
  content?: string;
}

interface ResultsState {
  files: ResultFile[];
  selectedFiles: string[];
  loading: boolean;
  error: string | null;
  statistics: {
    totalValid: number;
    totalInvalid: number;
    totalErrors: number;
    successRate: number;
    vpnTypeStats: Record<string, {
      valid: number;
      invalid: number;
      errors: number;
      successRate: number;
    }>;
    serverStats: Record<string, {
      valid: number;
      invalid: number;
      errors: number;
      successRate: number;
    }>;
    timeStats: {
      timestamp: number;
      valid: number;
      invalid: number;
    }[];
  };
}

const initialState: ResultsState = {
  files: [],
  selectedFiles: [],
  loading: false,
  error: null,
  statistics: {
    totalValid: 0,
    totalInvalid: 0,
    totalErrors: 0,
    successRate: 0,
    vpnTypeStats: {},
    serverStats: {},
    timeStats: [],
  },
};

export const fetchResults = createAsyncThunk(
  'results/fetch',
  async (_, { rejectWithValue }) => {
    try {
      // В реальном приложении здесь был бы API запрос
      // Для демонстрации возвращаем моковые данные
      const mockResults: ResultFile[] = [
        {
          id: '1',
          name: 'valid_fortinet_192.0.2.10.txt',
          type: 'valid',
          server: '192.0.2.10',
          vpnType: 'Fortinet',
          size: '2.3 MB',
          count: 1927,
          created: '2024-01-15 10:30:00',
          lastModified: '2024-01-15 12:45:00'
        },
        {
          id: '2',
          name: 'valid_globalprotect_192.0.2.11.txt',
          type: 'valid',
          server: '192.0.2.11',
          vpnType: 'GlobalProtect',
          size: '3.1 MB',
          count: 2156,
          created: '2024-01-15 09:15:00',
          lastModified: '2024-01-15 12:30:00'
        },
        {
          id: '3',
          name: 'valid_sonicwall_192.0.2.12.txt',
          type: 'valid',
          server: '192.0.2.12',
          vpnType: 'SonicWall',
          size: '1.8 MB',
          count: 1876,
          created: '2024-01-15 08:45:00',
          lastModified: '2024-01-15 11:20:00'
        },
        {
          id: '4',
          name: 'errors_cisco_192.0.2.13.txt',
          type: 'errors',
          server: '192.0.2.13',
          vpnType: 'Cisco',
          size: '856 KB',
          count: 1000,
          created: '2024-01-15 07:30:00',
          lastModified: '2024-01-15 11:45:00'
        },
        {
          id: '5',
          name: 'logs_system_192.0.2.10.txt',
          type: 'logs',
          server: '192.0.2.10',
          vpnType: 'System',
          size: '4.2 MB',
          count: 15420,
          created: '2024-01-15 06:00:00',
          lastModified: '2024-01-15 12:50:00'
        }
      ];
      
      return mockResults;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadFile = createAsyncThunk(
  'results/download',
  async (fileId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { results: ResultsState };
      const file = state.results.files.find(f => f.id === fileId);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // В реальном приложении здесь был бы API запрос
      // Для демонстрации просто возвращаем файл
      toast.success(`Downloading ${file.name}`);
      return fileId;
    } catch (error: any) {
      toast.error(`Download failed: ${error.message}`);
      return rejectWithValue(error.message);
    }
  }
);

const resultsSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {
    selectFile: (state, action: PayloadAction<string>) => {
      if (!state.selectedFiles.includes(action.payload)) {
        state.selectedFiles.push(action.payload);
      }
    },
    deselectFile: (state, action: PayloadAction<string>) => {
      state.selectedFiles = state.selectedFiles.filter(id => id !== action.payload);
    },
    toggleFileSelection: (state, action: PayloadAction<string>) => {
      if (state.selectedFiles.includes(action.payload)) {
        state.selectedFiles = state.selectedFiles.filter(id => id !== action.payload);
      } else {
        state.selectedFiles.push(action.payload);
      }
    },
    clearFileSelection: (state) => {
      state.selectedFiles = [];
    },
    selectAllFiles: (state) => {
      state.selectedFiles = state.files.map(file => file.id);
    },
    updateStatistics: (state) => {
      // Рассчитываем общую статистику
      const validFiles = state.files.filter(f => f.type === 'valid');
      const invalidFiles = state.files.filter(f => f.type === 'invalid');
      const errorFiles = state.files.filter(f => f.type === 'errors');
      
      state.statistics.totalValid = validFiles.reduce((sum, f) => sum + f.count, 0);
      state.statistics.totalInvalid = invalidFiles.reduce((sum, f) => sum + f.count, 0);
      state.statistics.totalErrors = errorFiles.reduce((sum, f) => sum + f.count, 0);
      
      const total = state.statistics.totalValid + state.statistics.totalInvalid;
      state.statistics.successRate = total > 0 ? (state.statistics.totalValid / total) * 100 : 0;
      
      // Статистика по типам VPN
      const vpnTypes = [...new Set(state.files.map(f => f.vpnType))];
      vpnTypes.forEach(vpnType => {
        const vpnValidFiles = validFiles.filter(f => f.vpnType === vpnType);
        const vpnInvalidFiles = invalidFiles.filter(f => f.vpnType === vpnType);
        const vpnErrorFiles = errorFiles.filter(f => f.vpnType === vpnType);
        
        const valid = vpnValidFiles.reduce((sum, f) => sum + f.count, 0);
        const invalid = vpnInvalidFiles.reduce((sum, f) => sum + f.count, 0);
        const errors = vpnErrorFiles.reduce((sum, f) => sum + f.count, 0);
        const total = valid + invalid;
        
        state.statistics.vpnTypeStats[vpnType] = {
          valid,
          invalid,
          errors,
          successRate: total > 0 ? (valid / total) * 100 : 0,
        };
      });
      
      // Статистика по серверам
      const servers = [...new Set(state.files.map(f => f.server))];
      servers.forEach(server => {
        const serverValidFiles = validFiles.filter(f => f.server === server);
        const serverInvalidFiles = invalidFiles.filter(f => f.server === server);
        const serverErrorFiles = errorFiles.filter(f => f.server === server);
        
        const valid = serverValidFiles.reduce((sum, f) => sum + f.count, 0);
        const invalid = serverInvalidFiles.reduce((sum, f) => sum + f.count, 0);
        const errors = serverErrorFiles.reduce((sum, f) => sum + f.count, 0);
        const total = valid + invalid;
        
        state.statistics.serverStats[server] = {
          valid,
          invalid,
          errors,
          successRate: total > 0 ? (valid / total) * 100 : 0,
        };
      });
      
      // Временная статистика (моковые данные для демонстрации)
      state.statistics.timeStats = [
        { timestamp: Date.now() - 86400000 * 7, valid: 120, invalid: 1200 },
        { timestamp: Date.now() - 86400000 * 6, valid: 240, invalid: 1800 },
        { timestamp: Date.now() - 86400000 * 5, valid: 350, invalid: 2100 },
        { timestamp: Date.now() - 86400000 * 4, valid: 480, invalid: 2400 },
        { timestamp: Date.now() - 86400000 * 3, valid: 620, invalid: 2700 },
        { timestamp: Date.now() - 86400000 * 2, valid: 780, invalid: 3000 },
        { timestamp: Date.now() - 86400000 * 1, valid: 950, invalid: 3300 },
        { timestamp: Date.now(), valid: 1100, invalid: 3600 },
      ];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResults.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload;
        state.selectedFiles = [];
      })
      .addCase(fetchResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  selectFile,
  deselectFile,
  toggleFileSelection,
  clearFileSelection,
  selectAllFiles,
  updateStatistics,
} = resultsSlice.actions;

export default resultsSlice.reducer;