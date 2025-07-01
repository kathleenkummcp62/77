import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { StatsData } from '../../types';
import toast from 'react-hot-toast';

interface ScannerState {
  stats: StatsData | null;
  activeScans: Record<string, boolean>;
  isConnected: boolean;
  error: string | null;
  scanHistory: {
    timestamp: number;
    stats: Partial<StatsData>;
  }[];
}

const initialState: ScannerState = {
  stats: null,
  activeScans: {},
  isConnected: false,
  error: null,
  scanHistory: [],
};

export const startScanner = createAsyncThunk(
  'scanner/start',
  async (vpnType: string, { rejectWithValue }) => {
    try {
      // В реальном приложении здесь был бы API запрос
      // Для демонстрации просто возвращаем тип VPN
      return vpnType;
    } catch (error: any) {
      toast.error(`Failed to start scanner: ${error.message}`);
      return rejectWithValue(error.message);
    }
  }
);

export const stopScanner = createAsyncThunk(
  'scanner/stop',
  async (vpnType: string, { rejectWithValue }) => {
    try {
      // В реальном приложении здесь был бы API запрос
      // Для демонстрации просто возвращаем тип VPN
      return vpnType;
    } catch (error: any) {
      toast.error(`Failed to stop scanner: ${error.message}`);
      return rejectWithValue(error.message);
    }
  }
);

const scannerSlice = createSlice({
  name: 'scanner',
  initialState,
  reducers: {
    setStats: (state, action: PayloadAction<StatsData>) => {
      state.stats = action.payload;
      
      // Добавляем точку в историю каждые 30 секунд
      const now = Date.now();
      const lastPoint = state.scanHistory[state.scanHistory.length - 1];
      
      if (!lastPoint || now - lastPoint.timestamp > 30000) {
        state.scanHistory.push({
          timestamp: now,
          stats: {
            goods: action.payload.goods,
            bads: action.payload.bads,
            errors: action.payload.errors,
            rps: action.payload.rps,
            processed: action.payload.processed,
          },
        });
        
        // Ограничиваем историю 100 точками
        if (state.scanHistory.length > 100) {
          state.scanHistory.shift();
        }
      }
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearHistory: (state) => {
      state.scanHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startScanner.fulfilled, (state, action) => {
        state.activeScans[action.payload] = true;
        toast.success(`Started ${action.payload} scanner`);
      })
      .addCase(stopScanner.fulfilled, (state, action) => {
        state.activeScans[action.payload] = false;
        toast.success(`Stopped ${action.payload} scanner`);
      });
  },
});

export const { setStats, setConnected, setError, clearHistory } = scannerSlice.actions;

export default scannerSlice.reducer;