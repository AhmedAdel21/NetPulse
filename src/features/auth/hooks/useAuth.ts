import { useSyncExternalStore } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; name: string } | null;
}

// Module-level mutable state. Will be replaced with a real store on Day 19.
let state: AuthState = {
  isAuthenticated: false,
  user: null,
};

const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): AuthState => state;

const notify = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

const login = (): void => {
  state = {
    isAuthenticated: true,
    user: { id: 'mock-1', name: 'Ahmed' },
  };
  notify();
};

const logout = (): void => {
  state = { isAuthenticated: false, user: null };
  notify();
};

interface UseAuthReturn extends AuthState {
  login: () => void;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  console.log('snapshot', snapshot);
  return {
    ...snapshot,
    login,
    logout,
  };
};
