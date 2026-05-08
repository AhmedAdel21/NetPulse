import type { AppDispatch } from '@app/store';

import * as authApi from './api/authApi';
import { setAccessToken, setRefreshToken, clearTokens } from './lib/tokenStorage';
import { authPending, authSuccess, authFailure, authReset } from './slice';

export const loginThunk =
  (email: string, password: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(authPending());
    try {
      const result = await authApi.login(email, password);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      dispatch(authSuccess(result.user));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch(authFailure(message));
      throw error;
    }
  };

export const logoutThunk =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Logout always succeeds locally even if the API call fails
    }
    clearTokens();
    dispatch(authReset());
  };
