import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuizTime from './pages/QuizTime';
import Room from './pages/Room';
import Card from './components/Card';
import './App.css';
import ResetPassword from './components/ResetPassword';

const ADMIN_EMAIL = 'erikmatfors@gmail.com';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

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
    </Router>
  );
}

export default App;