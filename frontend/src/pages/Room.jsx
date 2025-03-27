import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ENDPOINT_ROOMS, ENDPOINT_CHAT } from '../endpoints';
import Chat from '../components/Chat';
import QuizTime from './QuizTime';
import './RoomTransitions.css';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, logout, token, isAuthenticated } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [wsPlayers, setWsPlayers] = useState([]);
  
  // Add transition states
  const [isExiting, setIsExiting] = useState(false);
  const [transitionData, setTransitionData] = useState(null);

  useEffect(() => {
    if (room?.players) {
      // Initialize the WebSocket player list with the current room players
      const initialPlayers = Array.from(
        new Map(
          room.players.map(player => {
            const email = typeof player === 'object' ? player.email : player;
            let displayName;
            if (typeof player === 'object' && player.firstName) {
              displayName = player.firstName;
            } else if (typeof player === 'object' && player.email) {
              displayName = player.email.split('@')[0];
            } else if (typeof player === 'string') {
              displayName = player.split('@')[0];
            } else {
              displayName = "Unknown Player";
            }
            
            return [email, { email, displayName }];
          })
        ).values()
      );
      
      setWsPlayers(initialPlayers);
    }
  }, [room?.players]);

  // Handler for when a player joins via WebSocket
  const handlePlayerJoin = (playerName) => {
    console.log(`WebSocket notified that ${playerName} joined`);
    
    // Check if this player is already in our list to avoid duplicates
    if (!wsPlayers.some(p => p.displayName === playerName)) {
      setWsPlayers(prev => [...prev, { displayName: playerName, isNew: true }]);
    }
  };
  
  // Handler for when a player leaves via WebSocket
  const handlePlayerLeave = (playerName) => {
    console.log(`WebSocket notified that ${playerName} left`);
    
    // Remove the player from our list
    setWsPlayers(prev => prev.filter(p => p.displayName !== playerName));
  };

  useEffect(() => {
    if (wsPlayers.length > 0 && room) {
      // Only update if the player count has actually changed
      // This prevents infinite loops from updating the state constantly
      const currentPlayerCount = room.players?.length || 0;
      
      if (wsPlayers.length !== currentPlayerCount) {
        console.log('Updating room players from WebSocket data');
        
        // Update the room.players array based on wsPlayers
        setRoom(prevRoom => ({
          ...prevRoom,
          players: wsPlayers.map(player => ({
            email: player.email || player.displayName, // Fallback if email is missing
            firstName: player.displayName,
          }))
        }));
      }
    }
  }, [wsPlayers.length]);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/room/${roomId}` } });
      return;
    }
    
    document.title = `Room - MusiQuiz`;
    fetchRoomData();
  }, [roomId, token, isAuthenticated, navigate]);

  // Check if user is the first player (host)
  const amIFirstPlayer = () => {
    if (!room?.players || room.players.length === 0) return false;
    
    const firstPlayer = room.players[0];
    const firstPlayerEmail = typeof firstPlayer === 'object' ? firstPlayer.email : firstPlayer;
    
    return firstPlayerEmail === user?.email;
  };

  // Check for game started status (only for non-host players)
  useEffect(() => {
    // Skip this check if user is the host - let them press the button
    if (room && amIFirstPlayer()) {
      return;
    }
    
    const checkGameStarted = async () => {
      // Don't check if we've already started the transition
      if (isExiting || quizStarted) return;
      
      try {
        const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            logout();
            return;
          }
          return;
        }
        
        const roomData = await response.json();
        
        // Check if the game has started
        if (roomData.gameStarted && !quizStarted) {
          console.log('Game started detected, transitioning to game...');
          setTransitionData(roomData);
          // Use the same navigation pattern as the button click handler
          setIsExiting(true);
          setTimeout(() => {
            navigate(`/game/${roomId}`);
          }, 700);
        }
      } catch (error) {
        console.error('Error checking game status:', error);
      }
    };
    
    // Check every 5 seconds if game started (for non-host players)
    const intervalId = setInterval(checkGameStarted, 5000);
    
    return () => clearInterval(intervalId);
  }, [roomId, token, quizStarted, isExiting, logout, room, navigate, amIFirstPlayer, user?.email]);

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
      const emails = room.players.map(p => typeof p === 'object' ? p.email : p);
      const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
      if (duplicates.length > 0) {
        console.warn('Duplicate players found:', duplicates);
      }
    }
  }, [room?.players]);

  const handleStartQuiz = async () => {
    try {
      // First, start the exit transition
      setIsExiting(true);
      
      try {
        await fetch(`${ENDPOINT_CHAT}/gamestarted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            displayName: user.firstName || user.email.split('@')[0],
            roomId: roomId
          })
        });
      } catch (chatError) {
        console.log('Failed to send game started message, continuing anyway');
      }

      const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        setIsExiting(false); // Revert transition if there's an error
        throw new Error("Failed to start quiz");
      }
      
      // Process the response data
      let gameData;
      try {
        gameData = await response.json();
      } catch (e) {
        // If response isn't valid JSON, use the current room data
        console.log('Using current room data for transition');
        gameData = room;
      }
      
      // Ensure gameData has all the necessary player information
      if (!gameData.players && room.players) {
        gameData = {
          ...gameData,
          players: room.players
        };
      }
      
      // Store the data but won't use it directly
      setTransitionData(gameData);
      
      // After a short delay to allow the fade-out animation to play
      setTimeout(() => {
        // Navigate to the game route
        navigate(`/game/${roomId}`);
      }, 700); // Slightly shorter than the CSS transition to ensure smooth navigation
      
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("Failed to start the quiz: " + error.message);
      setIsExiting(false); // Revert transition
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

  return (
    <div className={`room-container ${isExiting ? 'fade-out' : 'fade-in'}`}>
      <header className="room-header">
        <h1>Room: {room?.name}</h1>
        <button 
          onClick={handleLeaveRoom} 
          className="leave-button"
          disabled={isExiting}
        >
          Leave Room
        </button>
      </header>
      
      <div className="room-content">
        <div className="room-main-area">
          <div className="quiz-placeholder">
            <h3>The quiz will start soon</h3>
            
            {Array.isArray(room?.players) && room.players.length >= 2 ? (
              <div className="start-quiz-container">
                <p>All set! {amIFirstPlayer() ? 'You can now start a two-player quiz.' : 'Waiting for the host to start the quiz.'}</p>
                
                {amIFirstPlayer() && (
                  <button 
                    className="start-quiz-button" 
                    onClick={handleStartQuiz}
                    disabled={isExiting}
                  >
                    {isExiting ? 'Starting...' : 'Start Multiplayer Quiz'}
                  </button>
                )}
              </div>
            ) : Array.isArray(room?.players) && room.players.length === 1 ? (
              <div className="start-quiz-container">
                <p>No other players have joined yet. You can still play in single-player mode!</p>
                <button 
                  className="start-quiz-button single-player" 
                  onClick={handleStartQuiz}
                  disabled={isExiting}
                >
                  {isExiting ? 'Starting...' : 'Start Single Player Game'}
                </button>
              </div>
            ) : (
              <p>Waiting for players to join...</p>
            )}
          </div>
          <div className="room-chat">
            <h3>Room Chat</h3>
            <Chat 
              roomId={roomId} 
              selectedRoom={{ roomId }} 
              onPlayerJoin={handlePlayerJoin} 
              onPlayerLeave={handlePlayerLeave} 
            />
          </div>
        </div>
        
        <div className="players-section">
          <h3>Players in Room</h3>
          <ul className="players-list">
            {wsPlayers.length > 0 ? (
              wsPlayers.map((player, index) => {
                const isCurrentUser = player.email === user?.email || 
                                     (player.displayName === user?.firstName || 
                                      player.displayName === user?.email?.split('@')[0]);
                
                return (
                  <li 
                    key={index} 
                    className={`player-item ${isCurrentUser ? 'current-user' : ''} ${player.isNew ? 'new-player' : ''}`}
                  >
                    {player.displayName}
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