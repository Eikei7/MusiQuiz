import React, { useState, useEffect } from 'react';
import { useAuth, getTokenExpiration } from '../auth/AuthContext';

const TokenExpirationTimer = () => {
  const { token, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  
  useEffect(() => {
    if (!token) return;
    
    const expiration = getTokenExpiration(token);
    if (!expiration) return;
    
    const updateTimeLeft = () => {
      const now = new Date();
      const diffMs = expiration - now;
      
      if (diffMs <= 0) {
        // Token has expired, trigger logout
        logout();
        return;
      }
      
      // Format the time remaining
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      // Set warning state if less than 5 minutes left
      setIsExpiringSoon(diffMs < 300000);
    };
    
    // Update immediately and then every second
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [token, logout]);
  
  if (!token || !timeLeft) return null;
  
  return (
    <div className={`token-expiration ${isExpiringSoon ? 'expiring-soon' : ''}`}>
      <span className="expiration-icon">🕒</span>
      <span className="expiration-text">
        Session expires in: {timeLeft}
      </span>
    </div>
  );
};

export default TokenExpirationTimer;