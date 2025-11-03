import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../pages/Login-Signup.css';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidResetContext, setIsValidResetContext] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're in a valid password reset context
    const checkResetContext = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If there's no session at all, this isn't a valid reset context
      if (!session) {
        setError('Invalid or expired password reset link. Please request a new one.');
        return;
      }
      
      // If we have a session but it's a regular authenticated session (not recovery),
      // redirect to dashboard
      if (session.user && !session.user.recovery_session) {
        navigate('/dashboard');
        return;
      }
      
      // This is a valid password recovery session
      setIsValidResetContext(true);
    };

    checkResetContext();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidResetContext) return;

    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess('Password updated successfully! Redirecting to login...');
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login after successful password reset
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      setError(error.message || 'An error occurred while updating your password');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidResetContext && error) {
    return (
      <div className='container'>
        <img src="/logo_text_clear.png" alt="MusiQuiz logo" />
        <div className="login-container">
          <h2>Password Reset</h2>
          <div className="error-message">{error}</div>
          <div className="login-links">
            <span><a href="/">Back to login</a></span>
            <span><a href="/forgot-password">Request new reset link</a></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <img src="/logo_text_clear.png" alt="MusiQuiz logo" />
      <div className="login-container">
        <h2>Set New Password</h2>
        <p className="forgot-password-description">
          Please enter your new password below.
        </p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <button type="submit" disabled={loading || !isValidResetContext}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
          
          <div className="login-links">
            <span><a href="/">Back to login</a></span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;