'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthToken } from '@/lib/api';

type User = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile?: {
    avatar_url?: string | null;
    bio?: string | null;
    skill_level?: string | null;
    location?: string | null;
    gender?: string | null;
  } | null;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string | null) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/profile/');
      setUser(res.data as User);
    } catch {
      setUser(null);
    }
  }, []);

  const setToken = useCallback(async (newToken: string | null) => {
    setAuthToken(newToken ?? undefined);
    setTokenState(newToken);
    if (newToken) {
      await refreshUser();
    } else {
      setUser(null);
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await setToken(null);
  }, [setToken]);

  useEffect(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('access_token');
      if (stored) {
        setAuthToken(stored);
        setTokenState(stored);
        refreshUser().finally(() => setLoading(false));
        return;
      }
    }
    setLoading(false);
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!token,
    setToken,
    logout,
    refreshUser,
  }), [user, token, loading, setToken, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
