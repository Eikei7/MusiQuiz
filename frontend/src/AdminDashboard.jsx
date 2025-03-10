import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ENDPOINT_USERS, ENDPOINT_QUESTIONS_GET } from './endpoints';
import './AdminDashboard.css';
import QuestionsManager from './QuestionsManager';

function AdminDashboard() {
  const { user, logout, token } = useAuth();
  const [users, setUsers] = useState([]);  // Initialize as empty array
  const [questions, setQuestions] = useState([]);  // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchUsers();
    fetchQuestions();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(ENDPOINT_USERS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      // Ensure we're setting an array to the users state
      setUsers(Array.isArray(data) ? data : (data.users || []));
      setError('');
    } catch (err) {
      setError('Error loading users: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(ENDPOINT_QUESTIONS_GET, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(Array.isArray(data) ? data : (data.questions || []));
    } catch (err) {
      console.error('Error loading questions:', err.message);
      // Not setting the main error state to avoid disrupting the UI
    }
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <img src="/logo_small.png" alt="MusiQuiz logo" />
        </div>
        <div className="admin-user">
          <div className="admin-avatar">{user?.firstName?.charAt(0) || user?.email?.charAt(0)}</div>
          <div className="admin-user-info">
            <span className="admin-name">{user?.firstName || user?.email?.split('@')[0]}</span>
            <span className="admin-role">Administrator</span>
          </div>
        </div>
        <nav className="admin-nav">
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''}>
              <button onClick={() => setActiveTab('dashboard')}>
                Dashboard
              </button>
            </li>
            <li className={activeTab === 'users' ? 'active' : ''}>
              <button onClick={() => setActiveTab('users')}>
                Users
              </button>
            </li>
            <li className={activeTab === 'questions' ? 'active' : ''}>
              <button onClick={() => setActiveTab('questions')}>
                Questions
              </button>
            </li>
            <li className={activeTab === 'stats' ? 'active' : ''}>
              <button onClick={() => setActiveTab('stats')}>
                Statistics
              </button>
            </li>
            <li>
              <button onClick={logout} className="admin-logout">
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {activeTab === 'dashboard' && 'Admin Dashboard'}
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'questions' && 'Question Bank'}
            {activeTab === 'stats' && 'Statistics & Reports'}
          </h1>
        </header>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="admin-overview">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-value">{Array.isArray(users) ? users.length : 0}</p>
              </div>
              <div className="stat-card">
                <h3>Questions</h3>
                <p className="stat-value">{Array.isArray(questions) ? questions.length : 0}</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="admin-users">
              <div className="admin-toolbar">
                <button className="admin-button">Add New User</button>
                <div className="admin-search">
                  <input type="text" placeholder="Search users..." />
                </div>
              </div>

              {loading ? (
                <div className="admin-loading">Loading users...</div>
              ) : error ? (
                <div className="admin-error">{error}</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(users) && users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.email}>
                          <td>{user.email}</td>
                          <td>{user.firstName || '-'}</td>
                          <td>{user.lastName || '-'}</td>
                          <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                          <td>
                            <button className="action-button edit-button">Edit</button>
                            <button className="action-button delete-button">Delete</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-data">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="admin-placeholder">
              {/* <h2>Question Bank</h2>
              <p>Here you can add, edit, and categorize quiz questions.</p> */}
              <QuestionsManager/>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="admin-placeholder">
              <h2>Statistics & Reports</h2>
              <p>View analytics and generate reports on quiz performance.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;