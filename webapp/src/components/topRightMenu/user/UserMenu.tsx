import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserMenu.module.css';
import { GetUserFromCookie, SetUserCookie, ClearUserCookie } from '../../../utils/CookieRetriever';

const UserMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(GetUserFromCookie());
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = () => {
    ClearUserCookie();
    navigate("/");
    onClose();
  };

  const handleSaveUsername = () => {
    if (!user) return;
    
    const updatedUser = { ...user, username: newUsername };
    SetUserCookie(updatedUser.username, updatedUser.email);
    
    setUser(updatedUser);
    setIsEditing(false);
    // Note: Here you would usually also call an API /api/updateUsername
  };

  // --- ESTADO 1: NO LOGUEADO (INVITADO) ---
  if (!user) {
    return (
      <div className="top-right-menu-overlay">
        <div className="top-right-menu-container">
          {/* Reutilizamos el header exacto */}
          <header className={styles.header}>
            <h2>USER PROFILE</h2>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </header>

          {/* Reutilizamos el body para mantener los paddings y alineación */}
          <div className={styles.body}>
            <div className={styles.guestMessageContainer}>
              <p className={styles.guestText}>You are not logged in yet.</p>
              <p className={styles.guestSubtext}>Log in to access your profile settings.</p>
            </div>
            
            <button 
              className={styles.loginBtn} 
              onClick={() => {
                onClose(); // Cerramos el menú antes de navegar
                navigate('/login');
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ESTADO 2: LOGUEADO ---
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