import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Card.css';
import { ENDPOINT_QUESTIONS_GET } from './endpoints';

const Card = ({
  id,
  isDropped,
  onDragEnd,
  locked,
  token,
  setDroppedCardInfo
}) => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('');

  useEffect(() => {
    // Function to fetch a random question
    const fetchRandomQuestion = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all questions first
        const response = await fetch(ENDPOINT_QUESTIONS_GET, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }

        const questions = await response.json();

        // If no questions available
        if (!questions || questions.length === 0) {
          setError('No questions available');
          setLoading(false);
          return;
        }

        // Select a random question
        const randomIndex = Math.floor(Math.random() * questions.length);
        const randomQuestion = questions[randomIndex];

        setQuestion(randomQuestion);
        
        // Update the parent component with the question info
        if (setDroppedCardInfo) {
          setDroppedCardInfo({
            id,
            questionId: randomQuestion.id,
            correctAnswerIndex: randomQuestion.correctAnswerIndex
          });
        }
      } catch (err) {
        console.error('Error fetching random question:', err);
        setError('Could not load question');
      } finally {
        setLoading(false);
      }
    };

    // Generate a random background color with minimum brightness
    const generateRandomColor = () => {
      const getRandomComponent = () => Math.floor(Math.random() * 200 + 55); // Ensure minimum brightness
      const randomColor = `rgb(${getRandomComponent()}, ${getRandomComponent()}, ${getRandomComponent()})`;
      setBackgroundColor(randomColor);
    };

    // Call the functions when the component mounts
    fetchRandomQuestion();
    generateRandomColor();
  }, [token, id, setDroppedCardInfo]);

  const handleDragEnd = (event, info) => {
    if (onDragEnd && question) {
      onDragEnd(event, info, {
        id,
        questionId: question.id,
        correctAnswerIndex: question.correctAnswerIndex
      });
    }
  };

  return (
    <motion.div
      className={`card ${isDropped ? 'dropped' : ''} ${locked ? 'locked' : ''}`}
      drag={!locked}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      dragMomentum={false}
      whileDrag={{ scale: 0.5, zIndex: 10 }}
      whileHover={{ scale: isDropped || locked ? 1 : 1.05 }}
      style={{
        cursor: locked ? 'default' : (isDropped ? 'pointer' : 'grab'),
        backgroundColor
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="card-front">
        <div className="card-content">
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : (
            <>
              <p className="question-text">{question?.question || "No question available"}</p>
              {question && (
                <div className="choices-container">
                  {question.choices.map((choice, index) => (
                    <div
                      key={index}
                      className={`card-choice-item ${locked && index === question.correctAnswerIndex ? 'correct' : ''}`}
                    >
                      <span className="choice-marker">{String.fromCharCode(65 + index)}.</span>
                      <span className="choice-text">{choice}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Card;