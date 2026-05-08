import { createMockToken, type JwtPayload } from '../lib/jwt';

const ACCESS_TOKEN_TTL = 30; // 30 seconds — short for testing refresh
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_USER = {
  id: 'user-1',
  name: 'Ahmed',
  email: 'ahmed@netpulse.dev',
};

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  await delay(400); // simulate network

  // Mock validation: any non-empty email + password >= 6 chars passes
  if (!email || password.length < 6) {
    throw new Error('Invalid credentials');
  }

  const accessToken = createMockToken(
    { sub: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email },
    ACCESS_TOKEN_TTL,
  );
  const refreshToken = createMockToken(
    { sub: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email },
    REFRESH_TOKEN_TTL,
  );

  return { accessToken, refreshToken, user: MOCK_USER };
};

export const refresh = async (refreshToken: string): Promise<RefreshResponse> => {
  await delay(200);

  // Decode the refresh token. If it's expired or malformed, fail.
  const parts = refreshToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid refresh token');
  }

  let payload: JwtPayload;
  try {
    const decoded = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    payload = JSON.parse(decoded) as JwtPayload;
  } catch {
    throw new Error('Invalid refresh token');
  }

  if (payload.exp * 1000 <= Date.now()) {
    throw new Error('Refresh token expired');
  }

  // Issue new tokens
  const newAccessToken = createMockToken(
    { sub: payload.sub, name: payload.name, email: payload.email },
    ACCESS_TOKEN_TTL,
  );
  const newRefreshToken = createMockToken(
    { sub: payload.sub, name: payload.name, email: payload.email },
    REFRESH_TOKEN_TTL,
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logout = async (): Promise<void> => {
  await delay(100);
  // In real backend: server invalidates refresh token, clears httpOnly cookie
};
