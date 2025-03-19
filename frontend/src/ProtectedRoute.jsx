import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated()) {
    return <Navigate to="/" />;
  }
  
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
    
  return children;
};

export default ProtectedRoute;