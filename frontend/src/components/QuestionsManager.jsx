import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import QuestionForm from './QuestionForm';
import { ENDPOINT_QUESTIONS } from '../endpoints';
import './QuestionsManager.css';

// Get the same categories array from QuestionForm to keep consistency
const MUSIC_CATEGORIES = [
  "Classical",
  "Rock",
  "Pop",
  "Jazz",
  "Blues",
  "Hip Hop",
  "Electronic",
  "Country",
  "Folk",
  "World Music",
  "Music Theory",
  "Instruments",
  "Music History",
  "General",
  "Music Technology",
  "Musical",
  "Awards",
  "Video game music"
];

function QuestionsManager() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [token]);
  // Fetch questions from API
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      let url = ENDPOINT_QUESTIONS;
      
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
  // Filter questions based on search query and category
  const filteredQuestions = useMemo(() => {
    let filtered = questions;
    
    // Filter by category if selected
    if (categoryFilter) {
      filtered = filtered.filter(question => 
        question.category === categoryFilter
      );
    }
    
    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(question => 
        question.question?.toLowerCase().includes(query) ||
        question.choices?.some(choice => choice.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [questions, searchQuery, categoryFilter]);

  const handleQuestionAdded = () => {
    fetchQuestions();
    setShowForm(false);
    setEditingQuestion(null);
  };
  // Handle edit question
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
      <div className="admin-toolbar">
        <button 
          className="add-question-btn"
          onClick={() => {
          setEditingQuestion(null);
          setShowForm(!showForm);
         }}
        >
        {showForm ? 'Cancel' : 'Add New Question'}
        </button>

        <div className="filter-container">
          <select
            className="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {MUSIC_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="question-count">
          <span>{!loading && (filteredQuestions.length + " question(s) found")}</span>
        </div>

        <div className="admin-search">
          <input 
          type="text" 
          placeholder="Search questions..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
          <button 
          className="search-clear-button"
          onClick={() => setSearchQuery('')}
          >
          ×
          </button>
          )}
        </div>
      </div>
      
      {error && <div className="questions-error">{error}</div>}
      
      {showForm && (
        <QuestionForm 
          onQuestionAdded={handleQuestionAdded} 
          token={token}
          editQuestion={editingQuestion}
        />
      )}

      {loading ? (
        <div className="questions-loading">Loading questions...</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="no-questions">
          <p>{searchQuery || categoryFilter 
              ? 'No matching questions found.' 
              : 'No questions found. Add your first question to get started!'}
          </p>
        </div>
      ) : (
        <table className="questions-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Category</th>
              <th>Option A</th>
              <th>Option B</th>
              <th>Option C</th>
              <th>Option D</th>
              <th>Correct Answer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((question) => (
              <tr key={question.id}>
                <td className="question-text-table">{question.question}</td>
                <td>{question.category || 'General'}</td>
                <td>{question.choices[0] || '-'}</td>
                <td>{question.choices[1] || '-'}</td>
                <td>{question.choices[2] || '-'}</td>
                <td>{question.choices[3] || '-'}</td>
                <td className="correct-answer">
                  {question.choices[question.correctAnswerIndex] || '-'}
                </td>
                <td className='edit-delete-btns'>
                  <button 
                    className="action-button edit-button"
                    onClick={() => handleEdit(question)}
                  >
                    Edit
                  </button>
                  <button 
                    className="action-button delete-button"
                    onClick={() => handleDelete(question.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default QuestionsManager;