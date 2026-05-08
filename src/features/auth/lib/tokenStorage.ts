const REFRESH_TOKEN_KEY = 'np_refresh_token';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const setRefreshToken = (token: string | null): void => {
  // PRODUCTION NOTE: in a real backend integration, the refresh token would
  // be set as an httpOnly Secure SameSite=Strict cookie by the server's
  // /login response. The client would never see this token, and it would
  // be sent automatically on /refresh requests. localStorage is used here
  // ONLY because we have no backend; swap for the cookie pattern when wiring
  // to a real auth provider.
  if (token === null) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearTokens = (): void => {
  setAccessToken(null);
  setRefreshToken(null);
};
