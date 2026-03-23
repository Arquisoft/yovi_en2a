import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserMenu.module.css';
import { useUser } from '../../../contexts/UserContext';

const UserMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user, logout, updateUsername } = useUser();

  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    onClose();
  };

  const handleSaveUsername = async () => {
    if (!user) return;
    try {
      await updateUsername(newUsername);
      setIsEditing(false);
    } catch {
      console.error('Failed to update username');
    }
  };

  if (!user) {
    return (
      <div className="top-right-menu-overlay">
        <div className="top-right-menu-container">
          <header className={styles.header}>
            <h2>USER PROFILE</h2>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </header>
          <div className={styles.body}>
            <div className={styles.guestMessageContainer}>
              <p className={styles.guestText}>You are not logged in yet.</p>
              <p className={styles.guestSubtext}>Log in to access your profile settings.</p>
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
        <header className={styles.header}>
          <h2>USER PROFILE</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </header>
        <div className={styles.body}>
          <div className={styles.infoGroup}>
            <p>Email</p>
            <p>{user.email}</p>
          </div>
          <div className={styles.infoGroup}>
            <p>Username</p>
            {isEditing ? (
              <div className={styles.editRow}>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={styles.input}
                />
                <button onClick={handleSaveUsername} className={styles.saveBtn}>Save</button>
                <button onClick={() => setIsEditing(false)} className={styles.cancelBtn}>Cancel</button>
              </div>
            ) : (
              <div className={styles.displayRow}>
                <span>{user.username}</span>
                <button onClick={() => setIsEditing(true)} className={styles.editBtn}>Edit</button>
              </div>
            )}
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
