import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Dashboard.css';
import { ENDPOINT_ROOMS } from './endpoints';
import Chat from './Chat';

function Dashboard() {
  const { user, logout, token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomJoined, setRoomJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'MusiQuiz - Dashboard';
    fetchRooms();
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

  const handleJoinRoom = () => {
    if (!selectedRoom) {
      alert('Please select a room to join.');
      return;
    }
    
    // Here you would typically make an API call to join the room
    // For now, we'll just simulate joining
    setRoomJoined(true);
  };

  const handleLeaveRoom = () => {
    if (confirm('Are you sure you want to leave this room?')) {
      // Here you would make an API call to leave the room
      setRoomJoined(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src="/logo_small.png" alt="MusiQuiz logo" className="header-logo" />
        <div className="user-info">
          <span>Welcome, {user?.firstName || user?.email?.split('@')[0]}!</span>
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        {!roomJoined ? (
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
                          <div className="room-footer">
                            <span className="creation-date">
                              {room.createdAt ? new Date(room.createdAt).toLocaleDateString() : ''}
                            </span>
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
                    disabled={!selectedRoom}
                  >
                    Join Room
                  </button>
                  <button 
                    className="refresh-button"
                    onClick={fetchRooms}
                  >
                    Refresh Rooms
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="quiz-container">
            <div className="quiz-header">
              <h2>Room: {selectedRoom?.name}</h2>
              <button onClick={handleLeaveRoom} className="leave-button">Leave Room</button>
            </div>
            
            <div className="room-content">
              <div className="room-main-area">
                <div className="quiz-placeholder">
                  <h3>Quiz Will Start Soon</h3>
                  <p>Waiting for the quiz to begin. The host will start the quiz once enough players have joined.</p>
                  <p>Get ready to test your music knowledge!</p>
                </div>
                
                {/* Chat Component integrated here */}
                <div className="room-chat">
                  <h3>Chat</h3>
                  <Chat />
                </div>
              </div>
              
              <div className="players-section">
                <h3>Players in Room</h3>
                <ul className="players-list">
                  {Array.isArray(selectedRoom?.players) && selectedRoom.players.length > 0 ? (
                    selectedRoom.players.map((player, index) => (
                      <li key={index} className="player-item">
                        {typeof player === 'object' ? player.name || player.email : player}
                      </li>
                    ))
                  ) : (
                    <li className="no-players">Waiting for other players to join...</li>
                  )}
                  {/* Current user is always shown */}
                  <li className="player-item current-user">
                    {user?.firstName || user?.email?.split('@')[0]} (You)
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 MusiQuiz. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Dashboard;