import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ENDPOINT_ROOMS } from './endpoints';
import Chat from './Chat';
import QuizTime from './QuizTime';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, logout, token, isAuthenticated } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }
    
    document.title = `Room - MusiQuiz`;
    fetchRoomData();
  }, [roomId, token, isAuthenticated, navigate]);

  // Poll for room updates
  useEffect(() => {
    if (!room) return;
    
    // Poll for room updates every 3 seconds
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          // Handle expired tokens
          if (response.status === 401) {
            logout();
            return;
          }
          throw new Error('Failed to fetch room data');
        }
        
        const roomData = await response.json();
        console.log('Polling received updated room data:', roomData);
        
        // Check if the game has started
        if (roomData.gameStarted && !quizStarted) {
          setQuizStarted(true);
        }
        
        setRoom(roomData);
      } catch (error) {
        console.error('Error polling room data:', error);
      }
    }, 3000); // 3 seconds for more responsive updates
    
    return () => clearInterval(intervalId);
  }, [roomId, token, room, quizStarted, logout]);

  const fetchRoomData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch the room data
      const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Handle expired tokens
        if (response.status === 401) {
          logout();
          return;
        }
        
        // Handle not found or other errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch room data');
      }
      
      const roomData = await response.json();
      
      // Check if user is in this room
      const isInRoom = roomData.players?.some(player => {
        const playerEmail = typeof player === 'object' ? player.email : player;
        return playerEmail === user?.email;
      });
      
      if (!isInRoom) {
        // User is not in this room, redirect back to dashboard
        navigate('/dashboard');
        return;
      }
      
      // Set room data
      setRoom(roomData);
      setLoading(false);
      
    } catch (err) {
      console.error('Error fetching room:', err);
      setError(err.message || 'Error accessing this room');
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    const userConfirmed = window.confirm('Are you sure you want to leave this room?');
    if (!userConfirmed) {
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
      
      if (response.status === 401) {
        // Token expired or invalid
        console.log('Token expired. Redirecting to login.');
        navigate('/');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to leave room: ${errorData.error || response.statusText}`);
      }
      
      // Navigate back to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error leaving room:', error);
      
      // Check if the error is related to authorization
      if (error.message && error.message.toLowerCase().includes('unauthorized')) {
        console.log('Token appears to be invalid. Redirecting to login.');
        navigate('/');
        return;
      }
      
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

  const amIFirstPlayer = () => {
    if (!room?.players || room.players.length === 0) return false;
    
    const firstPlayer = room.players[0];
    const firstPlayerEmail = typeof firstPlayer === 'object' ? firstPlayer.email : firstPlayer;
    
    return firstPlayerEmail === user?.email;
  };

  const handleStartQuiz = async () => {
    try {
      const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to start quiz");
      }
      
      // Navigate to the game route instead of just changing state
      navigate(`/game/${roomId}`);
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("Failed to start the quiz: " + error.message);
    }
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
                <p>All set! {amIFirstPlayer() ? 'You can now start the quiz.' : 'Waiting for the host to start the quiz.'}</p>
                
                {amIFirstPlayer() && (
                  <button className="start-quiz-button" onClick={handleStartQuiz}>
                    Start Quiz
                  </button>
                )}
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
  );
}

export default Room;