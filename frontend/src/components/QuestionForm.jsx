import { useState } from 'react';
import { ENDPOINT_QUESTIONS } from '../endpoints';
import './QuestionForm.css';

function QuestionForm({ onQuestionAdded, token, editQuestion }) {
  const [formData, setFormData] = useState(editQuestion || {
    question: '',
    choices: ['', '', '', ''],
    correctAnswerIndex: 0
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  // Handle choice input change
  const handleChoiceChange = (index, value) => {
    const updatedChoices = [...formData.choices];
    updatedChoices[index] = value;
    setFormData({
      ...formData,
      choices: updatedChoices
    });
  };
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate form
    if (!formData.question.trim()) {
      setError('Question text is required');
      return;
    }
    
    // Check if all choices have content
    if (formData.choices.some(choice => !choice.trim())) {
      setError('All choices must have content');
      return;
    }
    
    setLoading(true);
    // Prepare data for API
    try {
      const isEditing = !!editQuestion?.id;
      const url = isEditing 
        ? `${ENDPOINT_QUESTIONS}/${editQuestion.id}` 
        : ENDPOINT_QUESTIONS;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save question');
      }
      
      setSuccess(isEditing ? 'Question updated successfully!' : 'Question added successfully!');
      
      if (!isEditing) {
        // Reset form after successful creation
        setFormData({
          question: '',
          choices: ['', '', '', ''],
          correctAnswerIndex: 0
        });
      }
      
      // Notify parent component
      if (onQuestionAdded) {
        onQuestionAdded(data);
      }
      
    } catch (error) {
      setError(error.message || 'An error occurred saving the question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="question-form-container">
      <h2>{editQuestion ? 'Edit Question' : 'Add New Question'}</h2>
      
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="question-form">
        <div className="form-group">
          <label htmlFor="question">Question:</label>
          <textarea
            id="question"
            name="question"
            value={formData.question}
            onChange={handleChange}
            required
            placeholder="Enter your question here..."
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label>Answer Choices:</label>
          
          {formData.choices.map((choice, index) => (
            <div key={index} className="choice-row">
              <div className="choice-input">
                <input
                  type="radio"
                  id={`correct-${index}`}
                  name="correctAnswerIndex"
                  value={index}
                  checked={parseInt(formData.correctAnswerIndex) === index}
                  onChange={() => setFormData({...formData, correctAnswerIndex: index})}
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => handleChoiceChange(index, e.target.value)}
                  placeholder={`Choice ${index + 1}`}
                  required
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="save-question"
            disabled={loading}
          >
            {loading ? 'Saving...' : (editQuestion ? 'Update Question' : 'Save Question')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuestionForm;