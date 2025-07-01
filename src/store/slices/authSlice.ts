import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, login as authLogin, clearAuthData, registerUser as authRegister, RegistrationCredentials } from '../../lib/auth';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  loginAttempts: number;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  loginAttempts: 0
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string; token?: string }, { rejectWithValue, getState }) => {
    try {
      // Check login attempts
      const state = getState() as { auth: AuthState };
      if (state.auth.loginAttempts >= 5) {
        return rejectWithValue('Too many login attempts. Please try again later.');
      }
      
      const result = await authLogin(credentials);
      
      if (!result) {
        return rejectWithValue('Invalid username or password');
      }
      
      return result.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (credentials: RegistrationCredentials, { rejectWithValue }) => {
    try {
      // Validate passwords match
      if (credentials.confirmPassword && credentials.password !== credentials.confirmPassword) {
        return rejectWithValue('Passwords do not match');
      }
      
      const result = await authRegister(credentials);
      
      if (!result) {
        return rejectWithValue('Registration failed. Invalid token or username already exists.');
      }
      
      return result.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    clearAuthData();
    toast.success('Logged out successfully');
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loginAttempts = 0; // Reset login attempts on success
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.loginAttempts += 1; // Increment login attempts on failure
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loginAttempts = 0; // Reset login attempts on logout
      });
  },
});

export const { setUser, clearUser, resetLoginAttempts } = authSlice.actions;

export default authSlice.reducer;