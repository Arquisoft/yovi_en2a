import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { IsLoggedIn, SetUserCookie } from '../../utils/CookieRetriever';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State to store the CSRF token
  const [csrfToken, setCsrfToken] = useState<string>('');
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  useEffect(() => {
    if (IsLoggedIn()) {
      navigate('/gameSelection');
    }
  }, [navigate]);

  // Fetch the CSRF token when the component mounts
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/csrf-token`, {
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

    if (!email.trim() || !username.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();
      
      if (res.ok) {
        SetUserCookie(username, email);

        setResponseMessage(data.message);
        setTimeout(() => {
          navigate('/gameSelection');
        }, 1500);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.authForm}>
      <h2>Register</h2>

      <div className={styles.formGroup}>
        <label htmlFor="register-email">Email address</label>
        <input
          type="email"
          id="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="register-username">Username</label>
        <input
          type="text"
          id="register-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="register-password">Password</label>
        <input
          type="password"
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? 'Processing...' : 'Sign Up'}
      </button>

      <Link to="/login" className={styles.linkText}>
        Already have an account? Click here to login
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

export default RegisterForm;