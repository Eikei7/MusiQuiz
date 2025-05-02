import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuizTime from './pages/QuizTime';
import './App.css';
import Card from './components/Card';
import Room from './pages/Room';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        
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