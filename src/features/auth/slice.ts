import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error';

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authPending: (state) => {
      state.status = 'authenticating';
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<AuthUser>) => {
      state.status = 'authenticated';
      state.user = action.payload;
      state.error = null;
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.user = null;
      state.error = action.payload;
    },
    authReset: () => initialState,
  },
});

export const { authPending, authSuccess, authFailure, authReset } = authSlice.actions;
export const authReducer = authSlice.reducer;
