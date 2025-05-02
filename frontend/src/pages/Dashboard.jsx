import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Dashboard.css';
import { ENDPOINT_ROOMS, ENDPOINT_USERS_STATS, ENDPOINT_USERS_UPDATE } from '../endpoints';
import HamburgerMenu from '../components/HamburgerMenu';
// Import toast from react-toastify
import { toast } from 'react-toastify';
// Add the CSS import
import 'react-toastify/dist/ReactToastify.css';

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
  const [updating, setUpdating] = useState(false);

  // Add cleanup effect for toasts when component unmounts
  useEffect(() => {
    return () => {
      // Dismiss all toasts when component unmounts
      toast.dismiss();
    };
  }, []);

  // Handle user settings change
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setUserSettings({
      ...userSettings,
      [name]: value
    });
  };
  
  // Update user information with fixed toast handling
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (userSettings.newPassword && userSettings.newPassword !== userSettings.confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setUpdating(true);
    
    // Show a loading toast that we'll update based on the result
    // Add closeButton to ensure it can be manually closed if stuck
    const toastId = toast.loading('Updating your information...', {
      closeButton: true
    });
    
    // Make the API call to update user information
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
      
      // Update toast to success with a small delay to ensure toast is initialized
      setTimeout(() => {
        toast.update(toastId, {
          render: 'Your information has been updated successfully',
          type: 'success',
          isLoading: false,
          autoClose: 3000,
          closeButton: true
        });
      }, 100);
      
      // Clear password fields
      setUserSettings({
        ...userSettings,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      
      // Close the settings modal after successful update
      setTimeout(() => setShowUserSettings(false), 1500);
      
    } catch (error) {
      // Update toast to error with delay
      setTimeout(() => {
        toast.update(toastId, {
          render: error.message || 'An error occurred while updating your information',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          closeButton: true
        });
      }, 100);
    } finally {
      setUpdating(false);
    }
  };
  
  useEffect(() => {
    document.title = 'MusiQuiz - Dashboard';
    fetchRooms();
    checkUserInRoom();
  }, []);
  // Fetch rooms from API
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
      
      // Show a success toast when rooms are refreshed
      if (!loading) { // Don't show on initial load
        toast.success('Rooms refreshed successfully', {
          closeButton: true,
          autoClose: 3000
        });
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Unable to load rooms. Please try again later.');
      
      // Show an error toast
      toast.error('Unable to load rooms. Please try again later.', {
        closeButton: true,
        autoClose: 5000
      });
    } finally {
      setLoading(false);
    }
  };
  // Check if user is in any room
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
      toast.warning('Please select a room to join.', {
        closeButton: true
      });
      return;
    }
    
    try {
      setJoiningRoom(true);
      
      // Show a loading toast with closeButton
      const toastId = toast.loading(`Joining room: ${selectedRoom.name}...`, {
        closeButton: true
      });
      
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
        // Update toast to success with small delay
        setTimeout(() => {
          toast.update(toastId, {
            render: `Successfully joined ${selectedRoom.name}!`,
            type: 'success',
            isLoading: false,
            autoClose: 4000,
            closeButton: true
          });
        }, 100);
        
        // Navigate to the room page
        navigate(`/rooms/${selectedRoom.roomId}`);
      } else {
        throw new Error(data.error || 'Failed to join room');
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      
      // Add timeout to ensure previous toast is dismissed
      setTimeout(() => {
        // Show error toast
        toast.error(`Failed to join room: ${error.message}`, {
          closeButton: true,
          autoClose: 5000
        });
      }, 200);
    } finally {
      setJoiningRoom(false);
    }
  };
  // Handle navigation to room
  const handleGoToRoom = () => {
    if (activeRoom && activeRoom.roomId) {
      toast.info(`Returning to room: ${activeRoom.name}`, {
        closeButton: true,
        autoClose: 2000
      });
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
        
        // Show a toast notification for stats loading error
        toast.error('Unable to load your stats. Please try again later.', {
          closeButton: true,
          autoClose: 5000
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [token]);

  // Handle logout with toast notification
  const handleLogout = () => {
    const toastId = toast.info('Logging out...', { 
      autoClose: 2000,
      closeButton: true
    });
    
    // Add a safety mechanism to clear toasts if they get stuck
    setTimeout(() => {
      logout();
      toast.dismiss(toastId);
    }, 1500);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src="/logo_text_clear.png" alt="MusiQuiz logo" className="header-logo" />
        <div className="user-info">
          <span>Welcome, {user?.firstName || user?.email?.split('@')[0]}!</span>
          <button onClick={() => setShowUserSettings(true)} className="settings-button">
            Settings
          </button>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
        <HamburgerMenu 
          user={user} 
          logout={handleLogout} 
          onSettingsClick={() => setShowUserSettings(true)} 
        />
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
        
        {/* Mobile actions - only shown for selected room on small screens */}
        <div className="room-actions-mobile">
          <button 
            className="join-room-button"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the room selection
              handleJoinRoom();
            }}
            disabled={joiningRoom}
          >
            {joiningRoom ? 'Joining...' : 'Join Room'}
          </button>
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
  
  {stats.bestCategory && (
    <div className="category-stats-section">
      <h3>Category Performance</h3>
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{stats.bestCategory}</div>
          <div className="stat-label">Strongest Category</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.bestCategoryAccuracy}%</div>
          <div className="stat-label">Accuracy in Best Category</div>
        </div>
      </div>
      
      {/* Category breakdown */}
      {stats.categoryStats && Object.keys(stats.categoryStats).length > 0 && (
        <div className="category-breakdown">
          <h4>Categories Breakdown</h4>
          <div className="category-chart">
            {Object.entries(stats.categoryStats)
              // Sort categories by accuracy (highest to lowest)
              .sort((a, b) => b[1].accuracy - a[1].accuracy)
              .map(([category, catStats]) => (
                <div className="category-bar-container" key={category}>
                  <div className="category-name">{category}</div>
                  <div className="category-bar-wrapper">
                    <div 
                      className="category-bar" 
                      style={{ width: `${catStats.accuracy}%` }}
                    ></div>
                    <span className="category-accuracy">{catStats.accuracy}%</span>
                  </div>
                  <div className="category-count">{catStats.correct}/{catStats.total}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )}
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
        <p>You're currently in the room {activeRoom.name}. You should leave the room first before using the dashboard.</p>
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