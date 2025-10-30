import axios from 'axios';
import { Player, Match, UserWithProfile, Profile } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Persist and attach JWT access token if present
export const setAuthToken = (token?: string) => {
  if (token) {
    if (typeof window !== 'undefined') localStorage.setItem('access_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    if (typeof window !== 'undefined') localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
  }
};

if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const fetchProfile = async (): Promise<UserWithProfile> => {
  const response = await api.get('/profile/');
  return response.data as UserWithProfile;
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
  return res.data as { access: string; refresh: string };
};

export const updateProfile = async (payload: Partial<Profile> & { avatar?: File | null }) => {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'avatar' && v instanceof File) {
      form.append('avatar', v);
    } else {
      form.append(k, String(v));
    }
  });
  const res = await api.put('/profile/update/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data as Profile;
};

export default api;