import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  // Show loading state or spinner while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Use isAuthenticated as a function - this is the key fix
  if (!isAuthenticated()) {
    return <Navigate to="/" />;
  }
  
  // Same for isAdmin
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
    
  return children;
};

export default ProtectedRoute;