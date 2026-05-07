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
  is_active?: boolean | number;
};

export type Match = {
  id: number;
  team_id: number;
  opponent_name: string;
  match_date: string;
  best_of?: number | string | null;
  is_home?: boolean | number;
  result?: 'win' | 'loss' | 'draw' | string | null;
  team_score?: number | string | null;
  opponent_score?: number | string | null;
  season_id?: number | string | null;
  match_type?: string | null;
  notes?: string | null;
};

export type MatchScore = {
  id: number;
  match_id: number;
  match_number: number;
  team_score?: number | string | null;
  opponent_score?: number | string | null;
  result?: 'win' | 'loss' | 'draw' | string | null;
};

export type TrainingAssignment = {
  id: number;
  player_id: number;
  assigned_by: number;
  drill_id?: number | null;
  drill_name?: string | null;
  category?: string | null;
  difficulty?: string | null;
  focus_area?: string | null;
  drill_description?: string | null;
  target_reps?: number | string | null;
  target_success_rate?: number | string | null;
  due_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | string;
  completed_at?: string | null;
  created_at?: string | null;
};

export type WellnessCheckIn = {
  id: number;
  player_id: number;
  checkin_date: string;
  fatigue_level: number;
  rpe: number;
  sleep_hours: number | string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WellnessCheckInInput = {
  checkin_date: string;
  fatigue_level: number;
  rpe: number;
  sleep_hours: number;
  notes?: string | null;
};

export type InjuryReportInput = {
  injury_type: string;
  body_part: 'ankle' | 'knee' | 'shoulder' | 'back' | 'wrist' | 'elbow' | 'hip' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  occurred_at: string;
  reported_by: number;
  notes?: string | null;
};

export type InjuryLog = InjuryReportInput & {
  id: number;
  player_id: number;
  recovered_at?: string | null;
  days_missed?: number | null;
  created_at?: string | null;
};

export type PerformanceReflectionInput = {
  session_type: 'match';
  match_id: number;
  action_type: 'reflection';
  result?: 'normal' | string | null;
  rpe: number;
  energy_level: number;
  confidence_level: number;
  focus_level: number;
  injury_status: 'none' | 'minor' | 'moderate' | 'injured';
  notes?: string | null;
};

export type PerformanceLog = PerformanceReflectionInput & {
  id: number;
  user_id: number;
  match_number?: number | string;
  created_at?: string | null;
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

export function listPlayerTrainingAssignments(playerId: number | string) {
  return apiRequest<TrainingAssignment[]>(`/players/${playerId}/training-assignments`);
}

export function updateTrainingAssignmentStatus(assignmentId: number | string, status: TrainingAssignment['status']) {
  return apiRequest<TrainingAssignment>(`/training-assignments/${assignmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function listTeamMatches(teamId: number | string) {
  return apiRequest<Match[]>(`/teams/${teamId}/matches`);
}

export function listPlayerPerformanceLogs(playerId: number | string) {
  return apiRequest<PerformanceLog[]>(`/players/${playerId}/performance-logs`);
}

export function submitPlayerPerformanceReflection(playerId: number | string, body: PerformanceReflectionInput) {
  return apiRequest<PerformanceLog>(`/players/${playerId}/performance-logs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPlayerWellnessCheckIns(playerId: number | string, month?: string) {
  const suffix = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiRequest<WellnessCheckIn[]>(`/players/${playerId}/wellness-checkins${suffix}`);
}

export function submitPlayerWellnessCheckIn(playerId: number | string, body: WellnessCheckInInput) {
  return apiRequest<WellnessCheckIn>(`/players/${playerId}/wellness-checkins`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function reportPlayerInjury(playerId: number | string, body: InjuryReportInput) {
  return apiRequest<InjuryLog>(`/players/${playerId}/injuries`, {
    method: 'POST',
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
