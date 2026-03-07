import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './AuthForm.module.css';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 1. State to store the CSRF token
  const [csrfToken, setCsrfToken] = useState<string>('');
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  // 2. Fetch the CSRF token when the component mounts
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/csrf-token`, {
          // Required for the browser to accept and store the response cookie
          credentials: 'include' 
        });
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch (err) {
        console.error('Failed to fetch CSRF token', err);
      }
    };
    
    fetchCsrfToken();
  }, [API_URL]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponseMessage(null);
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 3. Send the token in the header to match the cookie in the backend
          'X-CSRF-Token': csrfToken 
        },
        // 4. VERY IMPORTANT: Tells fetch to send the invisible CSRF cookie
        credentials: 'include', 
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (res.ok) {
        // 5. Store user data in a cookie instead of localStorage
        // We encode the JSON string so it safely fits in the cookie format.
        // max-age=86400 means the cookie will expire in 1 day (24 hours).
        const userData = JSON.stringify({
          username: data.username,
          email: data.email
        });
        document.cookie = `user=${encodeURIComponent(userData)}; path=/; max-age=86400; SameSite=Lax`;

        setResponseMessage(data.message);
        setTimeout(() => {
            navigate('/gameSelection');
        }, 1500);
      } else {
        setError(data.error || 'Server error occurred.');
      }
    } catch (err: any) {
      setError(err.message || 'A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.authForm}>
      <h2>Login</h2>

      <div className={styles.formGroup}>
        <label htmlFor="login-email">Email address</label>
        <input
          type="email"
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="login-password">Password</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Processing...' : 'Login'}
      </button>

      <Link to="/register" className={styles.linkText}>
        If you haven't registered yet, click here
      </Link>

      {responseMessage && (
        <div className={styles.successMessage}>
          {responseMessage}
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </form>
  );
};

export default LoginForm;