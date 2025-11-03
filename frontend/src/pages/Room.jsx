import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import './RoomTransitions.css';
import ChatComponent from '../components/ChatComponent';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  
  // Add transition states
  const [isExiting, setIsExiting] = useState(false);
  const [transitionData, setTransitionData] = useState(null);

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        navigate('/login');
        return;
      }
      
      if (user) {
        console.log('DEBUG: User loaded:', user.id);
        setUser(user);
      } else {
        navigate('/login');
      }
    };

    getCurrentUser();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      document.title = `Room - MusiQuiz`;
      console.log('DEBUG: About to fetch room data for roomId:', roomId);
      fetchRoomData();
    }
  }, [roomId, user]);

  // Check if user is the first player (host)
  const amIFirstPlayer = () => {
    if (!players || players.length === 0) return false;
    const isHost = players[0]?.user_id === user?.id;
    console.log('DEBUG: Am I first player?', isHost, 'Players:', players);
    return isHost;
  };

  // Set up real-time subscription - moved to separate useEffect
  useEffect(() => {
    if (!user || !roomId) return;
    
    const setupRealtimeSubscription = () => {
      console.log('DEBUG: Setting up real-time subscription for room:', roomId);
      const roomSubscription = supabase
        .channel(`room_${roomId}`)
        .on('postgres_changes', {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'rooms',
          filter: `room_id=eq.${roomId}`,
        }, (payload) => {
          console.log('DEBUG: Room change detected:', payload);
          console.log('DEBUG: Event type:', payload.eventType);
          console.log('DEBUG: Old game_started:', payload.old?.game_started);
          console.log('DEBUG: New game_started:', payload.new?.game_started);
          
          if (payload.eventType === 'UPDATE') {
            // Update the entire room state
            setRoom(payload.new);
            
            // Update players if the players array changed
            if (JSON.stringify(payload.new.players) !== JSON.stringify(payload.old?.players)) {
              console.log('DEBUG: Players updated:', payload.new.players);
              setPlayers(payload.new.players || []);
            }

            // FIXED: Only navigate non-host players to game when game_started changes from false to true
            // and only if the current user is not the host
            const gameJustStarted = payload.new.game_started && !payload.old?.game_started;
            const isHost = amIFirstPlayer();
            
            console.log('DEBUG: Game just started?', gameJustStarted);
            console.log('DEBUG: Is user host?', isHost);
            console.log('DEBUG: Should redirect?', gameJustStarted && !isHost);
            
            if (gameJustStarted && !isHost) {
              console.log('DEBUG: Game started by host, navigating non-host player to the game...');
              setQuizStarted(true);
              setIsExiting(true);
              setTimeout(() => {
                navigate(`/game/${roomId}`);
              }, 700);
            }
          }
        })
        .subscribe();
      return roomSubscription;
    };
    
    const subscription = setupRealtimeSubscription();
    
    // Cleanup subscription
    return () => {
      console.log('DEBUG: Cleaning up room subscription');
      supabase.removeChannel(subscription);
    };
  }, [user, roomId, navigate, amIFirstPlayer]); // Added amIFirstPlayer to dependencies

  const fetchRoomData = async () => {
  try {
    setLoading(true);
    setError('');

    console.log('DEBUG: Fetching room data for:', roomId);

    // Fetch the room data
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        throw new Error('Room not found');
      }
      throw roomError;
    }

    console.log('DEBUG: Room data fetched:', roomData);
    console.log('DEBUG: Room game_started status:', roomData.game_started);

    // SAFETY CHECK: If game_started is true, verify there's actually a game running
    if (roomData.game_started) {
      console.log('DEBUG: Room says game is started, checking if game actually exists...');
      
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .single();

      // If no game exists but room says game is started, reset the room
      if (gameError && gameError.code === 'PGRST116') {
        console.log('DEBUG: No game found but room says game started - resetting room status');
        
        const { error: resetError } = await supabase
          .from('rooms')
          .update({ 
            game_started: false,
            started_at: null 
          })
          .eq('room_id', roomId);

        if (resetError) {
          console.error('DEBUG: Error resetting orphaned room status:', resetError);
        } else {
          console.log('DEBUG: Orphaned room status reset successfully');
          // Update local room data
          roomData.game_started = false;
          roomData.started_at = null;
        }
      } else if (gameData) {
        console.log('DEBUG: Game exists, proceeding to game...');
      }
    }

    // Rest of your existing fetchRoomData logic...
    const players = roomData.players || [];
    console.log('DEBUG: Players in room:', players);
    console.log('DEBUG: Current user ID:', user.id);
    
    const userInRoom = players.some(p => {
      console.log('DEBUG: Checking player:', p, 'is_active:', p.is_active);
      return p.user_id === user.id && p.is_active;
    });

    if (!userInRoom) {
      console.log('DEBUG: User not found in room, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    setRoom(roomData);
    setPlayers(players);
    console.log('DEBUG: Players state set to:', players);

    // Now check if game should start (this will be false if we reset it above)
    if (roomData.game_started) {
      console.log('DEBUG: Game already started, redirecting to game...');
      setQuizStarted(true);
      navigate(`/game/${roomId}`);
      return;
    } else {
      console.log('DEBUG: Game not started, staying in room');
    }

    setLoading(false);

  } catch (err) {
    console.error('DEBUG: Error fetching room:', err);
    setError(err.message || 'Error accessing this room');
    setLoading(false);
  }
};

  // Add a function to check room status (debugging helper)
  const checkRoomStatus = async () => {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error) throw error;

      console.log('DEBUG: Current room status check:');
      console.log('  - game_started:', room.game_started);
      console.log('  - started_at:', room.started_at);
      console.log('  - players:', room.players);
      
      // Also check games table
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .single();
        
      if (gameError && gameError.code !== 'PGRST116') {
        console.log('DEBUG: Error fetching game:', gameError);
      } else if (gameError && gameError.code === 'PGRST116') {
        console.log('DEBUG: No game record found (this is normal)');
      } else {
        console.log('DEBUG: Game record found:', game);
      }
      
    } catch (error) {
      console.error('DEBUG: Error checking room status:', error);
    }
  };

  // Add a function to manually reset room status (debugging helper)
  const resetRoomStatus = async () => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ 
          game_started: false,
          started_at: null 
        })
        .eq('room_id', roomId);

      if (error) throw error;
      
      console.log('DEBUG: Room status reset');
      
      // Also delete any game records
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('room_id', roomId);
        
      if (deleteError) {
        console.log('DEBUG: Error deleting games (might be normal):', deleteError);
      } else {
        console.log('DEBUG: Game records deleted');
      }
      
      // Refresh room data
      fetchRoomData();
      
    } catch (error) {
      console.error('DEBUG: Error resetting room status:', error);
    }
  };

  // Rest of your component code stays the same...
  const handleLeaveRoom = async () => {
    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('players, game_started')
        .eq('room_id', roomId)
        .single();

      if (fetchError) throw fetchError;

      const updatedPlayers = (room.players || []).filter(p => p.user_id !== user.id);

      // Reset game_started to false when all players leave or when the host leaves
      const isHost = room.players && room.players.length > 0 && room.players[0]?.user_id === user.id;
      const shouldResetGame = updatedPlayers.length === 0 || isHost;

      console.log('DEBUG: Leave room - isHost:', isHost, 'shouldResetGame:', shouldResetGame);

      const updateData = { players: updatedPlayers };
      
      if (shouldResetGame) {
        updateData.game_started = false;
        updateData.started_at = null;
        console.log('DEBUG: Resetting game status when leaving room');
      }

      const { error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('room_id', roomId);

      if (error) throw error;

      // Also delete any existing game if resetting
      if (shouldResetGame) {
        const { error: deleteError } = await supabase
          .from('games')
          .delete()
          .eq('room_id', roomId);
        
        if (deleteError) {
          console.error('DEBUG: Error deleting game:', deleteError);
        } else {
          console.log('DEBUG: Game deleted when leaving room');
        }
      }

      toast.success('Successfully left the room!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room: ' + error.message);
    }
  };

  const handleStartQuiz = async () => {
    try {
      // Prevent multiple clicks
      if (isExiting || quizStarted) return;
      
      console.log('DEBUG: Starting quiz...');
      console.log('DEBUG: Am I first player?', amIFirstPlayer());
      
      // First, start the exit transition
      setIsExiting(true);
      setQuizStarted(true);
      
      // Only the host should update the room to start the game
      if (amIFirstPlayer()) {
        console.log('DEBUG: Host is starting the game');
        
        // Delete any existing game for this room
        const { error: deleteError } = await supabase
          .from('games')
          .delete()
          .eq('room_id', roomId);
        if (deleteError) {
          console.error('DEBUG: Error deleting existing game:', deleteError);
        } else {
          console.log('DEBUG: Existing game deleted');
        }
        
        // Update the room to mark the game as started
        console.log('DEBUG: Setting game_started to true');
        const { error: roomError } = await supabase
          .from('rooms')
          .update({
            game_started: true,
            started_at: new Date().toISOString()
          })
          .eq('room_id', roomId);
        if (roomError) {
          console.error('DEBUG: Error updating room game_started:', roomError);
          setIsExiting(false);
          setQuizStarted(false);
          throw roomError;
        } else {
          console.log('DEBUG: Room game_started set to true');
        }
        
        // Create a new game record with initial state
        const { error: gameError } = await supabase
          .from('games')
          .insert([{
            room_id: roomId,
            category: 'Mixed',
            difficulty: 'medium',
            total_questions: 10,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            created_by: user.id,
            current_turn: 0,
            current_round: 1,
            scores: {},
            turn_lock: false,
          }]);
        if (gameError) {
          console.error('DEBUG: Error creating game record:', gameError);
        } else {
          console.log('DEBUG: Game record created');
        }
      }
      
      // Navigate to the game
      setTimeout(() => {
        navigate(`/game/${roomId}`);
      }, 700);
      
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("Failed to start the quiz: " + error.message);
      setIsExiting(false);
      setQuizStarted(false);
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
      
      {/* DEBUG SECTION - Remove this in production */}
      {/* <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '10px',
        color: '#333', 
        margin: '10px', 
        border: '1px solid #ccc',
        fontSize: '12px'
      }}>
        <h4>DEBUG INFO (Remove in production)</h4>
        <p>Room game_started: {String(room?.game_started)}</p>
        <p>User ID: {user?.id}</p>
        <p>Players count: {players.length}</p>
        <p>Am I host: {String(amIFirstPlayer())}</p>
        <div>
          <button onClick={checkRoomStatus} style={{ marginRight: '10px', fontSize: '11px' }}>
            Check Room Status
          </button>
          <button onClick={resetRoomStatus} style={{ fontSize: '11px', backgroundColor: '#ffcccc' }}>
            Reset Room Status
          </button>
        </div>
      </div> */}
      
      <div className="room-content">
        <div className="room-main-area">
          <div className="quiz-placeholder">
            <h3>The quiz will start soon</h3>
            
            {players.length >= 2 ? (
              <div className="start-quiz-container">
                <p>All set! {amIFirstPlayer() ? 'You can now start a two-player quiz.' : 'Waiting for the host to start the quiz.'}</p>
                
                {amIFirstPlayer() && (
                  <button 
                    className="start-quiz-button" 
                    onClick={handleStartQuiz}
                    disabled={isExiting || quizStarted}
                  >
                    {isExiting ? 'Starting...' : 'Start Multiplayer Quiz'}
                  </button>
                )}
              </div>
            ) : players.length === 1 ? (
              <div className="start-quiz-container">
                <p>No other players have joined yet. You can still play in single-player mode!</p>
                <button 
                  className="start-quiz-button single-player" 
                  onClick={handleStartQuiz}
                  disabled={isExiting || quizStarted}
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
            <ChatComponent roomId={roomId} user={user} />
          </div>
        </div>
        
        <div className="players-section">
          <h3>Players in Room ({players.length})</h3>
          
          <ul className="players-list">
            {players.length > 0 ? (
              players.map((player, index) => {
                const isCurrentUser = player.user_id === user?.id;
                
                // Create display name from available data
                let displayName = '';
                if (player.first_name && player.last_name) {
                  displayName = `${player.first_name}`;
                } else if (player.first_name) {
                  displayName = player.first_name;
                } else if (player.displayName) {
                  displayName = player.displayName;
                } else if (player.name) {
                  displayName = player.name;
                } else if (player.email) {
                  // Use email without domain as fallback
                  displayName = player.email.split('@')[0];
                } else {
                  displayName = 'Unknown Player';
                }
                
                return (
                  <li 
                    key={player.user_id || index} 
                    className={`player-item ${isCurrentUser ? 'current-user' : ''}`}
                  >
                    {displayName}
                    {isCurrentUser && ' (You)'}
                    {index === 0 && ' (Host)'}
                  </li>
                );
              })
            ) : (
              <li className="no-players">No players found in room...</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Room;