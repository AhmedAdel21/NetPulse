import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { clearTokens } from '@features/auth/lib/tokenStorage';
import { authReset } from '@features/auth/slice';

import { AppRouter } from './router/AppRouter';
import { store } from './store';

import './App.css';

const AuthLogoutListener = (): null => {
  useEffect(() => {
    const handleLogout = (): void => {
      clearTokens();
      store.dispatch(authReset());
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);
  return null;
};

export const App = () => {
  return (
    <Provider store={store}>
      <AuthLogoutListener />
      <AppRouter />
    </Provider>
  );
};
