import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './Card.css';
import { supabase } from '../supabaseClient';

const cardColors = [
  '#FF6B6B', '#4ECDC4', '#6A0572', '#FF8811', '#41B3A3',
  '#E27D60', '#C38D9E', '#85CDCA', '#E8A87C', '#8860D0',
  '#5AB9EA', '#84CEEB', '#5680E9', '#F67280', '#7DCE82',
  '#F9C784', '#A0C1B8', '#FFBF69'
];

const SHOWN_QUESTIONS_KEY = 'musiquiz_shown_questions';

const Card = ({
  id,
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
      rotateY: 180,
      opacity: 0,
    },
    animate: {
      scale: 1,
      rotate: 0,
      rotateY: 0,
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: "easeOut",
        rotateY: {
          duration: 0.8,
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

  const resetShownQuestions = () => {
    sessionStorage.removeItem(SHOWN_QUESTIONS_KEY);
  };

  // Function to fetch a random question using Supabase
  const fetchRandomQuestion = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch only question IDs (lightweight query)
      const { data: allIds, error: idsError } = await supabase
        .from('questions')
        .select('id');

      if (idsError) throw idsError;

      if (!allIds || allIds.length === 0) {
        setError('No questions available');
        return;
      }

      // Step 2: Filter out already shown questions
      const shownQuestions = getShownQuestions();
      let availableIds = allIds.map(q => q.id).filter(id => !shownQuestions.includes(id));

      // Step 3: Reset if all have been shown
      if (availableIds.length === 0) {
        resetShownQuestions();
        availableIds = allIds.map(q => q.id);
      }

      // Step 4: Pick a random ID and fetch just that one question
      const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('id, question, choices, correctAnswerIndex, category')
        .eq('id', randomId)
        .single();

      if (questionError) throw questionError;

      const choices = JSON.parse(questionData.choices);
      markQuestionAsShown(questionData.id);

      setQuestion({
        ...questionData,
        choices: choices.map(choice => choice.S)
      });

      if (onQuestionLoaded && !questionLoadedRef.current) {
        onQuestionLoaded({
          id: questionData.id,
          correctAnswerIndex: Number(questionData.correctAnswerIndex),
          category: questionData.category || 'General'
        });
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

  useEffect(() => {
    // Prevent effect from running more than once per instance
    if (effectHasRunRef.current) {
      return;
    }
    effectHasRunRef.current = true;

    // Reset question loaded flag
    questionLoadedRef.current = false;

    fetchRandomQuestion();
    selectRandomColor();
  }, [id, onQuestionLoaded]);

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
