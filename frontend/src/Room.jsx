import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ENDPOINT_ROOMS, ENDPOINT_ROOM_CONNECTIONS } from './endpoints';
import Chat from './Chat';
import QuizTime from './QuizTime';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    document.title = `Room - MusiQuiz`;
    joinRoomAndFetchData();
    
    // Set up WebSocket for room updates
    const roomUpdateWs = new WebSocket(ENDPOINT_ROOM_CONNECTIONS);
    
    roomUpdateWs.onopen = () => {
      console.log('Room update WebSocket connected');
    };
    
    roomUpdateWs.onmessage = (event) => {
      try {
        console.log('WebSocket message received in Room:', event.data);
        const data = JSON.parse(event.data);
        
        // Only handle room update messages for this room
        if (data.type === "roomUpdate" && data.roomId === roomId) {
          console.log('Room update received:', data);
          
          // Make sure data.room contains the updated room information
          if (data.room) {
            console.log('Updating room with:', data.room);
            setRoom(data.room);
            
            // Add a notification (optional)
            if (data.action === "join" && data.user) {
              const userName = data.user.firstName || data.user.email?.split('@')[0] || "Someone";
              console.log(`${userName} joined the room`);
            }
          }
        }
      } catch (error) {
        console.error('Error processing room update:', error);
      }
    };
    
    roomUpdateWs.onerror = (error) => {
      console.error('Room update WebSocket error:', error);
    };
    
    setWs(roomUpdateWs);
    
    return () => {
      console.log('Closing room update WebSocket');
      roomUpdateWs.close();
    };
  }, [roomId, token]);

  // Poll for room updates as fallback
  useEffect(() => {
    if (!room) return;
    
    // Poll for room updates every 5 seconds as a fallback
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const roomData = await response.json();
          console.log('Polling received updated room data:', roomData);
          setRoom(roomData);
        }
      } catch (error) {
        console.error('Error polling room data:', error);
      }
    }, 5000); // 5 seconds
    
    return () => clearInterval(intervalId);
  }, [roomId, token, room]);

  const joinRoomAndFetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First try to join the room
      const joinResponse = await fetch(`${ENDPOINT_ROOMS}/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
      
      const joinData = await joinResponse.json();
      
      if (!joinResponse.ok) {
        // Special case: User is already in the room
        if (joinResponse.status === 400 && joinData.error === "You are already in this room." && joinData.room) {
          console.log('User is already in this room, proceeding with existing room data');
          setRoom(joinData.room);
          setLoading(false);
          return;
        }
        
        throw new Error(joinData.error || 'Failed to join room');
      }
      
      // Successfully joined
      setRoom(joinData);
      setLoading(false);
      
    } catch (err) {
      console.error('Error joining/fetching room:', err);
      setError(err.message || 'Error accessing this room');
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!confirm('Are you sure you want to leave this room?')) {
      return;
    }
    
    try {
      const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to leave room: ${errorData.error || response.statusText}`);
      }
      
      // Navigate back to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error leaving room:', error);
      alert(`Failed to leave room: ${error.message}`);
    }
  };
  useEffect(() => {
    // Log detected duplicates
    if (room?.players) {
      console.log('Player list:', room.players);
      const emails = room.players.map(p => typeof p === 'object' ? p.email : p);
      const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
      if (duplicates.length > 0) {
        console.warn('Duplicate players found:', duplicates);
      }
    }
  }, [room?.players]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  if (loading) {
    return <div className="loading-screen">Loading room...</div>;
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  if (quizStarted) {
    return <QuizTime roomData={room} />;
  }

  return (
    <div className='dashboard-container'>
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
    <div className="room-container">
        
      <header className="room-header">
        <h1>Room: {room?.name}</h1>
        <div className="user-info">
          <button onClick={handleLeaveRoom} className="leave-button">Leave Room</button>
        </div>
      </header>
      
      <div className="room-content">
        <div className="room-main-area">
          <div className="quiz-placeholder">
            <h3>The quiz will start soon</h3>
            <p>As soon as two players have joined the room, the quiz is ready to start.</p>
            
            {Array.isArray(room?.players) && room.players.length >= 2 ? (
              <div className="start-quiz-container">
                <p>All set! You can now start the quiz.</p>
                <button className="start-quiz-button" onClick={handleStartQuiz}>
                  Start Quiz
                </button>
              </div>
            ) : (
              <p>Waiting for at least one more player to join...</p>
            )}
          </div>
          
          <div className="room-chat">
            <h3>Room Chat</h3>
            <Chat roomId={roomId} />
          </div>
        </div>
        
        <div className="players-section">
          <h3>Players in Room</h3>
          <ul className="players-list">
  {Array.isArray(room?.players) && room.players.length > 0 ? (
    // First deduplicate the players array by email
    Array.from(
      new Map(
        room.players.map(player => {
          const email = typeof player === 'object' ? player.email : player;
          return [email, player];
        })
      ).values()
    ).map((player, index) => {
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
    </div>
    </div>
  );
}

export default Room;