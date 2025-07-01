import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

export interface Attachment {
  name: string;
  size: number;
  type: string;
  lastModified: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  vpnType: string;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  targets: string[];
  workers: string[];
  status: 'pending' | 'running' | 'completed' | 'error';
  createdAt: string;
  attachments: Attachment[];
}

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  tasks: [
    {
      id: '1',
      name: 'Fortinet Scan',
      description: 'Scan Fortinet VPN servers for vulnerabilities',
      vpnType: 'fortinet',
      priority: 'high',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targets: [
        'https://200.113.15.26:4443;guest;guest',
        'https://195.150.192.5:443;guest;guest'
      ],
      workers: ['194.0.234.203', '77.90.185.26'],
      status: 'pending',
      createdAt: new Date().toISOString(),
      attachments: []
    }
  ],
  loading: false,
  error: null
};

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_, { rejectWithValue }) => {
    try {
      // In a real app, this would be an API call
      // For now, we'll just return the initial state
      return initialState.tasks;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const runTask = createAsyncThunk(
  'tasks/runTask',
  async (id: string, { getState, dispatch, rejectWithValue }) => {
    try {
      // Get the task
      const state = getState() as { tasks: TasksState };
      const task = state.tasks.tasks.find(t => t.id === id);
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      // Update task status to running
      dispatch(updateTaskStatus({ id, status: 'running' }));
      
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update task status to completed
      dispatch(updateTaskStatus({ id, status: 'completed' }));
      
      return id;
    } catch (error: any) {
      // Update task status to error
      dispatch(updateTaskStatus({ id, status: 'error' }));
      return rejectWithValue(error.message);
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
    },
    updateTaskStatus: (state, action: PayloadAction<{ id: string; status: Task['status'] }>) => {
      const task = state.tasks.find(task => task.id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Run task
      .addCase(runTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runTask.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(runTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { addTask, updateTask, deleteTask, updateTaskStatus } = tasksSlice.actions;

export default tasksSlice.reducer;