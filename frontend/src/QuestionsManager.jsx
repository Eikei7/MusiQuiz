import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import QuestionForm from './QuestionForm';
import { ENDPOINT_QUESTIONS } from './endpoints';
import './QuestionsManager.css';

function QuestionsManager() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Sample categories - replace with your actual categories
  const categories = [
    { id: 'pop', name: 'Pop Music' },
    { id: 'rock', name: 'Rock Classics' },
    { id: '80s', name: '80s Hits' },
    { id: 'hiphop', name: 'Hip Hop' },
    { id: 'country', name: 'Country' }
  ];

  useEffect(() => {
    fetchQuestions();
  }, [token, selectedCategory]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      let url = ENDPOINT_QUESTIONS;
      
      // Add category filter if not showing all
      if (selectedCategory !== 'all') {
        url += `?category=${selectedCategory}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(data);
      setError('');
    } catch (err) {
      setError('Error loading questions: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionAdded = () => {
    fetchQuestions();
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    try {
      const response = await fetch(`${ENDPOINT_QUESTIONS}/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete question');
      }

      // Remove question from local state
      setQuestions(questions.filter(q => q.id !== questionId));
      
    } catch (err) {
      setError('Error deleting question: ' + err.message);
      console.error(err);
    }
  };

  return (
    <div className="questions-manager">
      <div className="question-header">
        <h1>Quiz Questions</h1>
        <button 
          className="add-question-btn"
          onClick={() => {
            setEditingQuestion(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'Add New Question'}
        </button>
      </div>
      
      {error && <div className="questions-error">{error}</div>}

      {showForm && (
        <QuestionForm 
          onQuestionAdded={handleQuestionAdded} 
          token={token}
          categories={categories}
          editQuestion={editingQuestion}
        />
      )}

      <div className="question-filters">
        <div className="category-filter">
          <label htmlFor="category-select">Filter by category:</label>
          <select 
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="question-count">
          {!loading && <span>{questions.length} question(s) found</span>}
        </div>
      </div>

      {loading ? (
        <div className="questions-loading">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="no-questions">
          <p>No questions found. Add your first question to get started!</p>
        </div>
      ) : (
        <div className="question-list">
          {questions.map((question) => (
            <div key={question.id} className="question-card">
              <div className="question-content">
                <h3>{question.question}</h3>
                
                <div className="question-meta">
                  <span className="question-category">
                    {categories.find(c => c.id === question.category)?.name || question.category}
                  </span>
                  <span className="question-date">
                    Created: {new Date(question.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="choices-list">
                  {question.choices.map((choice, index) => (
                    <div 
                      key={index} 
                      className={`choice-item ${index === question.correctAnswerIndex ? 'correct' : ''}`}
                    >
                      <span className="choice-number">{index + 1}</span>
                      <span className="choice-text">{choice}</span>
                      {index === question.correctAnswerIndex && (
                        <span className="correct-badge">Correct</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="question-actions">
                <button 
                  className="edit-question"
                  onClick={() => handleEdit(question)}
                >
                  Edit
                </button>
                <button 
                  className="delete-question"
                  onClick={() => handleDelete(question.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuestionsManager;