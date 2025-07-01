import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import scannerReducer from './slices/scannerSlice';
import serversReducer from './slices/serversSlice';
import resultsReducer from './slices/resultsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    scanner: scannerReducer,
    servers: serversReducer,
    results: resultsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Типизированные хуки
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;