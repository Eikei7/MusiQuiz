import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuizFooter from "../components/QuizFooter";
import "./QuizTime.css";
import { supabase } from '../supabaseClient';
import Card from "../components/Card";

const QuizTime = ({ roomData: propRoomData }) => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [user, setUser] = useState(null);
  
  // Room data state (if not provided via props)
  const [roomData, setRoomData] = useState(propRoomData || null);
  const [loading, setLoading] = useState(!propRoomData);
  const [error, setError] = useState("");
  
  // Game state
  const [players, setPlayers] = useState(propRoomData?.players || []);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(10);
  const [gameEnded, setGameEnded] = useState(false);
  const [scores, setScores] = useState({});
  const [statsUpdated, setStatsUpdated] = useState(false);
  
  // Question state
  const [cardKey, setCardKey] = useState(0);
  const [currentQuestionInfo, setCurrentQuestionInfo] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
  
  // New state for category tracking
  const [questionStats, setQuestionStats] = useState([]);
  
  // Timer state
  const TIMER_DURATION = 30; // seconds
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
  if (!propRoomData && roomId) {
    const fetchRoomData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('room_id', roomId)
          .single();

        if (error) throw error;

        setRoomData(data);
        setPlayers(data.players || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching room data:", err);
        setError(err.message || "Could not load game data");
        setLoading(false);
      }
    };
    fetchRoomData();
  }
}, [roomId, propRoomData]);


  useEffect(() => {
  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      navigate('/login');
      return;
    }
    if (user) {
      setUser(user);
    } else {
      navigate('/login');
    }
  };
  getCurrentUser();
}, [navigate]);

useEffect(() => {
  if (!roomId) return;

  const fetchGameData = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error) throw error;
      setCurrentTurn(data.current_turn || 0);
      setCurrentRound(data.current_round || 1);
      setScores(data.scores || {});
    } catch (err) {
      console.error("Error fetching game data:", err);
    }
  };

  fetchGameData();
}, [roomId]);

