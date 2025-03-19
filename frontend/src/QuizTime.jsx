import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import Card from "./Card";
import "./QuizTime.css";
import QuizFooter from "./QuizFooter";

const QuizTime = ({ roomData }) => {
  const { token } = useAuth();
  const [droppedCardInfo, setDroppedCardInfo] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const TIMER_DURATION = 30;
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [cardKey, setCardKey] = useState(0);
  const timerRef = useRef(null);
   
  const handleDragEnd = (event, info, cardData) => {
    // Check if card was dropped in a hotspot
    const hotspotElements = document.querySelectorAll('.answer-hotspot');
    
    // Reset previously selected answer
    setSelectedAnswer(null);
    
    // Loop through hotspots to see if card was dropped in one
    hotspotElements.forEach((hotspot, index) => {
      const rect = hotspot.getBoundingClientRect();
      
      // Check if card position overlaps with this hotspot
      if (
        info.point.x >= rect.left &&
        info.point.x <= rect.right &&
        info.point.y >= rect.top &&
        info.point.y <= rect.bottom
      ) {
        // Card was dropped in this hotspot
        setSelectedAnswer(index);
        setDroppedCardInfo({
          ...cardData,
          hotspotIndex: index
        });
      }
    });
  };

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      // Time's up - automatically submit the answer
      handleSubmitAnswer();
    }
  
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerActive]);
  
  const handleSubmitAnswer = () => {
    // Stop the timer
    setIsTimerActive(false);
    
    if (selectedAnswer === null || !droppedCardInfo) {
      // If no answer selected when time's up, count as incorrect
      setIsAnswerCorrect(false);
      setQuestionCount(questionCount + 1);
      return;
    }
    
    const isCorrect = droppedCardInfo.correctAnswerIndex === selectedAnswer;
    setIsAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setQuestionCount(questionCount + 1);
  };
  const handleNextQuestion = () => {
    // Reset for next question
    setDroppedCardInfo(null);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setTimeLeft(TIMER_DURATION);
    setIsTimerActive(true);
    
    // Force card reload by updating a key
    setCardKey(prevKey => prevKey + 1);
  };
  
  return (
    <div className="quiz-time-container">     
      <div className="quiz-content">
        <Card
          key={cardKey} 
          id="question-card"
          isDropped={selectedAnswer !== null}
          onDragEnd={handleDragEnd}
          locked={isAnswerCorrect !== null}
          token={token}
          setDroppedCardInfo={setDroppedCardInfo}
        />
        
        {selectedAnswer !== null && isAnswerCorrect === null && (
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
            <button 
              className="next-question-button"
              onClick={handleNextQuestion}
            >
              Next Question
            </button>
          </div>
        )}
        <div className="score-and-timer">
        <div className="score-display">
          Your score: {score}/{questionCount}
        </div>
        <div className={`timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
          Time: {timeLeft} s
        </div>
        </div>
      </div>
      
      <QuizFooter 
        selectedHotspot={selectedAnswer}
        isAnswerCorrect={isAnswerCorrect}
      />
    </div>
  );
}

export default QuizTime;