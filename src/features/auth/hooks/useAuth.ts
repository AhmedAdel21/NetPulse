import { useCallback } from 'react';

import { useAppDispatch, useAppSelector } from '@app/store/hooks';

import {
  selectAuthError,
  selectAuthStatus,
  selectAuthUser,
  selectIsAuthenticated,
} from '../selectors';
import { loginThunk, logoutThunk } from '../thunks';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const login = useCallback(
    async (email: string, password: string) => {
      await dispatch(loginThunk(email, password));
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  return { user, status, error, isAuthenticated, login, logout };
};
