import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './RoomTransitions.css';
import ChatComponent from '../components/ChatComponent';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [lastActivityUpdate, setLastActivityUpdate] = useState(Date.now());
  
  // Add transition states
  const [isExiting, setIsExiting] = useState(false);
  const [transitionData, setTransitionData] = useState(null);

  // Prevent removing player from room when navigating to the game
  const isNavigatingToGame = useRef(false);
  // Track mount time to avoid StrictMode false cleanups (component unmounted < 100ms after mount)
  const mountTimeRef = useRef(Date.now());

  // Get current user on component mount
  useEffect(() => {
    if (user) {
      document.title = `MusiQuiz - Room`;
      fetchRoomData();
    }
  }, [roomId, user]);

  // Check if user is the first player (host)
  const amIFirstPlayer = useCallback(() => {
    if (!players || players.length === 0) return false;
    return players[0]?.user_id === user?.id;
  }, [players, user]);

  // SEPARATE useEffect for real-time subscription
  useEffect(() => {
    if (!user || !roomId) return;
    
    const setupRealtimeSubscription = () => {
      const roomSubscription = supabase
        .channel(`room_${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_id=eq.${roomId}`,
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new);
            
            if (JSON.stringify(payload.new.players) !== JSON.stringify(payload.old?.players)) {
              setPlayers(payload.new.players || []);
            }

            const gameJustStarted = payload.new.game_started && !payload.old?.game_started;
            const isHost = amIFirstPlayer();
            
            if (gameJustStarted && !isHost) {
              isNavigatingToGame.current = true;
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
      supabase.removeChannel(subscription);
    };
  }, [user, roomId, navigate, amIFirstPlayer]);

  // SEPARATE useEffect for activity tracking and cleanup
  useEffect(() => {
    if (!user || !roomId) return;

    // Function to remove current user from room
    const removeCurrentUserFromRoom = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const { data: room, error } = await supabase
          .from('rooms')
          .select('players')
          .eq('room_id', roomId)
          .single();

        if (error || !room) return;

        const updatedPlayers = (room.players || []).filter(player => 
          player.user_id !== currentUser.id
        );

        await supabase
          .from('rooms')
          .update({ players: updatedPlayers })
          .eq('room_id', roomId);

      } catch (error) {
        console.error('Error removing user from room:', error);
      }
    };

    // Function to update player activity
    const updatePlayerActivity = async () => {
      try {
        const { data: room, error } = await supabase
          .from('rooms')
          .select('players')
          .eq('room_id', roomId)
          .single();

        if (error || !room) return;

        const updatedPlayers = (room.players || []).map(player => 
          player.user_id === user.id 
            ? { 
                ...player, 
                last_active: new Date().toISOString(),
                is_active: true 
              }
            : player
        );

        await supabase
          .from('rooms')
          .update({ players: updatedPlayers })
          .eq('room_id', roomId);

        setLastActivityUpdate(Date.now());
      } catch (error) {
        console.error('Error updating player activity:', error);
      }
    };

    // Function to remove inactive players
    const removeInactivePlayers = async () => {
      try {
        const { data: room, error } = await supabase
          .from('rooms')
          .select('players')
          .eq('room_id', roomId)
          .single();

        if (error || !room) return;

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const activePlayers = (room.players || []).filter(player => 
          player.last_active && new Date(player.last_active) > new Date(thirtyMinutesAgo)
        );

        // Only update if there are inactive players to remove
        if (activePlayers.length !== room.players.length) {
          await supabase
            .from('rooms')
            .update({ players: activePlayers })
            .eq('room_id', roomId);
        }
      } catch (error) {
        console.error('Error removing inactive players:', error);
      }
    };

    // Update activity immediately and set up interval
    updatePlayerActivity();
    const activityInterval = setInterval(updatePlayerActivity, 30000); // Every 30 seconds

    // Check for inactive players every minute
    const cleanupInterval = setInterval(removeInactivePlayers, 60000);

    // Handle page unload (browser/tab close)
    const handleBeforeUnload = () => {
      // Note: async operations in beforeunload are unreliable
      // Consider using navigator.sendBeacon for more reliable cleanup
      removeCurrentUserFromRoom();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(activityInterval);
      clearInterval(cleanupInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Skip cleanup if:
      // 1. Unmounted within 100ms (React StrictMode double-mount in development)
      // 2. Navigating to the game (player should stay in room)
      const timeMounted = Date.now() - mountTimeRef.current;
      if (timeMounted > 100 && !isNavigatingToGame.current) {
        removeCurrentUserFromRoom();
      }
    };
  }, [user, roomId]);

  const fetchRoomData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch the room data
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('room_id, name, players, game_started, started_at')
        .eq('room_id', roomId)
        .single();

      if (roomError) {
        if (roomError.code === 'PGRST116') {
          throw new Error('Room not found');
        }
        throw roomError;
      }

      // SAFETY CHECK: If game_started is true, verify there's actually a game running
      if (roomData.game_started) {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('id')
          .eq('room_id', roomId)
          .single();

        // If no game exists but room says game is started, reset the room
        if (gameError && gameError.code === 'PGRST116') {
          const { error: resetError } = await supabase
            .from('rooms')
            .update({ 
              game_started: false,
              started_at: null 
            })
            .eq('room_id', roomId);

          if (resetError) {
            console.error('Error resetting orphaned room status:', resetError);
          } else {
            // Update local room data
            roomData.game_started = false;
            roomData.started_at = null;
          }
        }
      }

      // Check if user is in this room's players array
      const players = roomData.players || [];
      const userInRoom = players.some(p => p.user_id === user.id && p.is_active);

      if (!userInRoom) {
        navigate('/dashboard');
        return;
      }

      setRoom(roomData);
      setPlayers(players);

      // Now check if game should start (this will be false if we reset it above)
      if (roomData.game_started) {
        setQuizStarted(true);
        navigate(`/game/${roomId}`);
        return;
      }

      setLoading(false);

    } catch (err) {
      console.error('Error fetching room:', err);
      setError(err.message || 'Error accessing this room');
      setLoading(false);
    }
  };

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

      const updateData = { players: updatedPlayers };
      
      if (shouldResetGame) {
        updateData.game_started = false;
        updateData.started_at = null;
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
          console.error('Error deleting game:', deleteError);
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

      // First, start the exit transition
      setIsExiting(true);
      setQuizStarted(true);
      
      // Only the host should update the room to start the game
      if (amIFirstPlayer()) {
        // Delete any existing game for this room
        const { error: deleteError } = await supabase
          .from('games')
          .delete()
          .eq('room_id', roomId);
        if (deleteError) {
          console.error('Error deleting existing game:', deleteError);
        }
        
        // Update the room to mark the game as started
        const { error: roomError } = await supabase
          .from('rooms')
          .update({
            game_started: true,
            started_at: new Date().toISOString()
          })
          .eq('room_id', roomId);
        if (roomError) {
          console.error('Error updating room game_started:', roomError);
          setIsExiting(false);
          setQuizStarted(false);
          throw roomError;
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
          console.error('Error creating game record:', gameError);
        }
      }
      
      // Navigate to the game
      isNavigatingToGame.current = true;
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
                const isActive = player.last_active && 
                  new Date(player.last_active) > new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
                
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
                  displayName = player.email.split('@')[0];
                } else {
                  displayName = 'Unknown Player';
                }
                
                return (
                  <li 
                    key={player.user_id || index} 
                    className={`player-item ${isCurrentUser ? 'current-user' : ''} ${!isActive ? 'inactive' : ''}`}
                    title={!isActive && player.last_active ? 'Last seen: ' + new Date(player.last_active).toLocaleTimeString() : 'Online'}
                  >
                    <span className="player-name">
                      {displayName}
                      {isCurrentUser && ' (You)'}
                      {index === 0 && ' 👑'}
                    </span>
                    <span className={`player-status ${isActive ? 'online' : 'offline'}`}>
                      {isActive ? '●' : '○'}
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="no-players">No players in room...</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Room;