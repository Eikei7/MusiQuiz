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
      toast.update(toastId, {
        render: 'Login successful!',
        type: 'success',
        isLoading: false,
        autoClose: 2000
      });
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
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
            <span><a href="/forgot">Forgot Password?</a></span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
