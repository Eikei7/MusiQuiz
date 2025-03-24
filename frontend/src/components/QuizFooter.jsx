import React from 'react';
import "../pages/QuizTime.css";

const QuizFooter = ({ selectedHotspot, isAnswerCorrect, disabled, onAnswerSelected }) => {
  const options = ['A', 'B', 'C', 'D'];
  // Handle click on answer box
  const handleClick = (index) => {
    if (!disabled && isAnswerCorrect === null) {
      onAnswerSelected(index);
    }
  };
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="hotspots-container">
          {options.map((option, index) => (
            <div 
              key={index}
              className={`answer-box 
                ${selectedHotspot === index ? 'selected' : ''} 
                ${isAnswerCorrect !== null && selectedHotspot === index ? 
                  (isAnswerCorrect ? 'correct' : 'incorrect') : ''} 
                ${disabled ? 'disabled' : ''}
              `}
              onClick={() => handleClick(index)}
            >
              <span className="option-letter">{option}</span>
              {!disabled && isAnswerCorrect === null && (
                <span className="option-instruction">
                  {selectedHotspot === index ? 'Selected' : 'Click to select'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default QuizFooter;