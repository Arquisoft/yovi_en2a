import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { isLoggedIn, loading } = useUser();
  const location = useLocation();
  const isGuest = location.state?.guest === true;

  // Wait for the /api/me check to complete before deciding to redirect.
  // Without this, logged-in users would be briefly redirected to /login on reload.
  if (loading) return null;

  if (!isLoggedIn && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
