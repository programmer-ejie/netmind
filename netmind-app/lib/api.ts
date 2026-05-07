import { Platform } from 'react-native';

export type NetmindUser = {
  id: number;
  name: string;
  email: string;
  role: 'coach' | 'trainer' | 'player' | string;
  position?: string | null;
  jersey_number?: number | string | null;
  profile_picture_url?: string | null;
};

export type LoginPayload = {
  user: NetmindUser;
  token: string;
};

const defaultApiBase = Platform.select({
  android: 'http://10.0.2.2:5001/api',
  default: 'http://localhost:5001/api',
});

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || defaultApiBase).replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const body = options.body && typeof options.body !== 'string'
    ? JSON.stringify(options.body)
    : options.body;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    body,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with ${response.status}`);
  }

  return payload as T;
}

export function loginUser(body: { email: string; password: string }) {
  return apiRequest<LoginPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
