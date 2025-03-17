import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Dashboard.css';
import { ENDPOINT_ROOMS, ENDPOINT_ROOM_CONNECTIONS } from './endpoints';
import Chat from './Chat';

function Dashboard() {
  const { user, logout, token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomJoined, setRoomJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ws, setWs] = useState(null);

  useEffect(() => {
    document.title = 'MusiQuiz - Dashboard';
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!roomJoined || !selectedRoom) return;
    
    const roomUpdateWs = new WebSocket(ENDPOINT_ROOM_CONNECTIONS);
    
    roomUpdateWs.onopen = () => {
      console.log('Room update WebSocket connected');
    };
    
    roomUpdateWs.onmessage = (event) => {
      try {
        console.log('WebSocket message received in Dashboard:', event.data);
        const data = JSON.parse(event.data);
        
        // Only handle room update messages
        if (data.type === "roomUpdate" && data.roomId === selectedRoom.roomId) {
          console.log('Room update received:', data);
          
          // Make sure data.room contains the updated room information
          if (data.room) {
            console.log('Updating selected room with:', data.room);
            
            // Update the selected room with the new data
            setSelectedRoom(data.room);
            
            // Also update this room in the rooms list
            setRooms(prevRooms => prevRooms.map(room => 
              room.roomId === data.roomId ? data.room : room
            ));
            
            // Add a notification (optional)
            if (data.action === "join" && data.user) {
              const userName = data.user.firstName || data.user.email?.split('@')[0] || "Someone";
              console.log(`${userName} joined the room`);
            }
          } else {
            console.error('Room update missing room data:', data);
          }
        }
      } catch (error) {
        console.error('Error processing room update:', error);
      }
    };
    
    roomUpdateWs.onerror = (error) => {
      console.error('Room update WebSocket error:', error);
    };
    
    return () => {
      console.log('Closing room update WebSocket');
      roomUpdateWs.close();
    };
  }, [roomJoined, selectedRoom?.roomId]);

  // Add this effect for polling room data as a fallback
useEffect(() => {
  if (!roomJoined || !selectedRoom) return;
  
  // Poll for room updates every 5 seconds as a fallback
  const intervalId = setInterval(async () => {
    try {
      const response = await fetch(`${ENDPOINT_ROOMS}/${selectedRoom.roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const roomData = await response.json();
        console.log('Polling received updated room data:', roomData);
        setSelectedRoom(roomData);
      }
    } catch (error) {
      console.error('Error polling room data:', error);
    }
  }, 5000); // 5 seconds
  
  return () => clearInterval(intervalId);
}, [roomJoined, selectedRoom?.roomId, token]);

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
  
      // Parse the JSON response first, so we can check for specific error messages
      const data = await response.json();
      
      if (!response.ok) {
        // Special case: User is already in the room
        if (response.status === 400 && data.error === "You are already in this room." && data.room) {
          console.log('User is already in this room, proceeding with existing room data');
          // User is already in the room, so we can just join with the returned room data
          setSelectedRoom(data.room);
          setRoomJoined(true);
          return;
        }
        
        // Handle other errors
        throw new Error(data.error || 'Failed to join room');
      }
  
      // If we got here, the join was successful
      // Update the selected room with the latest data
      setSelectedRoom(data);
      
      // Update the room in the rooms list
      setRooms(prevRooms => prevRooms.map(room => 
        room.roomId === data.roomId ? data : room
      ));
      
      // Set room joined state
      setRoomJoined(true);
    } catch (error) {
      console.error('Error joining room:', error);
      alert(`Failed to join room: ${error.message}`);
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
        <img src="/logo_text_clear.png" alt="MusiQuiz logo" className="header-logo" />
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
        
        {/* New User Stats Section */}
        <div className="user-stats-section">
          <h2>Your Stats</h2>
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Total Quizzes Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Times Won</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Times Lost</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0%</div>
              <div className="stat-label">Win Rate</div>
            </div>
          </div>
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
  
                  {Array.isArray(selectedRoom?.players) && selectedRoom.players.length >= 2 ? (
                  <div className="start-quiz-container">
                  <p>All set! You can now start the quiz.</p>
                  <button className="start-quiz-button" onClick={() => handleStartQuiz()}>
                    Start Quiz
                  </button>
                  </div>
                  ) : (
                  <p>Waiting for one more player to join...</p>
                  )}
                </div>
                
                {/* Chat Component integrated here */}
                <div className="room-chat">
                  <h3>Room Chat</h3>
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
        
        // Display name - handle both new and old format
        let displayName;
        if (typeof player === 'object' && player.firstName) {
          displayName = player.firstName;
        } else if (typeof player === 'object' && player.email) {
          displayName = player.email.split('@')[0];
        } else if (typeof player === 'string') {
          // Legacy format - just email
          displayName = player.split('@')[0];
        } else {
          displayName = "Unknown Player";
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