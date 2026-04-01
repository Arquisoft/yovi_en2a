import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCsrfToken } from '../security/useCsrf';

export interface UserData {
  username: string;
  email: string;
}

interface UserContextType {
  user: UserData | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;                              // set when session restore fails (e.g. server down)
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = await fetchCsrfToken();
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': token }
      });
    } finally {
      setUser(null);
    }
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    const token = await fetchCsrfToken();
    const res = await fetch(`${API_URL}/api/update-username`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to update username.');
    }
    setUser(prev => prev ? { ...prev, username } : null);
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const contextValue = useMemo(
    () => ({ user, isLoggedIn: user !== null, loading, error, refreshUser, logout, updateUsername }),
    [user, loading, error, refreshUser, logout, updateUsername]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
