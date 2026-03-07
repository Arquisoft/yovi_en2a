import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserMenu.module.css'; 

const UserMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  
  // 1. Read user from cookies
  const getCookieUser = () => {
    const cookieMatch = document.cookie.match(/(?:^|; )user=([^;]*)/);
    return cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch[1])) : null;
  };

  const [user, setUser] = useState(getCookieUser());
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = () => {
    document.cookie = "user=; path=/; max-age=0; SameSite=Lax;";
    navigate("/");
    onClose();
  };

  const handleSaveUsername = () => {
    if (!user) return;
    
    // 2. Update local state and cookie
    const updatedUser = { ...user, username: newUsername };
    const userDataString = JSON.stringify(updatedUser);
    
    document.cookie = `user=${encodeURIComponent(userDataString)}; path=/; max-age=86400; SameSite=Lax`;
    
    setUser(updatedUser);
    setIsEditing(false);
    // Note: Here you would usually also call an API /api/updateUsername
  };

  if (!user) {
    return (
      <div className="top-right-menu-overlay">
        <div className="top-right-menu-container">
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <h2>User Profile</h2>
          <p>You are not logged in yet.</p>
          <button onClick={() => navigate('/login')}>Go to Login</button>
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