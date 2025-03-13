import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Card.css';
import { ENDPOINT_QUESTIONS_GET } from './endpoints';

const Card = ({
  id,
  isDropped,
  onDragEnd,
  locked,
  token // Add token for API authorization
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
  }, [token]);

  const handleDragStart = () => {
    const cardData = {
      id,
      questionId: question?.id // Include the question ID in the drag data
    };

    const event = new Event('dragstart');
    event.dataTransfer = {
      setData: () => {},
      getData: () => JSON.stringify(cardData)
    };
  };

  return (
    <motion.div
      className={`card ${isDropped ? 'dropped' : ''}`}
      drag={!locked}
      dragMomentum={false}
      whileDrag={{ scale: 0.7 }}
      whileHover={{ scale: isDropped ? 1 : 1.05 }}
      style={{
        cursor: isDropped ? (locked ? 'default' : 'pointer') : 'grab',
        backgroundColor: backgroundColor // Apply the random background color
      }}
      onDragStart={handleDragStart}
      onDragEnd={(event, info) => {
        if (onDragEnd) {
          onDragEnd(event, info, {
            id,
            questionId: question?.id
          });
        }
      }}
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
                      className={`card-choice-item ${isDropped && index === question.correctAnswerIndex ? 'correct' : ''}`}
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