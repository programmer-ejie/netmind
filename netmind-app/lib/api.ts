import { Platform } from 'react-native';

export type NetmindUser = {
  id: number;
  name: string;
  email: string;
  role: 'coach' | 'trainer' | 'player' | string;
  position?: string | null;
  jersey_number?: number | string | null;
  age?: number | string | null;
  birthdate?: string | null;
  location?: string | null;
  profile_picture_url?: string | null;
  profile_picture_file_id?: string | null;
  is_active?: boolean | number;
  created_at?: string | null;
};

export type LoginPayload = {
  user: NetmindUser;
  token: string;
};

export type ResourceList<T> = {
  data: T[];
};

export type Team = {
  id: number;
  team_name: string;
  team_color?: string | null;
};

export type TeamMember = {
  id: number;
  team_id: number;
  player_id: number;
};

const defaultApiBase = Platform.select({
  android: 'http://10.0.2.2:5001/api',
  default: 'http://localhost:5001/api',
});

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || defaultApiBase).replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const body = options.body && typeof options.body !== 'string' && !isFormData
    ? JSON.stringify(options.body)
    : options.body;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    body,
    headers: {
      ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
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

export function getResource<T>(resource: string, id: number | string) {
  return apiRequest<T>(`/${resource}/${id}`);
}

export function listResource<T>(resource: string, params: Record<string, string | number> = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<ResourceList<T>>(`/${resource}${suffix}`);
}

export function updateResource<T>(resource: string, id: number | string, body: Record<string, unknown>) {
  return apiRequest<T>(`/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function getProfilePictureUrl(user?: NetmindUser | null) {
  if (user?.profile_picture_file_id) {
    return `${API_BASE}/profile-pictures/${user.profile_picture_file_id}`;
  }

  return user?.profile_picture_url || '';
}

export function uploadProfilePicture(userId: number | string, image: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('profile_picture', image as unknown as Blob);

  return apiRequest<{ user: NetmindUser }>(`/users/${userId}/profile-picture`, {
    method: 'POST',
    body: formData,
  });
}
