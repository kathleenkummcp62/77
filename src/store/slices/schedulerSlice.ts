import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authFetch } from "../../lib/auth";

export interface ScheduledTask {
  id: number;
  title: string;
  description: string;
  taskType: "scan" | "collect" | "deploy" | "report";
  vpnType?: string;
  scheduledDateTime: string;
  repeat: "once" | "daily" | "weekly" | "monthly";
  servers: string[];
  active: boolean;
  executed: boolean;
  createdAt: string;
}

interface SchedulerState {
  scheduledTasks: ScheduledTask[];
  loading: boolean;
  error: string | null;
}

const initialState: SchedulerState = {
  scheduledTasks: [],
  loading: false,
  error: null,
};

export const fetchScheduledTasks = createAsyncThunk(
  "scheduler/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const resp = await authFetch("/api/scheduled_tasks");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "failed");
      return data.data as ScheduledTask[];
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const createScheduledTask = createAsyncThunk(
  "scheduler/create",
  async (
    task: Omit<ScheduledTask, "id" | "createdAt">,
    { rejectWithValue },
  ) => {
    try {
      const resp = await authFetch("/api/scheduled_tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "failed");
      return {
        ...task,
        id: data.data.id,
        createdAt: new Date().toISOString(),
      } as ScheduledTask;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateScheduledTaskApi = createAsyncThunk(
  "scheduler/update",
  async (task: ScheduledTask, { rejectWithValue }) => {
    try {
      const resp = await authFetch(`/api/scheduled_tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "failed");
      return task;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteScheduledTask = createAsyncThunk(
  "scheduler/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      const resp = await authFetch(`/api/scheduled_tasks/${id}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "failed");
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

const schedulerSlice = createSlice({
  name: "scheduler",
  initialState,
  reducers: {
    toggleTaskLocal(state, action: PayloadAction<number>) {
      const t = state.scheduledTasks.find((st) => st.id === action.payload);
      if (t) t.active = !t.active;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduledTasks.fulfilled, (state, action) => {
        state.scheduledTasks = action.payload;
      })
      .addCase(createScheduledTask.fulfilled, (state, action) => {
        state.scheduledTasks.push(action.payload);
      })
      .addCase(updateScheduledTaskApi.fulfilled, (state, action) => {
        const idx = state.scheduledTasks.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (idx !== -1) state.scheduledTasks[idx] = action.payload;
      })
      .addCase(deleteScheduledTask.fulfilled, (state, action) => {
        state.scheduledTasks = state.scheduledTasks.filter(
          (t) => t.id !== action.payload,
        );
      });
  },
});

export const { toggleTaskLocal } = schedulerSlice.actions;
export default schedulerSlice.reducer;
