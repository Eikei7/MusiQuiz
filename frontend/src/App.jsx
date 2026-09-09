import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Card from './components/Card';
import ResetPassword from './components/ResetPassword';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const QuizTime = lazy(() => import('./pages/QuizTime'));
const Room = lazy(() => import('./pages/Room'));

const ADMIN_EMAIL = 'erikmatfors@gmail.com';

function App() {
  const { session, user, loading } = useAuth();

  if (loading) return null;

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Suspense fallback={null}>
        <Routes>
        {/* Public routes */}
        <Route path="/" element={!session ? <Login /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
        <Route path="/signup" element={!session ? <Signup /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes for all authenticated users */}
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/rooms/:roomId" element={session ? <Room /> : <Navigate to="/" replace />} />
        <Route path="/game/:roomId" element={session ? <QuizTime /> : <Navigate to="/" replace />} />

        {/* Admin-only routes */}
        <Route
          path="/admin"
          element={
            session && isAdmin ? (
              <AdminDashboard />
            ) : (
              <Navigate to={session ? "/dashboard" : "/"} replace />
            )
          }
        />
        <Route
          path="/card"
          element={
            session && isAdmin ? (
              <Card />
            ) : (
              <Navigate to={session ? "/dashboard" : "/"} replace />
            )
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;