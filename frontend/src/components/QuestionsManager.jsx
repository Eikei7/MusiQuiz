import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import QuestionForm from './QuestionForm';
import './QuestionsManager.css';

const MUSIC_CATEGORIES = [
  "Awards",
  "Blues",
  "Classical",
  "Country",
  "Dansband",
  "Disco",
  "Electronic",
  "Events",
  "Folk",
  "General",
  "Hip Hop",
  "Instruments",
  "Jazz",
  "Metal",
  "Music Technology",
  "Music Theory",
  "Musical",
  "Pop",
  "Punk",
  "Rock",
  "Soul",
  "Video game music",
  "World Music"
];

function QuestionsManager() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user from Supabase
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    getCurrentUser();
    fetchQuestions();
  }, []);

  // Fetch questions from Supabase
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*');

      if (error) throw error;
      setQuestions(data || []);
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
    filtered = filtered.filter(question => {
      // Safely handle choices array
      const choices = Array.isArray(question.choices) ? question.choices : [];
      
      return (
        question.question?.toLowerCase().includes(query) ||
        choices.some(choice => 
          typeof choice === 'string' && choice.toLowerCase().includes(query)
        )
      );
    });
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
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

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
          user={currentUser}
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