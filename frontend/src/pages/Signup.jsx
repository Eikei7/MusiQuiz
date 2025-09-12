import { useState } from 'react';
import './Login-Signup.css';
import { supabase } from '../supabaseClient';

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
  setLoading(true);
  try {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    // 1. Register the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (authError) throw authError;
    // 2. Only insert into "users" table if authData.user exists
    if (authData.user) {
      const { error: dbError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'user',
          },
        ]);
      if (dbError) throw dbError;
    }
    setSuccess('Registration successful! Please check your email for confirmation.');
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

          <div className="input-group">
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First Name"
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
              placeholder="Last Name"
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
