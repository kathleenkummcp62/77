import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  taskType: 'scan' | 'collect' | 'deploy' | 'report';
  vpnType?: string;
  scheduledDateTime: string;
  repeat: 'once' | 'daily' | 'weekly' | 'monthly';
  servers: string[];
  active: boolean;
  executed: boolean;
  createdAt: string;
}

interface SchedulerState {
  scheduledTasks: ScheduledTask[];
}

// Load tasks from localStorage
const loadTasks = (): ScheduledTask[] => {
  try {
    const savedTasks = localStorage.getItem('scheduledTasks');
    if (savedTasks) {
      return JSON.parse(savedTasks);
    }
  } catch (error) {
    console.error('Failed to load scheduled tasks from localStorage:', error);
  }
  return [];
};

// Save tasks to localStorage
const saveTasks = (tasks: ScheduledTask[]) => {
  try {
    localStorage.setItem('scheduledTasks', JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save scheduled tasks to localStorage:', error);
  }
};

const initialState: SchedulerState = {
  scheduledTasks: loadTasks(),
};

const schedulerSlice = createSlice({
  name: 'scheduler',
  initialState,
  reducers: {
    addScheduledTask: (state, action: PayloadAction<ScheduledTask>) => {
      state.scheduledTasks.push(action.payload);
      saveTasks(state.scheduledTasks);
    },
    updateScheduledTask: (state, action: PayloadAction<ScheduledTask>) => {
      const index = state.scheduledTasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.scheduledTasks[index] = action.payload;
        saveTasks(state.scheduledTasks);
      }
    },
    removeScheduledTask: (state, action: PayloadAction<string>) => {
      state.scheduledTasks = state.scheduledTasks.filter(task => task.id !== action.payload);
      saveTasks(state.scheduledTasks);
    },
    toggleTaskActive: (state, action: PayloadAction<string>) => {
      const task = state.scheduledTasks.find(task => task.id === action.payload);
      if (task) {
        task.active = !task.active;
        saveTasks(state.scheduledTasks);
      }
    },
    clearAllTasks: (state) => {
      state.scheduledTasks = [];
      saveTasks(state.scheduledTasks);
    },
  },
});

export const {
  addScheduledTask,
  updateScheduledTask,
  removeScheduledTask,
  toggleTaskActive,
  clearAllTasks,
} = schedulerSlice.actions;

export default schedulerSlice.reducer;