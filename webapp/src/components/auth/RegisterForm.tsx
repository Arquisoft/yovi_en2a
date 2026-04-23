import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './AuthForm.module.css';
import { useUser } from '../../contexts/UserContext';
import { useCsrf } from '../../security/useCsrf';

const RegisterForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn, refreshUser } = useUser();
  const csrfToken = useCsrf();
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate('/gameSelection');
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponseMessage(null);
    setError(null);

    if (!email.trim() || !username.trim() || !password.trim()) {
      setError(t('auth.register.errorRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        await refreshUser();
        setResponseMessage(data.message);
        setTimeout(() => navigate('/gameSelection'), 1500);
      } else {
        setError(data.error || t('auth.register.errorFailed'));
      }
    } catch {
      setError(t('auth.register.errorServer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.authForm}>
      <h2>{t('auth.register.title')}</h2>

      <div className={styles.formGroup}>
        <label htmlFor="register-email">{t('auth.register.email')}</label>
        <input
          type="email"
          id="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="register-username">{t('auth.register.username')}</label>
        <input
          type="text"
          id="register-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="register-password">{t('auth.register.password')}</label>
        <input
          type="password"
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.formInput}
        />
      </div>

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? t('auth.register.loading') : t('auth.register.submit')}
      </button>

      <Link to="/login" className={styles.linkText}>
        {t('auth.register.loginLink')}
      </Link>

      {responseMessage && <div className={styles.successMessage}>{responseMessage}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </form>
  );
};

export default RegisterForm;
