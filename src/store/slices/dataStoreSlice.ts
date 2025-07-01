import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CredentialPair, ProxySetting, Task, VendorURL } from '../../types';
import toast from 'react-hot-toast';
import { authFetch } from '../../lib/auth';

interface DataStorePagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

interface DataStoreState {
  credentials: CredentialPair[];
  proxies: ProxySetting[];
  tasks: Task[];
  vendorUrls: VendorURL[];
  selectedCredentials: number[];
  selectedProxies: number[];
  selectedTasks: number[];
  selectedVendorUrls: number[];
  loading: boolean;
  error: string | null;
  pagination: DataStorePagination;
}

const initialState: DataStoreState = {
  credentials: [],
  proxies: [],
  tasks: [],
  vendorUrls: [],
  selectedCredentials: [],
  selectedProxies: [],
  selectedTasks: [],
  selectedVendorUrls: [],
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  }
};

interface FetchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: Record<string, string>;
}

export const fetchCredentials = createAsyncThunk(
  'dataStore/fetchCredentials',
  async (params: FetchParams, { rejectWithValue }) => {
    try {
      const { page = 1, pageSize = 10, search = '', filter = {} } = params;
      
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('page_size', pageSize.toString());
      
      if (search) {
        queryParams.append('search', search);
      }
      
      // Add filters
      Object.entries(filter).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
      
      const response = await authFetch(`/api/credentials?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch credentials');
      }
      
      return {
        credentials: data.data,
        pagination: data.meta
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const addCredential = createAsyncThunk(
  'dataStore/addCredential',
  async (credential: { ip: string; username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authFetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credential)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add credential');
      }
      
      return data.data as CredentialPair;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCredential = createAsyncThunk(
  'dataStore/updateCredential',
  async (credential: CredentialPair, { rejectWithValue }) => {
    try {
      const response = await authFetch(`/api/credentials/${credential.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ip: credential.ip,
          username: credential.username,
          password: credential.password
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update credential');
      }
      
      return credential;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCredential = createAsyncThunk(
  'dataStore/deleteCredential',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await authFetch(`/api/credentials/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete credential');
      }
      
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const bulkDeleteCredentials = createAsyncThunk(
  'dataStore/bulkDeleteCredentials',
  async (ids: number[], { rejectWithValue }) => {
    try {
      const response = await authFetch('/api/credentials/bulk_delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete credentials');
      }
      
      return ids;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const dataStoreSlice = createSlice({
  name: 'dataStore',
  initialState,
  reducers: {
    selectCredential: (state, action: PayloadAction<number>) => {
      if (!state.selectedCredentials.includes(action.payload)) {
        state.selectedCredentials.push(action.payload);
      }
    },
    deselectCredential: (state, action: PayloadAction<number>) => {
      state.selectedCredentials = state.selectedCredentials.filter(id => id !== action.payload);
    },
    selectAllCredentials: (state) => {
      state.selectedCredentials = state.credentials.map(cred => cred.id);
    },
    clearCredentialSelection: (state) => {
      state.selectedCredentials = [];
    },
    selectProxy: (state, action: PayloadAction<number>) => {
      if (!state.selectedProxies.includes(action.payload)) {
        state.selectedProxies.push(action.payload);
      }
    },
    deselectProxy: (state, action: PayloadAction<number>) => {
      state.selectedProxies = state.selectedProxies.filter(id => id !== action.payload);
    },
    selectAllProxies: (state) => {
      state.selectedProxies = state.proxies.map(proxy => proxy.id);
    },
    clearProxySelection: (state) => {
      state.selectedProxies = [];
    },
    selectTask: (state, action: PayloadAction<number>) => {
      if (!state.selectedTasks.includes(action.payload)) {
        state.selectedTasks.push(action.payload);
      }
    },
    deselectTask: (state, action: PayloadAction<number>) => {
      state.selectedTasks = state.selectedTasks.filter(id => id !== action.payload);
    },
    selectAllTasks: (state) => {
      state.selectedTasks = state.tasks.map(task => task.id!);
    },
    clearTaskSelection: (state) => {
      state.selectedTasks = [];
    },
    selectVendorUrl: (state, action: PayloadAction<number>) => {
      if (!state.selectedVendorUrls.includes(action.payload)) {
        state.selectedVendorUrls.push(action.payload);
      }
    },
    deselectVendorUrl: (state, action: PayloadAction<number>) => {
      state.selectedVendorUrls = state.selectedVendorUrls.filter(id => id !== action.payload);
    },
    selectAllVendorUrls: (state) => {
      state.selectedVendorUrls = state.vendorUrls.map(url => url.id);
    },
    clearVendorUrlSelection: (state) => {
      state.selectedVendorUrls = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch credentials
      .addCase(fetchCredentials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCredentials.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = action.payload.credentials;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCredentials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add credential
      .addCase(addCredential.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCredential.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials.push(action.payload);
        state.pagination.totalItems += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
      })
      .addCase(addCredential.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update credential
      .addCase(updateCredential.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCredential.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.credentials.findIndex(cred => cred.id === action.payload.id);
        if (index !== -1) {
          state.credentials[index] = action.payload;
        }
      })
      .addCase(updateCredential.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete credential
      .addCase(deleteCredential.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCredential.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = state.credentials.filter(cred => cred.id !== action.payload);
        state.selectedCredentials = state.selectedCredentials.filter(id => id !== action.payload);
        state.pagination.totalItems -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
      })
      .addCase(deleteCredential.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Bulk delete credentials
      .addCase(bulkDeleteCredentials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkDeleteCredentials.fulfilled, (state, action) => {
        state.loading = false;
        state.credentials = state.credentials.filter(cred => !action.payload.includes(cred.id));
        state.selectedCredentials = [];
        state.pagination.totalItems -= action.payload.length;
        state.pagination.totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
      })
      .addCase(bulkDeleteCredentials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  selectCredential,
  deselectCredential,
  selectAllCredentials,
  clearCredentialSelection,
  selectProxy,
  deselectProxy,
  selectAllProxies,
  clearProxySelection,
  selectTask,
  deselectTask,
  selectAllTasks,
  clearTaskSelection,
  selectVendorUrl,
  deselectVendorUrl,
  selectAllVendorUrls,
  clearVendorUrlSelection,
} = dataStoreSlice.actions;

export default dataStoreSlice.reducer;