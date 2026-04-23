import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './UserMenu.module.css';
import accountStyles from '../settings/settingsSections/AccountSettings.module.css';
import { useUser } from '../../../contexts/UserContext';

const UserMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, updateUsername } = useUser();

  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isEditing, setIsEditing] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleLogout = async () => {
    onClose();
    navigate('/');
    await logout();
  };

  const handleSaveUsername = async () => {
    if (!user) return;
    setUsernameError(null);
    try {
      await updateUsername(newUsername);
      setIsEditing(false);
    } catch (err: any) {
      setUsernameError(err.message ?? t('userMenu.failedUpdate'));
    }
  };

  if (!user) {
    return (
      <div className="top-right-menu-overlay">
        <div className="top-right-menu-container">
          <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>
          <header className="top-right-menu-global-header">
            <h2 className="top-right-menu-title">{t('userMenu.title')}</h2>
          </header>
          <div className={styles.body}>
            <div className={accountStyles.profileCard}>
              <div className={accountStyles.avatarGuest}>?</div>
              <div className={accountStyles.profileInfo}>
                <span className={accountStyles.profileName}>{t('userMenu.guestUser')}</span>
                <span className={accountStyles.profileStatus}>{t('userMenu.notLoggedIn')}</span>
              </div>
            </div>

            <div className={styles.guestMessageContainer}>
              <p className={styles.guestText}>{t('userMenu.joinUs')}</p>
              <p className={styles.guestSubtext}>{t('userMenu.logInForProfile')}</p>
            </div>

            <button
              className={styles.loginBtn}
              onClick={() => { onClose(); navigate('/login'); }}
            >
              {t('userMenu.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>
        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">{t('userMenu.title')}</h2>
        </header>
        <div className={styles.body}>
          <div className={accountStyles.profileCard}>
            <div className={accountStyles.avatar}>
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={accountStyles.profileInfo}>
              <span className={accountStyles.profileName}>{user.username}</span>
              <span className={accountStyles.profileStatus}>{user.email}</span>
            </div>
          </div>

          <div className={styles.profileCard}>
            <div className={styles.infoGroup}>
              <p>{t('userMenu.username')}</p>
              {isEditing ? (
                <>
                  <div className={styles.editRow}>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className={styles.input}
                    />
                    <button onClick={handleSaveUsername} className={styles.saveBtn}>{t('userMenu.save')}</button>
                    <button onClick={() => { setIsEditing(false); setUsernameError(null); }} className={styles.cancelBtn}>{t('userMenu.cancel')}</button>
                  </div>
                  {usernameError && <p style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{usernameError}</p>}
                </>
              ) : (
                <div className={styles.displayRow}>
                  <span>{user.username}</span>
                  <button onClick={() => setIsEditing(true)} className={styles.editBtn}>{t('userMenu.edit')}</button>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            {t('userMenu.logOut')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
