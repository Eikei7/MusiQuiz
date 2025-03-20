import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import Card from "./Card";
import QuizFooter from "./QuizFooter";
import "./QuizTime.css";
import { ENDPOINT_ROOMS, ENDPOINT_USERS, ENDPOINT_USERS_STATS_UPDATE } from "./endpoints";

const QuizTime = ({ roomData: propRoomData }) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();
  
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
  
  // Timer state
  const TIMER_DURATION = 30; // seconds
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const timerRef = useRef(null);

  // Fetch room data if not provided via props
  useEffect(() => {
    if (!propRoomData && roomId) {
      const fetchRoomData = async () => {
        try {
          setLoading(true);
          const response = await fetch(`${ENDPOINT_ROOMS}/${roomId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch room data');
          }
          
          const data = await response.json();
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
  }, [roomId, token, propRoomData]);

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
    }
  }, [gameEnded, statsUpdated, user]);

  // Check if it's the current user's turn
  const isMyTurn = () => {
    if (!players || players.length === 0 || currentTurn >= players.length) return false;
    
    const currentPlayer = players[currentTurn];
    const playerEmail = typeof currentPlayer === 'object' ? currentPlayer.email : currentPlayer;
    return playerEmail === user.email;
  };

  // Get current player's display name
  const getCurrentPlayerName = () => {
    if (!players || players.length === 0 || currentTurn >= players.length) return "Unknown";
    
    const player = players[currentTurn];
    if (typeof player === 'object') {
      return player.firstName || player.email.split('@')[0];
    }
    return typeof player === 'string' ? player.split('@')[0] : "Unknown";
  };

  const handleQuestionLoaded = (questionInfo) => {
    console.log('QuizTime: Question loaded:', questionInfo);
    if (questionInfo) {
      // Store the question info with explicit number conversion
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
    console.log('QuizTime: Answer selected:', numericIndex);
    setSelectedAnswer(numericIndex);
  };

  const handleSubmitAnswer = () => {
    // Stop the timer
    setIsTimerActive(false);
    
    console.log('QuizTime: Submitting answer:', selectedAnswer);
    console.log('QuizTime: Current question info:', currentQuestionInfo);
    
    // Determine if answer is correct
    let isCorrect = false;
    if (selectedAnswer !== null && currentQuestionInfo && currentQuestionInfo.correctAnswerIndex !== undefined) {
      const selectedIdx = Number(selectedAnswer);
      const correctIdx = Number(currentQuestionInfo.correctAnswerIndex);
      
      console.log('QuizTime: Comparing answer index', selectedIdx, 'with correct index', correctIdx);
      isCorrect = selectedIdx === correctIdx;
      console.log('QuizTime: Answer is correct?', isCorrect);
    }
    
    setIsAnswerCorrect(isCorrect);
    
    // Update score
    if (isCorrect) {
      const currentPlayerEmail = typeof players[currentTurn] === 'object' 
        ? players[currentTurn].email 
        : players[currentTurn];
      
      setScores(prevScores => ({
        ...prevScores,
        [currentPlayerEmail]: (prevScores[currentPlayerEmail] || 0) + 1
      }));
    }
  };

  const handleNextTurn = () => {
    // Check if game should end
    const nextRound = currentTurn + 1 >= players.length ? currentRound + 1 : currentRound;
    
    if (nextRound > maxRounds) {
      setGameEnded(true);
      return;
    }
    
    // Move to next player
    const nextTurn = (currentTurn + 1) % players.length;
    setCurrentTurn(nextTurn);
    setCurrentRound(nextRound);
    
    // Reset question state
    setCurrentQuestionInfo(null);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setTimeLeft(TIMER_DURATION);
    setIsTimerActive(true);
    
    // Generate a new card key to force re-mount of the Card component
    console.log('QuizTime: Advancing to next turn, creating new card with key:', cardKey + 1);
    setCardKey(prevKey => prevKey + 1);
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
      
      const response = await fetch(`${ENDPOINT_USERS_STATS_UPDATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.email,
          gameWon: isWinner
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token expired. Cannot update stats.');
          return;
        }
        throw new Error('Failed to update stats');
      }
      
      const data = await response.json();
      console.log('Stats updated successfully:', data);
      setStatsUpdated(true);
    } catch (error) {
      console.error('Error updating game stats:', error);
      // Don't block UI flow on stats update failure
    }
  };

  const handleReturnToRoom = () => {
    navigate(`/rooms/${roomId}`);
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
            onClick={handleReturnToRoom}
          >
            Return to Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-time-container">     
      <div className="game-info">
        <div className="turn-indicator">
          <span className="turn-label">Turn:</span>
          <span className="current-player">
            {isMyTurn() ? ' Your Turn' : ` ${getCurrentPlayerName()}'s turn`}
          </span>
        </div>
        
        <div className="round-indicator">
          <span>Round {currentRound} of {maxRounds}</span>
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
          token={token}
          onQuestionLoaded={handleQuestionLoaded}
        />
        
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
        
        {!isMyTurn() && isAnswerCorrect === null && (
          <div className="waiting-message">
            <p>Waiting for {getCurrentPlayerName()} to answer...</p>
          </div>
        )}
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