useEffect(() => {
  if (!roomId) return;

  const channel = supabase
    .channel('game_updates', {
      config: {
        presence: {
          key: roomId,
        },
      },
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        setCurrentTurn(payload.new.current_turn || 0);
        setCurrentRound(payload.new.current_round || 1);
        setScores(payload.new.scores || {});
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [roomId]);

const resetRoomStatusAfterGame = async () => {
  try {
    console.log('DEBUG: Resetting room status after game completion');
    
    // Reset the room's game status
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ 
        game_started: false,
        started_at: null 
      })
      .eq('room_id', roomId);

    if (roomError) {
      console.error('Error resetting room after game completion:', roomError);
    } else {
      console.log('DEBUG: Room status reset after game completion');
    }

    // Delete the completed game
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('room_id', roomId);
    
    if (deleteError) {
      console.error('Error deleting completed game:', deleteError);
    } else {
      console.log('DEBUG: Game record deleted after completion');
    }
  } catch (err) {
    console.error('Error handling game completion cleanup:', err);
  }
};
  // Initialize scores when players are loaded
  useEffect(() => {
    if (players.length > 0) {
      const initialScores = {};
      players.forEach(player => {
        const playerEmail = typeof player === 'object' ? player.email : player;
        initialScores[playerEmail] = 0;
      });
      setScores(initialScores);
    }
  }, [players]);

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      // Time's up - automatically submit answer (which will be incorrect)
      handleSubmitAnswer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerActive]);

  // Update user stats when game ends
  useEffect(() => {
  if (gameEnded && !statsUpdated && user) {
    updateUserStats();
    // IMPORTANT: Reset room status when game ends naturally
    resetRoomStatusAfterGame();
  }
}, [gameEnded, statsUpdated, user]);

  // Check if it's the current user's turn
  const isMyTurn = () => {
    // In single-player mode, it's always your turn
      if (players.length === 1) {
        return true;
      }
      
      // Normal multi-player logic
      if (!players || players.length === 0 || currentTurn >= players.length) return false;
      
      const currentPlayer = players[currentTurn];
      const playerEmail = typeof currentPlayer === 'object' ? currentPlayer.email : currentPlayer;
      return playerEmail === user.email;
    };

    const getCurrentPlayerName = () => {
      // In single-player mode, use the user's name
      if (players.length === 1) {
        return user.firstName || user.email.split('@')[0] || "You";
      }
      
      // Normal multi-player logic
      if (!players || players.length === 0 || currentTurn >= players.length) return "Unknown";
      
      const player = players[currentTurn];
      if (typeof player === 'object') {
        return player.firstName || player.email.split('@')[0];
      }
      return typeof player === 'string' ? player.split('@')[0] : "Unknown";
    };

  const handleQuestionLoaded = (questionInfo) => {
  if (questionInfo) {
    const updatedInfo = {
      ...questionInfo,
      correctAnswerIndex: Number(questionInfo.correctAnswerIndex)
    };
    setCurrentQuestionInfo(updatedInfo);
  }
};

  const handleAnswerSelected = (index) => {
    // Only allow selecting if it's your turn
    if (!isMyTurn()) return;
    
    // Ensure index is stored as a number
    const numericIndex = Number(index);
    // console.log('QuizTime: Answer selected:', numericIndex);
    setSelectedAnswer(numericIndex);
  };

 const handleSubmitAnswer = async () => {
  // Check if the turn is locked
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('turn_lock')
    .eq('room_id', roomId)
    .single();
  if (fetchError || game.turn_lock) {
    console.log('Turn is locked or error fetching game data');
    return;
  }
  // Lock the turn
  const { error: lockError } = await supabase
    .from('games')
    .update({ turn_lock: true })
    .eq('room_id', roomId);
  if (lockError) {
    console.error('Error locking turn:', lockError);
    return;
  }
  // Proceed with answer submission
  setIsTimerActive(false);
  let isCorrect = false;
  if (selectedAnswer !== null && currentQuestionInfo) {
    isCorrect = selectedAnswer === currentQuestionInfo.correctAnswerIndex;
  }
  setIsAnswerCorrect(isCorrect);

  // Add question category and correctness to questionStats
  if (currentQuestionInfo) {
    setQuestionStats(prevStats => [
      ...prevStats,
      {
        category: currentQuestionInfo.category,
        isCorrect: isCorrect
      }
    ]);
  }

  // Update scores
  if (isCorrect) {
    const currentPlayerEmail = typeof players[currentTurn] === 'object'
      ? players[currentTurn].email
      : players[currentTurn];
    const newScores = { ...scores, [currentPlayerEmail]: (scores[currentPlayerEmail] || 0) + 1 };
    setScores(newScores);
    // Update Supabase
    const { error } = await supabase
      .from('games')
      .update({
        scores: newScores,
        turn_lock: false,
      })
      .eq('room_id', roomId);
    if (error) console.error('Error updating scores:', error);
  } else {
    // Unlock the turn if the answer is incorrect
    const { error } = await supabase
      .from('games')
      .update({ turn_lock: false })
      .eq('room_id', roomId);
    if (error) console.error('Error unlocking turn:', error);
  }
};


  const handleNextTurn = async () => {
  // Check if the game should end after this turn
  const nextRound = currentTurn + 1 >= players.length ? currentRound + 1 : currentRound;

  if (nextRound > maxRounds) {
    setGameEnded(true);
    return;
  }

  // Move to next player
  const nextTurn = (currentTurn + 1) % players.length;

  // Update local state
  setCurrentTurn(nextTurn);
  setCurrentRound(nextRound);
  setCurrentQuestionInfo(null);
  setSelectedAnswer(null);
  setIsAnswerCorrect(null);
  setTimeLeft(TIMER_DURATION);
  setIsTimerActive(true);
  setCardKey(prevKey => prevKey + 1);

  // Update Supabase
  const { error } = await supabase
    .from('games')
    .update({
      current_turn: nextTurn,
      current_round: nextRound,
      scores: scores,
      turn_lock: false,
    })
    .eq('room_id', roomId);

  if (error) console.error('Error updating game:', error);
};



  const updateUserStats = async () => {
  if (!user || !user.email) return;

  try {
    // Determine if current user is winner
    let maxScore = -1;
    let winners = [];

    players.forEach(player => {
      const playerEmail = typeof player === 'object' ? player.email : player;
      const score = scores[playerEmail] || 0;

      if (score > maxScore) {
        maxScore = score;
        winners = [player];
      } else if (score === maxScore) {
        winners.push(player);
      }
    });

    const isWinner = winners.some(winner => {
      const winnerEmail = typeof winner === 'object' ? winner.email : winner;
      return winnerEmail === user.email;
    });

    console.log('Updating stats for user:', user.email, 'Won:', isWinner);
    console.log('Sending category stats:', questionStats);

    // Fetch the current user's stats from the users table
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stats')
      .eq('email', user.email)
      .single();

    if (fetchError) throw fetchError;

    // Initialize or update stats
    const currentStats = userData.stats || {
      gamesPlayed: 0,
      gamesWon: 0,
      categories: {}
    };

    // Update stats
    const updatedStats = {
      gamesPlayed: currentStats.gamesPlayed + 1,
      gamesWon: isWinner ? currentStats.gamesWon + 1 : currentStats.gamesWon,
      categories: { ...currentStats.categories }
    };

    // Update category stats
    questionStats.forEach(stat => {
      const category = stat.category;
      if (!updatedStats.categories[category]) {
        updatedStats.categories[category] = { total: 0, correct: 0 };
      }
      updatedStats.categories[category].total += 1;
      if (stat.isCorrect) {
        updatedStats.categories[category].correct += 1;
      }
    });

    // Update the user's stats in the database
    const { error } = await supabase
      .from('users')
      .update({ stats: updatedStats })
      .eq('email', user.email);

    if (error) throw error;

    console.log('Stats updated successfully');
    setStatsUpdated(true);
  } catch (error) {
    console.error('Error updating game stats:', error);
  }
};


  const handleReturnToRoom = () => {
    // Add confirmation dialog
    const confirmLeave = window.confirm("Are you sure you want to leave the quiz? Your progress will be lost.");
    
    if (confirmLeave) {
      // Clear any timers to prevent memory leaks
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Navigate back to the room
      navigate(`/rooms/${roomId}`);
    }
  };

  const handleLeaveQuiz = async () => {
  const confirmLeave = window.confirm("Do you want to return to the room?");
  if (!confirmLeave) return;

  // Clear timers
  if (timerRef.current) clearTimeout(timerRef.current);

  try {
    // FIXED: Reset the room's game_started flag when leaving quiz
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ 
        game_started: false,
        started_at: null 
      })
      .eq('room_id', roomId);

    if (roomError) console.error('Error resetting room game status:', roomError);

    // Delete the game from Supabase
    const { error: gameError } = await supabase
      .from('games')
      .delete()
      .eq('room_id', roomId);

    if (gameError) console.error('Error deleting game:', gameError);
  } catch (err) {
    console.error('Error leaving game:', err);
  }

  // Navigate back to the room
  navigate(`/rooms/${roomId}`);
};

