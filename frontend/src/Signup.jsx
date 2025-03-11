import { useState } from 'react';
import './Signup.css';
import { ENDPOINT_REGISTER } from './endpoints';

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
    setSuccess('');
    
    // Validate form
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(ENDPOINT_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          firstName: formData.firstName || '',
          lastName: formData.lastName || ''
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Registration failed');
      }
      
      setSuccess('Registration successful! You can now log in.');
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
      });
    } catch (error) {
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <img src="/logo_text_clear.png" alt="MusiQuiz logo" />
      <div className="signup-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="text" 
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
              autoComplete="new-password"
            />
          </div>
          <div className="input-group">
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Password again"
              required 
              autoComplete="new-password"
            />
          </div>
          
          {/* Optional name fields */}
          <div className="input-group">
            <input 
              type="text" 
              id="firstName" 
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First Name (optional)" 
              autoComplete="given-name"
            />
          </div>
          <div className="input-group">
            <input 
              type="text" 
              id="lastName" 
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last Name (optional)" 
              autoComplete="family-name"
            />
          </div>
          
          <div className="input-group">
            <button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
          <div className="signup-links">
            <span><a href="/">Back to login</a></span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;