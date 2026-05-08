export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  exp: number; // unix seconds
  iat: number; // unix seconds
}

const base64UrlEncode = (input: string): string => {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlDecode = (input: string): string => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + padding);
};

export const createMockToken = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  ttlSeconds: number,
): string => {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = base64UrlEncode('mock-signature-not-real');

  return `${header}.${body}.${signature}`;
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
      return null;
    }

    const decoded = base64UrlDecode(payloadPart);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string, bufferSeconds = 0): boolean => {
  const payload = decodeToken(token);
  if (!payload) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + bufferSeconds;
};