const handleReturnToRoomAfterGameEnd = async () => {
  try {
    // Ensure room status is reset
    await resetRoomStatusAfterGame();
    
    // Navigate back to room
    navigate(`/rooms/${roomId}`);
  } catch (error) {
    console.error('Error returning to room:', error);
    // Navigate anyway
    navigate(`/rooms/${roomId}`);
  }
};

  // Loading state
  if (loading) {
    return (
      <div className="quiz-time-container">
        <div className="loading-screen">
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="quiz-time-container">
        <div className="error-screen">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div className="quiz-time-container">
        <div className="game-over">
          <h1>Quiz Over!</h1>
          
          <div className="final-scores">
            <h2>Final Scores</h2>
            {players.map((player, index) => {
              const playerEmail = typeof player === 'object' ? player.email : player;
              const playerName = typeof player === 'object' ? (player.firstName || playerEmail.split('@')[0]) : playerEmail.split('@')[0];
              const playerScore = scores[playerEmail] || 0;
              const isCurrentUser = playerEmail === user.email;
              
              return (
                <div key={index} className={`player-score ${isCurrentUser ? 'current-user' : ''}`}>
                  <span className="player-name">{playerName} {isCurrentUser ? '(You)' : ''}</span>
                  <span className="score-value">{playerScore}</span>
                </div>
              );
            })}
          </div>
          
          <div className="game-result">
            {(() => {
              // Determine winner
              let maxScore = -1;
              let winners = [];
              
              players.forEach(player => {
                const playerEmail = typeof player === 'object' ? player.email : player;
                const score = scores[playerEmail] || 0;
                
                if (score > maxScore) {
                  maxScore = score;
                  winners = [player];
                } else if (score === maxScore) {
                  winners.push(player);
                }
              });
              
              if (winners.length === 1) {
                const winner = winners[0];
                const winnerEmail = typeof winner === 'object' ? winner.email : winner;
                const winnerName = typeof winner === 'object' ? (winner.firstName || winnerEmail.split('@')[0]) : winnerEmail.split('@')[0];
                const isCurrentUser = winnerEmail === user.email;
                
                return <h3>{isCurrentUser ? 'You won!' : `${winnerName} won!`}</h3>;
              } else {
                return <h3>It's a tie!</h3>;
              }
            })()}
          </div>
          
          <button 
            className="return-button"
            onClick={handleReturnToRoomAfterGameEnd} // Use the new handler
          >
            Return to Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-time-container">
      <div className="quiz-navigation">
        <button 
        className="leave-quiz-button"
        onClick={handleReturnToRoom}
        >
        Leave Quiz
        </button>
      </div>     
      <div className="game-info">
      <div className="game-header">
  {/* Only show turn indicator if we have more than one player */}
  {players.length > 1 && (
    <div className="turn-indicator">
      <span className="turn-label">Turn:</span>
      <span className="current-player">
        {isMyTurn() ? ' Your Turn' : ` ${getCurrentPlayerName()}'s turn`}
      </span>
    </div>
  )}
  <div className="round-indicator">
    <span>Round {currentRound} of {maxRounds}</span>
  </div>
</div>
        <div className={`timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
          Time: {timeLeft}s
        </div>
      </div>
      
      <div className="scores-panel">
        {players.map((player, index) => {
          const playerEmail = typeof player === 'object' ? player.email : player;
          const playerName = typeof player === 'object' ? (player.firstName || playerEmail.split('@')[0]) : playerEmail.split('@')[0];
          const isCurrentPlayer = index === currentTurn;
          const isCurrentUser = playerEmail === user.email;
          
          return (
            <div 
              key={index} 
              className={`player-score ${isCurrentPlayer ? 'active-player' : ''} ${isCurrentUser ? 'current-user' : ''}`}
            >
              <span className="player-name">{playerName} {isCurrentUser ? '(You)' : ''}</span>
              <span className="score-value">{scores[playerEmail] || 0}</span>
            </div>
          );
        })}
      </div>
      
      <div className="quiz-content">
        <Card 
        key={cardKey}
        id="question-card"
        onQuestionLoaded={handleQuestionLoaded}
        isAnswerCorrect={isAnswerCorrect}
        selectedAnswer={selectedAnswer}
        showCorrectAnswer={isAnswerCorrect !== null}/>
  
          <div className="feedback-container">
          {isMyTurn() && selectedAnswer !== null && isAnswerCorrect === null && (
            <div className="submit-area">
              <button 
                className="submit-answer-button"
                onClick={handleSubmitAnswer}
              >
                Submit Answer
              </button>
            </div>
          )}
          {/* Show feedback if answer is correct or incorrect */}
          {isAnswerCorrect !== null && (
            <div className={`feedback-area ${isAnswerCorrect ? 'correct' : 'incorrect'}`}>
              <h3>{isAnswerCorrect ? 'Correct!' : 'Incorrect!'}</h3>
              {isMyTurn() && (
                <button 
                  className="next-question-button"
                  onClick={handleNextTurn}
                >
                  Next Turn
                </button>
              )}
            </div>
          )}
          {/* Show waiting message if it's not the current player's turn - hide in single player mode */}
          {!isMyTurn() && isAnswerCorrect === null && players.length > 1 && (
            <div className="waiting-message">
              <p>Waiting for {getCurrentPlayerName()} to answer...</p>
              
              This will be your next question, get ready!
            </div>
          )}
        </div>
      </div>
      
      <QuizFooter 
        selectedHotspot={selectedAnswer}
        isAnswerCorrect={isAnswerCorrect}
        disabled={!isMyTurn()}
        onAnswerSelected={handleAnswerSelected}
      />
    </div>
  );
};

export default QuizTime;