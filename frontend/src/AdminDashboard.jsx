import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  ENDPOINT_USERS,
  ENDPOINT_USERS_DELETE, 
  ENDPOINT_QUESTIONS_GET, 
  ENDPOINT_ROOMS_GET,
  ENDPOINT_ROOMS_DELETE 
} from './endpoints';
import './AdminDashboard.css';
import QuestionsManager from './QuestionsManager';

function AdminDashboard() {
  const { user, logout, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Room creation state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  
  // Room deletion state
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // User deletion state
  const [deletingUserEmail, setDeletingUserEmail] = useState(null);
  const [showDeleteUserConfirmation, setShowDeleteUserConfirmation] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchQuestions();
    fetchRooms();
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

  const confirmDeleteUser = (email) => {
    setDeletingUserEmail(email);
    setShowDeleteUserConfirmation(true);
  };
  
  const handleDeleteUser = async () => {
    if (!deletingUserEmail) return;
    
    try {
      // Replace the hardcoded URL with your endpoint constant
      // and replace {email} with the actual email value
      const url = ENDPOINT_USERS_DELETE.replace('{email}', encodeURIComponent(deletingUserEmail));
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Remove the deleted user from the state
      setUsers(users.filter(user => user.email !== deletingUserEmail));
      
      // Close the confirmation modal
      setShowDeleteUserConfirmation(false);
      setDeletingUserEmail(null);
      
    } catch (err) {
      console.error('Error deleting user:', err.message);
      alert(`Failed to delete user: ${err.message}`);
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

  const fetchRooms = async () => {
    try {
      const response = await fetch(ENDPOINT_ROOMS_GET, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(Array.isArray(data) ? data : (data.rooms || []));
    } catch (err) {
      console.error('Error loading rooms:', err.message);
      // Not setting the main error state to avoid disrupting the UI
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!newRoomName.trim()) {
      alert("Please enter a room name");
      return;
    }
    
    try {
      setCreatingRoom(true);
      
      // Only sending the name since the backend handles roomId, players array, and createdAt
      const roomData = {
        name: newRoomName.trim()
      };
      
      const response = await fetch(ENDPOINT_ROOMS_GET, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create room');
      }
      
      // Refresh the rooms list
      fetchRooms();
      
      // Reset and close the modal
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
      // Make sure the URL format matches what your backend expects
      // Your backend expects roomId as a path parameter
      const response = await fetch(`${ENDPOINT_ROOMS_DELETE}/${deletingRoomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete room');
      }
      
      // Remove the deleted room from the state
      setRooms(rooms.filter(room => (room.roomId || room.id) !== deletingRoomId));
      
      // Close the confirmation modal
      setShowDeleteConfirmation(false);
      setDeletingRoomId(null);
      
    } catch (err) {
      console.error('Error deleting room:', err.message);
      alert(`Failed to delete room: ${err.message}`);
    }
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h2>MusiQuiz</h2>
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
            {activeTab === 'questions' && 'Quiz Questions'}
            {activeTab === 'rooms' && 'Room Management'}
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
              <div className="stat-card">
                <h3>Rooms</h3>
                <p className="stat-value">{Array.isArray(rooms) ? rooms.length : 0}</p>
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
                            <button className="action-button delete-button" onClick={() => confirmDeleteUser(user.email)}>Delete</button>
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
              <QuestionsManager/>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="admin-rooms">
              <div className="admin-toolbar">
                <button className="admin-button" onClick={() => setShowRoomModal(true)}>Create New Room</button>
                <div className="admin-search">
                  <input type="text" placeholder="Search rooms..." />
                </div>
              </div>

              {loading ? (
                <div className="admin-loading">Loading rooms...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Room ID</th>
                      <th>Name</th>
                      <th>Players</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(rooms) && rooms.length > 0 ? (
                      rooms.map((room) => (
                        <tr key={room.id || room.roomId}>
                          <td>{room.id || room.roomId}</td>
                          <td>{room.name || '-'}</td>
                          <td>
                            {Array.isArray(room.players) && room.players.length > 0 ? (
                              <div className="player-list">
                                <span className="player-count">{room.players.length}</span>
                                <div className="player-tooltip">
                                  <ul>
                                    {room.players.map((player, index) => (
                                      <li key={index}>{player.name || player.email || player}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : (
                              <span className="no-players">No players</span>
                            )}
                          </td>
                          <td><span className={`status-badge ${room.status?.toLowerCase() || 'inactive'}`}>{room.status || 'Inactive'}</span></td>
                          <td>{room.createdBy || '-'}</td>
                          <td>{room.createdAt ? new Date(room.createdAt).toLocaleString() : '-'}</td>
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
                        <td colSpan="7" className="no-data">No rooms found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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

      {/* Delete User Confirmation Modal */}
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
      {/* Room Creation Modal */}
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

      {/* Delete Room Confirmation Modal */}
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