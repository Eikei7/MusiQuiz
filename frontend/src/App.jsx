import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import QuizTime from './QuizTime';
import './App.css';
import Card from './Card';
import Room from './Room';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes for all authenticated users */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rooms/:roomId" 
            element={
              <ProtectedRoute>
                <Room />
            </ProtectedRoute>
            } 
          />
          <Route 
            path="/game/:roomId" 
            element={
            <ProtectedRoute>
            <QuizTime />
            </ProtectedRoute>
            } 
          />
          
          {/* Protected routes for admin users */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/card" 
            element={
            <ProtectedRoute requireAdmin={true}>
              <Card />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate replace to="/" />} />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;