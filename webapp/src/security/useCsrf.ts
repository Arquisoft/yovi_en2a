import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Fetches a fresh CSRF token from the server.
 * Use this for one-off imperative calls (e.g. inside event handlers).
 */
export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken as string;
}

/**
 * React hook that fetches a CSRF token on component mount and returns it.
 * Use this in forms that need a token ready before the user submits.
 */
export function useCsrf(): string {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetchCsrfToken()
      .then(setCsrfToken)
      .catch((err) => console.error('Failed to fetch CSRF token', err));
  }, []);

  return csrfToken;
}
