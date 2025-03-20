import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Card.css';
import { ENDPOINT_QUESTIONS_GET } from './endpoints';

const cardColors = [
  '#FF6B6B',
  '#4ECDC4', 
  '#FFD166',
  '#6A0572',
  '#FF8811',
  '#41B3A3',
  '#E27D60',
  '#C38D9E',
  '#85CDCA',
  '#E8A87C',
  '#8860D0',
  '#5AB9EA',
  '#84CEEB',
  '#5680E9',
  '#8860D0',
  '#F67280',
  '#7DCE82',
  '#F9C784',
  '#A0C1B8',
  '#FFBF69' 
];

const Card = ({
  id,
  token
}) => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('');

  // Animation variants for the card with flip effect
  const cardVariants = {
    initial: {
      scale: 0.1,
      rotate: -180,
      rotateY: 180, // Start flipped
      opacity: 0,
    },
    animate: {
      scale: 1,
      rotate: 0,
      rotateY: 0, // End normal
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: "easeOut",
        rotateY: {
          duration: 0.8, // Flip happens a bit faster than the full animation
        },
        scale: {
          duration: 1.2,
        },
        opacity: {
          duration: 0.6,
        }
      }
    }
  };

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

    // Select a random color from our predefined array
    const selectRandomColor = () => {
      const randomIndex = Math.floor(Math.random() * cardColors.length);
      setBackgroundColor(cardColors[randomIndex]);
    };

    // Call the functions when the component mounts
    fetchRandomQuestion();
    selectRandomColor();
  }, [token, id]);

  return (
    <div className="card-container" style={{ perspective: '1000px' }}>
      <motion.div
        className="card"
        initial="initial"
        animate="animate"
        variants={cardVariants}
        // whileHover={{ scale: 1.05 }}
        style={{
          cursor: 'default',
          backgroundColor,
          transformOrigin: 'center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden'
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
                        className="card-choice-item"
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
    </div>
  );
};

export default Card;