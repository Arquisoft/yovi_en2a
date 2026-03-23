// React core and hooks needed to build the context
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Utility that fetches a fresh CSRF token from the server (needed for state-changing requests)
import { fetchCsrfToken } from '../security/useCsrf';

// Shape of the user data stored in the session cookie on the server
export interface UserData {
  username: string; // Display name chosen by the user at registration
  email: string;    // Unique identifier used to query Firebase
}

// Shape of everything the context exposes to the rest of the app
interface UserContextType {
  user: UserData | null;                          // Current user, or null if not logged in
  isLoggedIn: boolean;                            // Convenience boolean derived from user !== null
  loading: boolean;                               // True while the initial /api/me check is in flight
  refreshUser: () => Promise<void>;               // Re-fetches user data from the server
  logout: () => Promise<void>;                    // Clears the session cookie server-side
  updateUsername: (username: string) => Promise<void>; // Updates username in the session cookie
}

// The actual React context object. Starts as null — the Provider fills it in
const UserContext = createContext<UserContextType | null>(null);

// Base URL for all API calls, injected at build time by Vite or falling back to localhost
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Provider component — wrap the app in this so every child can access user state
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Holds the logged-in user's data, or null when no session exists
  const [user, setUser] = useState<UserData | null>(null);
  // Prevents ProtectedRoute from redirecting before the initial session check completes
  const [loading, setLoading] = useState(true);

  // Calls /api/me to check whether the httpOnly session cookie is still valid.
  // useCallback ensures the function reference is stable across renders so the
  // useEffect below does not run on every re-render.
  const refreshUser = useCallback(async () => {
    try {
      // The server reads the httpOnly cookie and returns {username, email} if valid
      const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
      // If the cookie is missing or expired the server returns 401, so we set null
      setUser(res.ok ? await res.json() : null);
    } catch {
      // Network error — treat as not logged in
      setUser(null);
    } finally {
      // Whether it succeeded or failed, the loading phase is over
      setLoading(false);
    }
  }, []);

  // Sends a logout request that tells the server to clear the httpOnly cookie.
  // The CSRF token is required because logout is a state-changing POST request.
  const logout = useCallback(async () => {
    try {
      // Fetch a fresh CSRF token so the server accepts the logout request
      const token = await fetchCsrfToken();
      // Ask the server to clear the session cookie
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',                  // Send existing cookies with the request
        headers: { 'X-CSRF-Token': token }        // Prove this request is intentional
      });
    } finally {
      // Clear local state regardless of whether the server request succeeded
      setUser(null);
    }
  }, []);

  // Updates the username inside the server-side session cookie.
  // Also updates local state so the UI reflects the change immediately.
  const updateUsername = useCallback(async (username: string) => {
    // CSRF token required because this is a state-changing POST request
    const token = await fetchCsrfToken();
    const res = await fetch(`${API_URL}/api/update-username`, {
      method: 'POST',
      credentials: 'include',                    // Send session cookie so server knows who we are
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ username })          // New username to store in the cookie
    });
    if (res.ok) {
      // Spread the previous user object and overwrite only the username field
      setUser(prev => prev ? { ...prev, username } : null);
    }
  }, []);

  // Run once on mount to restore session state from the server cookie.
  // This is what makes a page reload keep the user logged in.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // refreshUser is stable (useCallback), so this only runs once

  return (
    // Make all context values available to every component inside UserProvider
    <UserContext.Provider value={{ user, isLoggedIn: user !== null, loading, refreshUser, logout, updateUsername }}>
      {children} {/* Render the rest of the app */}
    </UserContext.Provider>
  );
};

// Custom hook to consume the context. Throws a clear error if used outside UserProvider,
// which is safer than silently returning null.
export function useUser(): UserContextType {
  const context = useContext(UserContext); // Read the nearest UserContext value in the tree
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
