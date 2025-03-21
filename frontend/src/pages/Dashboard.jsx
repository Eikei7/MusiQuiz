import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Dashboard.css';
import { ENDPOINT_ROOMS, ENDPOINT_USERS_STATS, ENDPOINT_USERS_UPDATE } from '../endpoints';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0, 
    gamesLost: 0,
    winRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showRoomWarning, setShowRoomWarning] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);

  // User settings state
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [userSettings, setUserSettings] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setUserSettings({
      ...userSettings,
      [name]: value
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');
    
    // Basic validation
    if (userSettings.newPassword && userSettings.newPassword !== userSettings.confirmNewPassword) {
      setUpdateError('New passwords do not match');
      return;
    }
    
    setUpdating(true);
    
    try {
      const response = await fetch(ENDPOINT_USERS_UPDATE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: userSettings.firstName,
          lastName: userSettings.lastName,
          currentPassword: userSettings.currentPassword,
          newPassword: userSettings.newPassword || undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user information');
      }
      
      setUpdateSuccess('Your information has been updated successfully');
      
      // Clear password fields
      setUserSettings({
        ...userSettings,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      
    } catch (error) {
      setUpdateError(error.message || 'An error occurred while updating your information');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    document.title = 'MusiQuiz - Dashboard';
    fetchRooms();
    checkUserInRoom();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(ENDPOINT_ROOMS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      const roomsArray = Array.isArray(data) ? data : (data.rooms || []);
      setRooms(roomsArray);
      setError('');
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Unable to load rooms. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  const checkUserInRoom = async () => {
    try {
      const response = await fetch(ENDPOINT_ROOMS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const roomsArray = Array.isArray(data) ? data : (data.rooms || []);
        
        // Check if user is in any room
        for (const room of roomsArray) {
          if (Array.isArray(room.players)) {
            const userInRoom = room.players.some(player => {
              const playerEmail = typeof player === 'object' ? player.email : player;
              return playerEmail === user?.email;
            });
            
            if (userInRoom) {
              setActiveRoom({
                roomId: room.roomId || room.id,
                name: room.name
              });
              setShowRoomWarning(true);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking if user is in room:', error);
    } finally {
      setIsChecking(false);
    }
  };
  const handleJoinRoom = async () => {
    if (!selectedRoom) {
      alert('Please select a room to join.');
      return;
    }
    
    try {
      setJoiningRoom(true);
      
      // Make the API call to join the room
      const response = await fetch(`${ENDPOINT_ROOMS}/${selectedRoom.roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      // Check if the response is successful or the user is already in the room
      if (response.ok || (response.status === 400 && data.error === "You are already in this room.")) {
        // Navigate to the room page
        navigate(`/rooms/${selectedRoom.roomId}`);
      } else {
        throw new Error(data.error || 'Failed to join room');
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      alert(`Failed to join room: ${error.message}`);
    } finally {
      setJoiningRoom(false);
    }
  };
  const handleGoToRoom = () => {
    if (activeRoom && activeRoom.roomId) {
      navigate(`/rooms/${activeRoom.roomId}`);
    }
    setShowRoomWarning(false);
  };

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch(ENDPOINT_USERS_STATS, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        
        const data = await response.json();
        setStats(data.stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [token]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src="/logo_text_clear.png" alt="MusiQuiz logo" className="header-logo" />
        <div className="user-info">
          <span>Welcome, {user?.firstName || user?.email?.split('@')[0]}!</span>
          <button onClick={() => setShowUserSettings(true)} className="settings-button">
            Settings
          </button>
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="room-selection">
          <h2>Join a Quiz Room</h2>
          
          {loading ? (
            <div className="loading-message">Loading rooms...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="room-list">
                <h3>Available Rooms:</h3>
                
                {rooms.length > 0 ? (
                  <div className="rooms-grid">
                    {rooms.map(room => (
                      <div 
                        key={room.roomId || room.id}
                        className={`room-card ${selectedRoom?.roomId === (room.roomId || room.id) ? 'selected' : ''}`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <h4>{room.name}</h4>
                        <div className="room-info">
                          <span className="player-count">
                            {Array.isArray(room.players) ? room.players.length : 0} players
                          </span>
                          {room.status && <span className="room-status">{room.status}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-rooms">
                    <p>No rooms available. Try again later or ask an admin to create a room.</p>
                  </div>
                )}
              </div>
              
              <div className="room-actions">
                <button 
                  className="join-room-button"
                  onClick={handleJoinRoom}
                  disabled={!selectedRoom || joiningRoom}
                >
                  {joiningRoom ? 'Joining...' : 'Join Room'}
                </button>
                <button 
                  className="refresh-button"
                  onClick={fetchRooms}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Rooms'}
                </button>
              </div>
              
              {/* User Stats Section */}
              <div className="user-stats-section">
                <h2>Your Stats</h2>
                <div className="stats-container">
                  <div className="stat-card">
                    <div className="stat-value">{stats.gamesPlayed}</div>
                    <div className="stat-label">Total Quizzes Played</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.gamesWon}</div>
                    <div className="stat-label">Times Won</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.gamesLost}</div>
                    <div className="stat-label">Times Lost</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.winRate}%</div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {showUserSettings && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>User Settings</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowUserSettings(false)}
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  {updateError && <div className="error-message">{updateError}</div>}
                  {updateSuccess && <div className="success-message">{updateSuccess}</div>}
                  
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={userSettings.firstName}
                      onChange={handleSettingsChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={userSettings.lastName}
                      onChange={handleSettingsChange}
                    />
                  </div>
                  
                  <div className="password-section">
                    <h3>Change Password</h3>
                    
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password</label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={userSettings.currentPassword}
                        onChange={handleSettingsChange}
                        autoComplete="current-password"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={userSettings.newPassword}
                        onChange={handleSettingsChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmNewPassword">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        value={userSettings.confirmNewPassword}
                        onChange={handleSettingsChange}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowUserSettings(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 MusiQuiz. All rights reserved.</p>
      </footer>
      {showRoomWarning && (
  <div className="modal-overlay">
    <div className="modal-container">
      <div className="modal-header">
        <h2>You're Still in a Room</h2>
      </div>
      <div className="modal-body">
        <p>You're currently in the room "{activeRoom.name}". You should leave the room first before using the dashboard.</p>
      </div>
      <div className="modal-footer">
        <button 
          className="btn btn-primary"
          onClick={handleGoToRoom}
        >
          Return to Room
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default Dashboard;