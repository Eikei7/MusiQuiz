import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('pop');
  const [quizStarted, setQuizStarted] = useState(false);
  
  // Sample categories - you can expand or fetch these from your API
  const categories = [
    { id: 'pop', name: 'Pop Music' },
    { id: 'rock', name: 'Rock Classics' },
    { id: '80s', name: '80s Hits' },
    { id: 'hiphop', name: 'Hip Hop' },
    { id: 'country', name: 'Country' }
  ];

  useEffect(() => {
    // You could load user data or preferences here
    document.title = 'MusiQuiz - Dashboard';
  }, []);

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleQuit = () => {
    if (confirm('Are you sure you want to quit?')) {
      setQuizStarted(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <img src="/logo_small.png" alt="MusiQuiz logo" className="header-logo" />
        <div className="user-info">
          <span>Welcome, {user?.firstName || user?.email.split('@')[0]}!</span>
          <button onClick={logout} className="logout-button">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        {!quizStarted ? (
          <section className="quiz-setup">
            <h2>Ready to test your music knowledge?</h2>
            <div className="category-selection">
              <h3>Select a category:</h3>
              <div className="categories-grid">
                {categories.map(category => (
                  <div 
                    key={category.id}
                    className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="start-quiz-button"
              onClick={handleStartQuiz}
            >
              Start Quiz
            </button>
          </section>
        ) : (
          <section className="quiz-container">
            <div className="quiz-header">
              <h2>Category: {categories.find(c => c.id === selectedCategory)?.name}</h2>
              <button onClick={handleQuit} className="quit-button">Quit Quiz</button>
            </div>
            {/* This is a placeholder for your actual quiz implementation */}
            <div className="quiz-placeholder">
              <h3>Quiz Interface Would Go Here</h3>
              <p>This is a placeholder for your actual quiz implementation.</p>
              <p>You would typically load questions from your API and implement:</p>
              <ul>
                <li>Question display</li>
                <li>Multiple choice options</li>
                <li>Scoring system</li>
                <li>Timer (if applicable)</li>
                <li>Progress tracking</li>
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 MusiQuiz. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Dashboard;