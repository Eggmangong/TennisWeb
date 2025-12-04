import axios from 'axios';
import { Player, Match, UserWithProfile, Profile, CheckInMonth, Recommendation, FriendItem, ChatThread, ChatMessage, AIRecommendationResult } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Persist and attach JWT access token if present
export const setAuthToken = (token?: string, refreshToken?: string) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('access_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('access_token');
      delete api.defaults.headers.common['Authorization'];
    }

    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    } else if (!token) {
      // Only clear refresh token if we are clearing everything (logout)
      localStorage.removeItem('refresh_token');
    }
  }
};

if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add Interceptor for Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/token/')) {
      originalRequest._retry = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        // Call refresh endpoint directly to avoid interceptor loop
        const response = await axios.post(
          `${api.defaults.baseURL}/token/refresh/`,
          { refresh: refreshToken }
        );
        const { access } = response.data;
        setAuthToken(access);
        // Update the original request header
        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        setAuthToken(undefined); // Clear all
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const fetchProfile = async (): Promise<UserWithProfile> => {
  const response = await api.get('/profile/');
  return response.data as UserWithProfile;
};

export const fetchUserById = async (userId: number): Promise<UserWithProfile> => {
  const res = await api.get(`/users/${userId}/`);
  return res.data as UserWithProfile;
};

export const fetchMatches = async (): Promise<Match[]> => {
  const response = await api.get('/matches/');
  return response.data;
};

export const fetchRankings = async (): Promise<Player[]> => {
  const response = await api.get('/rankings/');
  return response.data;
};

export const login = async (payload: { username: string; password: string }) => {
  const res = await api.post('/token/', payload);
  setAuthToken(res.data.access, res.data.refresh);
  return res.data as { access: string; refresh: string };
};

export const updateProfile = async (payload: Partial<Profile> & { avatar?: File | null }) => {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'avatar' && v instanceof File) {
      form.append('avatar', v);
    } else {
      // If a field is an array (multi-select preferences), send as JSON string
      if (Array.isArray(v)) {
        form.append(k, JSON.stringify(v));
      } else {
        form.append(k, String(v));
      }
    }
  });
  const res = await api.put('/profile/update/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data as Profile;
};

// Calendar check-ins
export const fetchCheckins = async (monthISO: string): Promise<CheckInMonth> => {
  const res = await api.get(`/checkins/`, { params: { month: monthISO } });
  return res.data as CheckInMonth;
};

export const setCheckin = async (dateISO: string, value: boolean, duration?: number, start_time?: string | null, end_time?: string | null): Promise<{ ok: boolean; date: string; value: boolean; duration?: number }> => {
  const res = await api.post(`/checkins/set/`, { date: dateISO, value, duration, start_time, end_time });
  return res.data;
};

// Matching & Friends
export const fetchRecommendation = async (excludeIds: number[] = []): Promise<Recommendation> => {
  const params: Record<string, string> = {};
  if (excludeIds.length > 0) params.exclude = excludeIds.join(',');
  const res = await api.get(`/match/recommend/`, { params });
  return res.data as Recommendation;
};

export const fetchMatchCandidates = async (excludeIds: number[] = [], limit = 8): Promise<Recommendation[]> => {
  const params: Record<string, string> = { limit: String(limit) };
  if (excludeIds.length > 0) params.exclude = excludeIds.join(',');
  const res = await api.get(`/match/candidates/`, { params });
  return (res.data?.candidates || []) as Recommendation[];
};

// AI recommendation via Next.js server route (LLM selection among candidates)
export const fetchAIRecommendation = async (excludeIds: number[] = [], limit = 8, model = 'gpt-4o'): Promise<AIRecommendationResult> => {
  let token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const doFetch = async (authToken: string | null) => {
    if (!authToken) throw new Error('Not authenticated');
    return fetch('/api/match/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ exclude: excludeIds, limit, model }),
    });
  };

  let res = await doFetch(token);

  if (res.status === 401) {
    // Try to refresh
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (refreshToken) {
        const refreshRes = await axios.post(`${api.defaults.baseURL}/token/refresh/`, { refresh: refreshToken });
        const newAccess = refreshRes.data.access;
        setAuthToken(newAccess); // Update global state
        token = newAccess;
        res = await doFetch(newAccess); // Retry
      }
    } catch (e) {
      // Refresh failed, let the error propagate or handle it
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `AI recommendation failed: ${res.status}`);
  }
  return (await res.json()) as AIRecommendationResult;
};

export const addFriend = async (friendId: number): Promise<FriendItem> => {
  const res = await api.post(`/friends/`, { friend_id: friendId });
  return res.data as FriendItem;
};

export const fetchFriends = async (): Promise<FriendItem[]> => {
  const res = await api.get(`/friends/`);
  return res.data as FriendItem[];
};

export const deleteFriend = async (friendUserId: number): Promise<void> => {
  await api.delete(`/friends/${friendUserId}/`);
};

// Chat
export const listChatThreads = async (): Promise<ChatThread[]> => {
  const res = await api.get(`/chat/threads/`);
  return res.data as ChatThread[];
};

export const createOrGetThread = async (otherUserId: number): Promise<ChatThread> => {
  const res = await api.post(`/chat/threads/`, { other_user_id: otherUserId });
  return res.data as ChatThread;
};

export const fetchThreadMessages = async (threadId: number, since?: string): Promise<ChatMessage[]> => {
  const res = await api.get(`/chat/threads/${threadId}/messages/`, { params: since ? { since } : {} });
  return res.data as ChatMessage[];
};

export const sendMessage = async (threadId: number, content: string): Promise<ChatMessage> => {
  const res = await api.post(`/chat/threads/${threadId}/messages/`, { content });
  return res.data as ChatMessage;
};

export default api;