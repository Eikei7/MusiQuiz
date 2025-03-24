import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login-Signup.css';
import { useAuth } from '../auth/AuthContext';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
      
      // Navigate based on user role
      if (result.userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      setError(error.message || 'An error occurred during login');
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
        {error && <div className="error-message">{error}</div>}
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