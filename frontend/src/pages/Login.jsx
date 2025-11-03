import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login-Signup.css';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const toastId = toast.loading('Logging in...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (authError) throw authError;
      if (!authData.user) {
        throw new Error('User not found after login');
      }
      // Update last_login in the users table
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authData.user.id);
        
        if (updateError) {
          console.warn('Failed to update last_login:', updateError);
        }
      } catch (updateErr) {
        console.warn('Error updating last_login:', updateErr);
      }

      toast.update(toastId, {
        render: 'Login successful!',
        type: 'success',
        isLoading: false,
        autoClose: 2000
      });
      
      // Remove the hardcoded navigation - let App.jsx handle the redirect
      // The auth state change will trigger the redirect logic in App.jsx
    } catch (error) {
      toast.error(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const toastId = toast.loading('Sending reset instructions...');
      
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.update(toastId, {
        render: 'Password reset instructions sent to your email!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });

      // Close modal and reset form
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
      
    } catch (error) {
      toast.error(error.message || 'An error occurred while sending reset instructions');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className='container'>
      <div className="sticky-note">
        <div className="sticky-content">
          <h3>Are you a music expert?</h3>
          <p>Take the multiple choice quiz alone or with friends to see if you have what it takes. Let the quiz begin!</p>
        </div>
      </div>
      <div className="logo-container">
        <img src="/logo_text_clear.png" alt="MusiQuiz logo" />
      </div>
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Username (email address)"
              required
              autoComplete="username"
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="input-group">
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : "Let's GO!"}
            </button>
          </div>
          <div className="login-links">
            <span><a href="/signup">Sign up</a></span>
            <span>
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </button>
            </span>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Reset Your Password</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                }}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <p className="forgot-password-description">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
              
              <form onSubmit={handleForgotPassword}>
                <div className="input-group">
                  <input
                    type="email"
                    id="forgotPasswordEmail"
                    name="forgotPasswordEmail"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                    }}
                    disabled={forgotPasswordLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Instructions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;