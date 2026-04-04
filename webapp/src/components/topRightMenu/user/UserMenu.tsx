import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserMenu.module.css';
import accountStyles from '../settings/settingsSections/AccountSettings.module.css';
import { useUser } from '../../../contexts/UserContext';

const UserMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
      setUsernameError(err.message ?? 'Failed to update username.');
    }
  };

  if (!user) {
    return (
      <div className="top-right-menu-overlay">
        <div className="top-right-menu-container">
          <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>
          <header className="top-right-menu-global-header">
            <h2 className="top-right-menu-title">USER PROFILE</h2>
          </header>
          <div className={styles.body}>
            <div className={accountStyles.profileCard}>
              <div className={accountStyles.avatarGuest}>?</div>
              <div className={accountStyles.profileInfo}>
                <span className={accountStyles.profileName}>Guest User</span>
                <span className={accountStyles.profileStatus}>Not logged in</span>
              </div>
            </div>

            <div className={styles.guestMessageContainer}>
              <p className={styles.guestText}>Join us to save your progress!</p>
              <p className={styles.guestSubtext}>Log in to access your profile settings and match history.</p>
            </div>

            <button
              className={styles.loginBtn}
              onClick={() => { onClose(); navigate('/login'); }}
            >
              Go to Login
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
          <h2 className="top-right-menu-title">USER PROFILE</h2>
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
              <p>Username</p>
              {isEditing ? (
                <>
                  <div className={styles.editRow}>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className={styles.input}
                    />
                    <button onClick={handleSaveUsername} className={styles.saveBtn}>Save</button>
                    <button onClick={() => { setIsEditing(false); setUsernameError(null); }} className={styles.cancelBtn}>Cancel</button>
                  </div>
                  {usernameError && <p style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{usernameError}</p>}
                </>
              ) : (
                <div className={styles.displayRow}>
                  <span>{user.username}</span>
                  <button onClick={() => setIsEditing(true)} className={styles.editBtn}>Edit</button>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
