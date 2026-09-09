import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';
import HamburgerMenu from '../components/HamburgerMenu';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    firstName: '',
    lastName: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [updating, setUpdating] = useState(false);

  // Initialise user settings from metadata
  useEffect(() => {
    if (user) {
      setUserSettings(prev => ({
        ...prev,
        firstName: user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || '',
        lastName: user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || ''
      }));
    }
  }, [user]);



  // Handle user settings change
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setUserSettings({
      ...userSettings,
      [name]: value
    });
  };
  
  // Update user information using Supabase
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (userSettings.newPassword && userSettings.newPassword !== userSettings.confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setUpdating(true);
    const toastId = toast.loading('Updating your information...', {
      closeButton: true
    });
    
    try {
      // Update user metadata
      const updates = {
        data: {
          first_name: userSettings.firstName,
          last_name: userSettings.lastName
        }
      };

      // Update password if provided
      if (userSettings.newPassword) {
        updates.password = userSettings.newPassword;
      }

      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) throw updateError;
      
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
      
      setTimeout(() => setShowUserSettings(false), 1500);
      
    } catch (error) {
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
  
  // FIXED: Single useEffect for all user-dependent operations including real-time subscriptions
  useEffect(() => {
    if (!user) return;

    document.title = 'MusiQuiz - Dashboard';
    
    // Initialize data fetching
    fetchRooms();
    checkUserInRoom();
    fetchUserStats();

    // Set up single real-time subscription for room changes
    const roomSubscription = supabase
      .channel('dashboard_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
        },
        (payload) => {
          setRooms(prevRooms => {
            const updatedRooms = [...prevRooms];
            const updatedRoomIndex = updatedRooms.findIndex(room => room.room_id === payload.new.room_id);

            if (updatedRoomIndex !== -1) {
              const updatedRoom = {
                ...updatedRooms[updatedRoomIndex],
                players: payload.new.players || [],
              };
              const activePlayers = Array.isArray(updatedRoom.players) ? updatedRoom.players.filter(p => p.is_active) : [];
              updatedRoom.playerCount = activePlayers.length;
              updatedRooms[updatedRoomIndex] = updatedRoom;
            }

            return updatedRooms;
          });
        }
      )
      .subscribe();

    // Cleanup function to properly unsubscribe when component unmounts or user changes
    return () => {
      supabase.removeChannel(roomSubscription);
    };
  }, [user]);

  // Fetch rooms from Supabase - FIXED VERSION
  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Fetch all rooms and include the players array
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('room_id, name, created_at, game_started, players');

      if (roomsError) throw roomsError;

      // Transform the data to include player count
      const roomsWithPlayerCount = roomsData.map((room) => {
      const players = Array.isArray(room.players) ? room.players : [];
      const activePlayers = players.filter(p => 
        p.is_active && 
        p.last_active && 
        new Date(p.last_active) > new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
      );
      
      return {
        ...room,
        roomId: room.room_id,
        playerCount: activePlayers.length,
        players: activePlayers,
      };
    });

      setRooms(roomsWithPlayerCount || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUserInRoom = async () => {
    if (!user) return;

    try {
      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('room_id, name, players')
        .filter('players', 'cs', JSON.stringify([{ user_id: user.id }]));

      if (error) throw error;

      const userRoom = roomsData?.find(room => {
        const players = Array.isArray(room.players) ? room.players : [];
        return players.some(player => player.user_id === user.id && player.is_active);
      });

      if (userRoom) {
        setActiveRoom({ roomId: userRoom.room_id, name: userRoom.name });
        setShowRoomWarning(true);
      }
    } catch (error) {
      console.error('Error checking if user is in room:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle joining room with Supabase
  const handleJoinRoom = async () => {
  if (!selectedRoom) {
    toast.warning('Please select a room to join.', {
      closeButton: true
    });
    return;
  }

  setJoiningRoom(true);

  try {
    const roomId = selectedRoom.roomId;

    // Fetch the current room data
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('players')
      .eq('room_id', roomId)
      .single();

    if (fetchError) throw fetchError;

    // Ensure currentPlayers is always an array
    const currentPlayers = Array.isArray(room.players) ? room.players : [];

    // Check if user already exists and is active
    const existingPlayer = currentPlayers.find(p => p.user_id === user.id);
    if (existingPlayer) {
      // If player exists but is inactive, update their activity status
      if (!existingPlayer.is_active || 
          !existingPlayer.last_active || 
          new Date(existingPlayer.last_active) < new Date(Date.now() - 30 * 60 * 1000)) {
        
        const updatedPlayers = currentPlayers.map(player =>
          player.user_id === user.id
            ? {
                ...player,
                is_active: true,
                last_active: new Date().toISOString(),
                rejoined_at: new Date().toISOString() // Optional: track rejoins
              }
            : player
        );

        const { error: updateError } = await supabase
          .from('rooms')
          .update({ players: updatedPlayers })
          .eq('room_id', roomId);

        if (updateError) throw updateError;

        toast.success('Welcome back to the room!');
        navigate(`/rooms/${roomId}`);
        return;
      } else {
        toast.info('You are already in this room!');
        return;
      }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const updatedPlayers = [
      ...currentPlayers,
      {
        user_id: user.id,
        email: user.email,
        first_name: profile?.first_name || userSettings.firstName || '',
        last_name: profile?.last_name || userSettings.lastName || '',
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString(), // Add activity tracking
        is_active: true, // Add activity status
        // Optional: add display_name for easier rendering
        display_name: profile?.first_name || userSettings.firstName || user.email.split('@')[0]
      }
    ];

    // Update the room with the new players array
    const { error } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers })
      .eq('room_id', roomId);

    if (error) throw error;

    toast.success('Successfully joined the room!');
    navigate(`/rooms/${roomId}`);
  } catch (error) {
    console.error('Error joining room:', error);
    toast.error('Failed to join room: ' + error.message);
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

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('stats')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;

      if (!userData) {
        setStats({
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
          bestCategory: null,
          bestCategoryAccuracy: 0,
          categoryStats: {}
        });
        return;
      }

      const stats = userData.stats || {
        gamesPlayed: 0,
        gamesWon: 0,
        categories: {}
      };

      if (!stats || Object.keys(stats).length === 0) {
        setStats({
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          winRate: 0,
          bestCategory: null,
          bestCategoryAccuracy: 0,
          categoryStats: {}
        });
        return;
      }

      // Calculate derived values
      const gamesPlayed = stats.gamesPlayed || 0;
      const gamesWon = stats.gamesWon || 0;
      const gamesLost = gamesPlayed - gamesWon;
      const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

      let bestCategory = null;
      let bestCategoryAccuracy = 0;

      Object.keys(stats.categories || {}).forEach(category => {
        const categoryData = stats.categories[category];
        const accuracy = categoryData.total > 0
          ? Math.round((categoryData.correct / categoryData.total) * 100)
          : 0;
        if (accuracy > bestCategoryAccuracy) {
          bestCategoryAccuracy = accuracy;
          bestCategory = category;
        }
      });

      setStats({
        gamesPlayed,
        gamesWon,
        gamesLost,
        winRate,
        bestCategory,
        bestCategoryAccuracy,
        categoryStats: stats.categories || {}
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Unable to load your stats. Please try again later.', {
        closeButton: true,
        autoClose: 5000
      });
    }
  };

  // Handle logout with Supabase
  const handleLogout = async () => {
    const toastId = toast.info('Logging out...', { 
      autoClose: 2000,
      closeButton: true
    });
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.dismiss(toastId);
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out: ' + error.message);
    }
  };

  if (!user) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src="/logo_text_clear.png" alt="MusiQuiz logo" className="header-logo" />
        <div className="user-info">
          <span>Welcome, {userSettings.firstName || user?.email?.split('@')[0]}!</span>
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
        {/* Welcome Message Card */}
  <div className="welcome-card">
    <div className="welcome-icon">🎵</div>
    <div className="welcome-text">
      <h3>Welcome back!</h3>
      <p>Ready for another round? Pick a room, challenge your friends, and see if you can beat your high score.</p>
    </div>
  </div>
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
                            {room.playerCount} players
                          </span>
                          {room.status && <span className="room-status">{room.status}</span>}
                        </div>
                        <div className="room-actions-mobile">
                          <button
                            className="join-room-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoom(room);
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
                    
                    {stats.categoryStats && Object.keys(stats.categoryStats).length > 0 && (
                      <div className="category-breakdown">
                        <h4>Categories Breakdown</h4>
                        <div className="category-chart">
                          {Object.entries(stats.categoryStats)
                            .map(([category, catStats]) => {
                              const accuracy = catStats.total > 0 
                                ? Math.round((catStats.correct / catStats.total) * 100)
                                : 0;
                              
                              return {
                                category,
                                catStats,
                                accuracy
                              };
                            })
                            .sort((a, b) => b.accuracy - a.accuracy)
                            .map(({ category, catStats, accuracy }) => (
                              <div className="category-bar-container" key={category}>
                                <div className="category-name">{category}</div>
                                <div className="category-bar-wrapper">
                                  <div 
                                    className="category-bar" 
                                    style={{ width: `${accuracy}%` }}
                                  ></div>
                                  <span className="category-accuracy">{accuracy}%</span>
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
        <p>&copy; 2026 MusiQuiz. All rights reserved.</p>
        <p>21/5/2026 - Version 1.2.0 changelog:</p>
        <ul>
          <li> - Notifications (e.g., &quot;You have joined the room&quot;) now stay on screen longer</li>
          <li> - The app loads faster thanks to background optimizations</li>
          <li> - The Join Room button is now only visible inside each room, not as an extra button below the list</li>
        </ul>
        <p>5/11/2025 - Version 1.1.0 changelog:</p>
        <ul>
          <li> - Players in rooms are now displayed with their status (active/inactive)</li>
          <li> - Host has a fancy crown icon next to their name</li>
        </ul>
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