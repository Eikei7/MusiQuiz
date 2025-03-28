import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './Card.css';
import { ENDPOINT_QUESTIONS_GET } from '../endpoints';

const cardColors = [
  '#FF6B6B',
  '#4ECDC4', 
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

const SHOWN_QUESTIONS_KEY = 'musiquiz_shown_questions';

const Card = ({
  id,
  token,
  onQuestionLoaded,
  isAnswerCorrect,
  selectedAnswer,
  showCorrectAnswer
}) => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('');
  const questionLoadedRef = useRef(false);
  const effectHasRunRef = useRef(false);

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

  // Get shown questions from storage
  const getShownQuestions = () => {
    const shownQuestions = sessionStorage.getItem(SHOWN_QUESTIONS_KEY);
    return shownQuestions ? JSON.parse(shownQuestions) : [];
  };

  // Add a question to the shown questions list
  const markQuestionAsShown = (questionId) => {
    const shownQuestions = getShownQuestions();
    if (!shownQuestions.includes(questionId)) {
      shownQuestions.push(questionId);
      sessionStorage.setItem(SHOWN_QUESTIONS_KEY, JSON.stringify(shownQuestions));
    }
  };

  // Reset shown questions (optional - could add a button for this)
  const resetShownQuestions = () => {
    sessionStorage.removeItem(SHOWN_QUESTIONS_KEY);
  };

  useEffect(() => {
    // Prevent effect from running more than once per instance
    if (effectHasRunRef.current) {
      return;
    }
    effectHasRunRef.current = true;
    
    // Reset question loaded flag
    questionLoadedRef.current = false;
    
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

        const allQuestions = await response.json();

        // If no questions available
        if (!allQuestions || allQuestions.length === 0) {
          setError('No questions available');
          setLoading(false);
          return;
        }

        // Get the list of already shown questions
        const shownQuestions = getShownQuestions();
        
        // Filter out questions that have already been shown
        const availableQuestions = allQuestions.filter(q => !shownQuestions.includes(q.id));
        
        // If all questions have been shown, either reset or show message
        if (availableQuestions.length === 0) {
          // Option 1: Reset the shown questions list and use all questions
          resetShownQuestions();
          console.log('All questions have been shown. Resetting the list.');
          
          // Use all questions after reset
          availableQuestions.push(...allQuestions);
        }

        // Select a random question from available questions
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const randomQuestion = availableQuestions[randomIndex];

        // Mark this question as shown
        markQuestionAsShown(randomQuestion.id);

        setQuestion(randomQuestion);
        
        // Notify parent component about the loaded question, but only once
        if (onQuestionLoaded && !questionLoadedRef.current) {
          // Add the category to the data passed to parent component
          const questionData = {
            id: randomQuestion.id,
            correctAnswerIndex: Number(randomQuestion.correctAnswerIndex),
            category: randomQuestion.category || 'General' // Pass the category info
          };
          console.log('Card: Sending question data with category:', questionData.category);
          onQuestionLoaded(questionData);
          questionLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Error fetching random question:', err);
        setError('Could not load question');
      } finally {
        setLoading(false);
      }
    };

    const selectRandomColor = () => {
      const randomIndex = Math.floor(Math.random() * cardColors.length);
      setBackgroundColor(cardColors[randomIndex]);
    };

    fetchRandomQuestion();
    selectRandomColor();
  }, [token, id, onQuestionLoaded]);

  return (
    <div className="card-container" style={{ perspective: '1000px' }}>
      <motion.div
        className="card"
        initial="initial"
        animate="animate"
        variants={cardVariants}
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
                <div className="card-header">
                  <div className="category-badge">{question?.category || "General"}</div>
                </div>
                <p className="question-text">{question?.question || "No question available"}</p>
                {question && (
                  <div className="choices-container">
                    {question.choices.map((choice, index) => (
                      <div
                        key={index}
                        className={`card-choice-item ${
                          // Highlight correct answer when showing result
                          showCorrectAnswer && index === question.correctAnswerIndex ? 'correct-answer' : ''
                        } ${
                          // Highlight selected answer
                          showCorrectAnswer && selectedAnswer === index ? 
                            (isAnswerCorrect ? 'selected-correct' : 'selected-incorrect') : ''
                        }`}
                      >
                        <span className="choice-marker">{String.fromCharCode(65 + index)}.</span>
                        <span className="choice-text">{choice}</span>
                        {showCorrectAnswer && index === question.correctAnswerIndex && (
                          <span className="correct-badge">✓</span>
                        )}
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