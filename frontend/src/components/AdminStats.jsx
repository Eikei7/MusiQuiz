import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AdminStats.css';

const AdminStats = () => {
  const { user } = useAuth();
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

    // Return formatted date string based on days difference
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

        // Fetch all users and their stats from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (error) throw error;

        setUsersStats(data || []);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.user_metadata?.role === 'admin') {
      fetchAllUserStats();
    } else {
      setError('Admin access required');
      setLoading(false);
    }
  }, [user]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort the users data
  const sortedUsers = [...usersStats].sort((a, b) => {
    let aValue, bValue;
    if (sortField.includes('.')) {
      const [parent, child] = sortField.split('.');
      aValue = a[parent] ? a[parent][child] : 0;
      bValue = b[parent] ? b[parent][child] : 0;
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
    }
    // Handle undefined or null values
    if ((aValue === undefined || aValue === null) && (bValue === undefined || bValue === null)) {
      return 0;
    } else if (aValue === undefined || aValue === null) {
      return sortDirection === 'asc' ? 1 : -1;
    } else if (bValue === undefined || bValue === null) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    // Handle numeric values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    // Handle string values safely
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    // Convert to strings for comparison if types don't match
    const aStr = String(aValue || '');
    const bStr = String(bValue || '');
    return sortDirection === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
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
              <th onClick={() => handleSort('first_name')}>
                Name{renderSortIcon('first_name')}
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
              <th onClick={() => handleSort('last_login')}>
                Last Login{renderSortIcon('last_login')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.email}>
                <td>{user.email}</td>
                <td>{`${user.first_name || ''} ${user.last_name || ''}`}</td>
                <td>{user.stats?.gamesPlayed || 0}</td>
                <td>{user.stats?.gamesWon || 0}</td>
                <td>{user.stats?.gamesLost || 0}</td>
                <td>{user.stats?.winRate || 0}%</td>
                <td>{formatLastLogin(user.last_login)}</td>
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