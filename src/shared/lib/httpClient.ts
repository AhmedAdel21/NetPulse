import { refresh as refreshApi } from '@features/auth/api/authApi';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from '@features/auth/lib/tokenStorage';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// Single-flight refresh: if a refresh is in progress, share the same promise.
let refreshPromise: Promise<void> | null = null;

const performRefresh = async (): Promise<void> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new HttpError(401, 'No refresh token');
  }

  const result = await refreshApi(refreshToken);
  setAccessToken(result.accessToken);
  setRefreshToken(result.refreshToken);
};

const ensureRefresh = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const buildHeaders = (init: RequestInit | undefined, skipAuth: boolean): HeadersInit => {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return headers;
};

const doFetch = async (url: string, options: RequestOptions): Promise<Response> => {
  const { skipAuth = false, ...rest } = options;
  return fetch(url, { ...rest, headers: buildHeaders(rest, skipAuth) });
};

export const httpRequest = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  let response = await doFetch(url, options);

  // 401 + we have a refresh token + this isn't an auth endpoint → try refresh
  if (response.status === 401 && !options.skipAuth && getRefreshToken()) {
    try {
      await ensureRefresh();
      response = await doFetch(url, options); // retry once
    } catch {
      clearTokens();
      // Notify listeners that we're logged out — done by emitting an event.
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new HttpError(401, 'Session expired');
    }
  }

  if (!response.ok) {
    throw new HttpError(response.status, response.statusText);
  }

  // Handle empty responses (204, etc.)
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
};

export const httpClient = {
  get: <T>(url: string, options?: RequestOptions) =>
    httpRequest<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body: unknown, options?: RequestOptions) =>
    httpRequest<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown, options?: RequestOptions) =>
    httpRequest<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: RequestOptions) =>
    httpRequest<T>(url, { ...options, method: 'DELETE' }),
};
