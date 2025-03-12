import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Dashboard.css';
import { ENDPOINT_ROOMS, ENDPOINT_ROOMS_LEAVE } from './endpoints';
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

  const handleJoinRoom = async () => {
    if (!selectedRoom) {
      alert('Please select a room to join.');
      return;
    }
    
    try {
      const response = await fetch(`https://6jdz3s8jrh.execute-api.eu-north-1.amazonaws.com/rooms/${selectedRoom.roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
  
      if (!response.ok) {
        throw new Error('Failed to join room');
      }
  
      const updatedRoom = await response.json();
      
      // Update the selected room with the latest data
      setSelectedRoom(updatedRoom);
      
      // Update the room in the rooms list
      setRooms(prevRooms => prevRooms.map(room => 
        room.roomId === updatedRoom.roomId ? updatedRoom : room
      ));
      
      // Set room joined state
      setRoomJoined(true);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!confirm('Are you sure you want to leave this room?')) {
      return;
    }
    
    try {
      // Log for debugging
      console.log('Attempting to leave room:', selectedRoom.roomId);
      
      const response = await fetch(`https://6jdz3s8jrh.execute-api.eu-north-1.amazonaws.com/rooms/${selectedRoom.roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // No need to send token in body since it's already in headers
        body: JSON.stringify({}) 
      });
  
      // Log the response for debugging
      console.log('Leave room response status:', response.status);
      
      // For more detailed error information
      const responseData = await response.json().catch(() => ({}));
      console.log('Response data:', responseData);
  
      if (!response.ok) {
        throw new Error(`Failed to leave room: ${responseData.error || response.statusText}`);
      }
  
      // Update rooms list
      fetchRooms();
      
      // Reset room joined state
      setRoomJoined(false);
    } catch (error) {
      console.error('Error leaving room:', error);
      alert(`Failed to leave room: ${error.message}`);
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
                  <h3>The quiz will start soon</h3>
                  <p>As soon as two players have joined the room, the quiz is ready to start.</p>
                  <p>Press the button below to begin:</p>
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
      selectedRoom.players.map((player, index) => {
        // Get email for comparison
        const playerEmail = typeof player === 'object' ? player.email : player;
        // Check if this player is the current user
        const isCurrentUser = playerEmail === user?.email;
        
        // Display name logic - use firstName for current user
        let displayName;
        if (isCurrentUser) {
          displayName = user?.firstName || user?.email?.split('@')[0];
        } else {
          // For other players, try to format the email nicely
          if (typeof player === 'object') {
            displayName = player.name || player.firstName || player.email;
          } else {
            // If it's just a string (email), get the part before @
            displayName = player.split('@')[0];
          }
        }
        
        return (
          <li key={index} className={`player-item ${isCurrentUser ? 'current-user' : ''}`}>
            {displayName}
            {isCurrentUser && ' (You)'}
          </li>
        );
      })
    ) : (
      <li className="no-players">Waiting for other players to join...</li>
    )}
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