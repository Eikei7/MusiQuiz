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
  const [lastActivityUpdate, setLastActivityUpdate] = useState(Date.now());
  
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
      document.title = `MusiQuiz - Room`;
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

  // SEPARATE useEffect for real-time subscription
  useEffect(() => {
    if (!user || !roomId) return;
    
    const setupRealtimeSubscription = () => {
      console.log('DEBUG: Setting up real-time subscription for room:', roomId);
      const roomSubscription = supabase
        .channel(`room_${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_id=eq.${roomId}`,
        }, (payload) => {
          console.log('DEBUG: Room change detected:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new);
            
            if (JSON.stringify(payload.new.players) !== JSON.stringify(payload.old?.players)) {
              console.log('DEBUG: Players updated:', payload.new.players);
              setPlayers(payload.new.players || []);
            }

            const gameJustStarted = payload.new.game_started && !payload.old?.game_started;
            const isHost = amIFirstPlayer();
            
            if (gameJustStarted && !isHost) {
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
      // Remove user when component unmounts normally
      removeCurrentUserFromRoom();
    };
  }, [user, roomId]);

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

      // Check if user is in this room's players array
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