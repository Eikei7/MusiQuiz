import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';
import QuestionsManager from '../components/QuestionsManager';
import AdminStats from '../components/AdminStats';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [addUserError, setAddUserError] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [deletingUserEmail, setDeletingUserEmail] = useState(null);
  const [showDeleteUserConfirmation, setShowDeleteUserConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        navigate('/');
        return;
      }
      if (user) {
        setUser(user);
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileError || !profileData || profileData.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
      } else {
        navigate('/');
      }
    };
    getCurrentUser();
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
    fetchQuestions();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*');
      if (error) throw error;
      setUsers(data || []);
      setError('');
    } catch (err) {
      setError('Error loading users: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData({
      ...newUserData,
      [name]: value
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserError('');
    if (!newUserData.email || !newUserData.password || !newUserData.confirmPassword) {
      setAddUserError('Email and password are required');
      return;
    }
    if (newUserData.password !== newUserData.confirmPassword) {
      setAddUserError('Passwords do not match');
      return;
    }
    setAddingUser(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserData.email,
        password: newUserData.password,
        email_confirm: true,
      });
      if (authError) throw authError;
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: newUserData.email,
            first_name: newUserData.firstName,
            last_name: newUserData.lastName,
            role: newUserData.role,
          },
        ]);
      if (insertError) throw insertError;
      fetchUsers();
      setNewUserData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: 'user',
      });
      setShowAddUserModal(false);
    } catch (error) {
      setAddUserError(error.message || 'An error occurred while adding the user');
    } finally {
      setAddingUser(false);
    }
  };

  const confirmDeleteUser = (email) => {
    setDeletingUserEmail(email);
    setShowDeleteUserConfirmation(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUserEmail) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', deletingUserEmail);
      if (error) throw error;
      setUsers(users.filter((user) => user.email !== deletingUserEmail));
      setShowDeleteUserConfirmation(false);
      setDeletingUserEmail(null);
    } catch (err) {
      console.error('Error deleting user:', err.message);
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase().trim();
    return users.filter(user =>
      user.email.toLowerCase().includes(query) ||
      (user.first_name && user.first_name.toLowerCase().includes(query)) ||
      (user.last_name && user.last_name.toLowerCase().includes(query)) ||
      (user.role && user.role.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*');
      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error loading questions:', err.message);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
    navigate('/');
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*');
      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error('Error loading rooms:', err.message);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    try {
      setCreatingRoom(true);
      const { error } = await supabase
        .from('rooms')
        .insert([{ name: newRoomName.trim() }]);
      if (error) throw error;
      fetchRooms();
      setNewRoomName('');
      setShowRoomModal(false);
    } catch (err) {
      console.error('Error creating room:', err.message);
      alert(`Failed to create room: ${err.message}`);
    } finally {
      setCreatingRoom(false);
    }
  };

  const confirmDeleteRoom = (roomId) => {
    setDeletingRoomId(roomId);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoomId) return;
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', deletingRoomId);
      if (error) throw error;
      setRooms(rooms.filter((room) => room.id !== deletingRoomId));
      setShowDeleteConfirmation(false);
      setDeletingRoomId(null);
    } catch (err) {
      console.error('Error deleting room:', err.message);
      alert(`Failed to delete room: ${err.message}`);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!user) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="admin-dashboard">
      <button
        className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-logo">
          <h2>MusiQuiz</h2>
        </div>
        <div className="admin-user">
          <div className="admin-avatar">{user?.email?.charAt(0)}</div>
          <div className="admin-user-info">
            <span className="admin-name">{user?.email?.split('@')[0]}</span>
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
            <li className={activeTab === 'rooms' ? 'active' : ''}>
              <button onClick={() => setActiveTab('rooms')}>
                Rooms
              </button>
            </li>
            <li className={activeTab === 'stats' ? 'active' : ''}>
              <button onClick={() => setActiveTab('stats')}>
                Statistics
              </button>
            </li>
            <li>
              <button onClick={handleLogout} className="admin-logout">
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>
      )}
      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {activeTab === 'dashboard' && 'Admin Dashboard'}
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'questions' && 'Quiz Questions'}
            {activeTab === 'rooms' && 'Room Management'}
            {activeTab === 'stats' && 'Game Statistics'}
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
              <div className="stat-card">
                <h3>Rooms</h3>
                <p className="stat-value">{Array.isArray(rooms) ? rooms.length : 0}</p>
              </div>
            </div>
          )}
          {activeTab === 'users' && (
            <div className="admin-users">
              <div className="admin-toolbar">
                <button
                  className="admin-button"
                  onClick={() => setShowAddUserModal(true)}
                >
                  Add New User
                </button>
                {showAddUserModal && (
                  <div className="modal-overlay">
                    <div className="modal-container">
                      <div className="modal-header">
                        <h2>Add New User</h2>
                        <button
                          className="modal-close"
                          onClick={() => setShowAddUserModal(false)}
                        >
                          &times;
                        </button>
                      </div>
                      <form onSubmit={handleAddUser}>
                        <div className="modal-body">
                          {addUserError && <div className="error-message">{addUserError}</div>}
                          <div className="form-group">
                            <label htmlFor="email">Email (required)</label>
                            <input
                              type="email"
                              id="email"
                              name="email"
                              value={newUserData.email}
                              onChange={handleUserInputChange}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="password">Password (required)</label>
                            <input
                              type="password"
                              id="password"
                              name="password"
                              value={newUserData.password}
                              onChange={handleUserInputChange}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password (required)</label>
                            <input
                              type="password"
                              id="confirmPassword"
                              name="confirmPassword"
                              value={newUserData.confirmPassword}
                              onChange={handleUserInputChange}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="firstName">First Name</label>
                            <input
                              type="text"
                              id="firstName"
                              name="firstName"
                              value={newUserData.firstName}
                              onChange={handleUserInputChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="lastName">Last Name</label>
                            <input
                              type="text"
                              id="lastName"
                              name="lastName"
                              value={newUserData.lastName}
                              onChange={handleUserInputChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="role">Role</label>
                            <select
                              id="role"
                              name="role"
                              value={newUserData.role}
                              onChange={handleUserInputChange}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>
                        <div className="modal-footer">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowAddUserModal(false)}
                            disabled={addingUser}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={addingUser}
                          >
                            {addingUser ? 'Adding...' : 'Add User'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                <div className="admin-search">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="search-clear-button"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="admin-loading">Loading users...</div>
              ) : error ? (
                <div className="admin-error">{error}</div>
              ) : (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th className="hide-on-mobile">First Name</th>
                        <th className="hide-on-mobile">Last Name</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
                        filteredUsers.map((user, index) => (
                          <tr key={user.id || user.email || `user-${index}`}>
                            <td>{user.email}</td>
                            <td className="hide-on-mobile">{user.first_name || '-'}</td>
                            <td className="hide-on-mobile">{user.last_name || '-'}</td>
                            <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                            <td>
                              <button className="action-button delete-button" onClick={() => confirmDeleteUser(user.email)}>Delete</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="no-data">
                           {searchQuery ? 'No matching users found' : 'No users found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'questions' && (
            <div className="admin-placeholder">
              <QuestionsManager/>
            </div>
          )}
          {activeTab === 'rooms' && (
            <div className="admin-rooms">
              <div className="admin-toolbar">
                <button className="admin-button" onClick={() => setShowRoomModal(true)}>
                  Create New Room
                </button>
                <div className="admin-search">
                  <input type="text" placeholder="Search rooms..." />
                </div>
              </div>
              {loading ? (
                <div className="admin-loading">Loading rooms...</div>
              ) : (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Room ID</th>
                        <th>Name</th>
                        <th className="hide-on-mobile">Players</th>
                        <th className="hide-on-mobile">Status</th>
                        <th className="hide-on-mobile">Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(rooms) && rooms.length > 0 ? (
                        rooms.map((room, index) => (
                          <tr key={room.id || room.roomId || `room-${index}`}>
                            <td>{room.id || room.roomId}</td>
                            <td>{room.name || '-'}</td>
                            <td className="hide-on-mobile">
                                {Array.isArray(room.players) && room.players.length > 0 ? (
                                  <div className="player-list">
                                    <span className="player-count">{room.players.length}</span>
                                    <div className="player-tooltip">
                                      <ul>
                                        {room.players.map((player, playerIndex) => (
                                          <li key={player.id || player.email || `player-${playerIndex}`}>
                                            {player.name || player.email || player}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="no-players">No players</span>
                                )}
                              </td>
                            <td className="hide-on-mobile">
                              <span className={`status-badge ${room.status?.toLowerCase() || 'inactive'}`}>
                                {room.status || 'Inactive'}
                              </span>
                            </td>
                            <td className="hide-on-mobile">
                              {room.createdAt || room.created_at ?
                                new Date(room.createdAt || room.created_at).toLocaleString() :
                                '-'
                              }
                            </td>
                            <td>
                              <button
                                className="action-button delete-button"
                                onClick={() => confirmDeleteRoom(room.id || room.roomId)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="no-data">No rooms found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'stats' && (
            <AdminStats/>
          )}
        </div>
      </main>
      {showDeleteUserConfirmation && (
        <div className="modal-overlay">
          <div className="modal-container delete-confirmation">
            <div className="modal-header">
              <h2>Confirm User Deletion</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDeleteUserConfirmation(false);
                  setDeletingUserEmail(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className='warning-text'>Are you sure you want to delete the user with email: <strong>{deletingUserEmail}</strong>?</p>
              <p className="warning-text">
                This action cannot be undone. All user data will be permanently deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteUserConfirmation(false);
                  setDeletingUserEmail(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteUser}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
      {showRoomModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Create New Room</h2>
              <button
                className="modal-close"
                onClick={() => setShowRoomModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="roomName">Room Name</label>
                  <input
                    type="text"
                    id="roomName"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                    required
                  />
                </div>
                <p className="help-text">A new room will be created with no players initially.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRoomModal(false)}
                  disabled={creatingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingRoom}
                >
                  {creatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-container delete-confirmation">
            <div className="modal-header">
              <h2>Confirm Deletion</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeletingRoomId(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className='warning-text'>Are you sure you want to delete this room? This action cannot be undone.</p>
              <p className="warning-text">
                All room data will be permanently deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeletingRoomId(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteRoom}
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;