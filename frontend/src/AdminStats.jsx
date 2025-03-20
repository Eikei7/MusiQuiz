import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ENDPOINT_USERS_STATS_ALL } from './endpoints';
import './AdminStats.css'; // You'll create this file for styling

const AdminStats = () => {
  const { token, user } = useAuth();
  const [usersStats, setUsersStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('email');
  const [sortDirection, setSortDirection] = useState('asc');

  const formatLastLogin = (timestamp) => {
    if (!timestamp) return 'Never logged in';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString([], { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  useEffect(() => {
    const fetchAllUserStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${ENDPOINT_USERS_STATS_ALL}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You do not have permission to view this data');
          }
          throw new Error('Failed to fetch user statistics');
        }

        const data = await response.json();
        setUsersStats(data.users || []);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchAllUserStats();
    } else {
      setError('Admin access required');
      setLoading(false);
    }
  }, [token, user]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for a new field
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort the users data
  const sortedUsers = [...usersStats].sort((a, b) => {
    let aValue, bValue;

    if (sortField.includes('.')) {
      // Handle nested fields like 'stats.gamesPlayed'
      const [parent, child] = sortField.split('.');
      aValue = a[parent] ? a[parent][child] : 0;
      bValue = b[parent] ? b[parent][child] : 0;
    } else {
      // Handle top-level fields
      aValue = a[sortField];
      bValue = b[sortField];
    }

    // Handle numeric values
    if (typeof aValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle string values
    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  if (loading) {
    return <div className="loading">Loading user statistics...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const renderSortIcon = (field) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="admin-stats-container">
      
      <div className="stats-table-container">
        <table className="stats-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('email')}>
                Email{renderSortIcon('email')}
              </th>
              <th onClick={() => handleSort('firstName')}>
                Name{renderSortIcon('firstName')}
              </th>
              <th onClick={() => handleSort('stats.gamesPlayed')}>
                Games Played{renderSortIcon('stats.gamesPlayed')}
              </th>
              <th onClick={() => handleSort('stats.gamesWon')}>
                Wins{renderSortIcon('stats.gamesWon')}
              </th>
              <th onClick={() => handleSort('stats.gamesLost')}>
                Losses{renderSortIcon('stats.gamesLost')}
              </th>
              <th onClick={() => handleSort('stats.winRate')}>
                Win Rate{renderSortIcon('stats.winRate')}
              </th>
              <th onClick={() => handleSort('lastLogin')}>
                Last Login{renderSortIcon('lastLogin')}
            </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.email}>
                <td>{user.email}</td>
                <td>{`${user.firstName || ''} ${user.lastName || ''}`}</td>
                <td>{user.stats?.gamesPlayed || 0}</td>
                <td>{user.stats?.gamesWon || 0}</td>
                <td>{user.stats?.gamesLost || 0}</td>
                <td>{user.stats?.winRate || 0}%</td>
                <td>{formatLastLogin(user.lastLogin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-summary">
        <h3>Summary Statistics</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">
              {usersStats.length}
            </div>
            <div className="summary-label">Total Users</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {usersStats.reduce((sum, user) => sum + (user.stats?.gamesPlayed || 0), 0)}
            </div>
            <div className="summary-label">Total Games Played</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {Math.round(
                usersStats.reduce((sum, user) => sum + (user.stats?.winRate || 0), 0) / 
                (usersStats.filter(user => user.stats?.gamesPlayed > 0).length || 1)
              )}%
            </div>
            <div className="summary-label">Average Win Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;