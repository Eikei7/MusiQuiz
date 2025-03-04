import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Component for routes that require authentication
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  // Show loading state or spinner while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/" />;
  }
  
  // Additional check for admin routes
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

export default ProtectedRoute;