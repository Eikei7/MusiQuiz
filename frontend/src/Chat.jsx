import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from './AuthContext'; // Import your Auth context
import './Chat.css';

const Chat = () => {
  const { user } = useAuth(); // Get user from your Auth context
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [displayName, setDisplayName] = useState('');
  const chatContainerRef = useRef(null);

  // Set display name based on user info from Auth context
  useEffect(() => {
    if (user) {
      // Use firstName if available, otherwise use first part of email
      const name = user.firstName || 
                   (user.email ? user.email.split('@')[0] : 'User');
      
      setDisplayName(name);
    } else {
      // Fallback to JWT token if Auth context doesn't have user info
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          const name = decoded.firstName || decoded.name || 
                      (decoded.email ? decoded.email.split('@')[0] : 'User');
          setDisplayName(name);
        } catch (error) {
          console.error('Failed to decode JWT token:', error);
          setDisplayName('User');
        }
      } else {
        setDisplayName('Guest');
      }
    }
  }, [user]);

  useEffect(() => {
    const websocket = new WebSocket('wss://4nymssc2pg.execute-api.eu-north-1.amazonaws.com/dev');

    websocket.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
    };
    websocket.onmessage = (event) => {
      const { message, timestamp, displayName } = JSON.parse(event.data);
      setMessages((prev) => [...prev, { message, timestamp, displayName }]);
    };
    websocket.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('disconnected');
    };
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };
    setWs(websocket);

    return () => websocket.close();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (ws && input) {
      ws.send(JSON.stringify({ action: 'sendmessage', message: input, displayName }));
      setInput('');
    }
  };

  // Function to get status text and color
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Online', color: '#4cda39' };
      case 'error':
        return { text: 'Error', color: 'red' };
      case 'disconnected':
        return { text: 'Offline', color: 'gray' };
      default:
        return { text: 'Connecting...', color: 'orange' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className='chat-container'>
      <div className='status-text' style={{ color: statusInfo.color }}>
        Status: {statusInfo.text}
      </div>
      <div className='chat' ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-chat-message">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, index) => (
            <div className="message" key={index}>
              <strong>{msg.displayName} {new Date(msg.timestamp).toLocaleTimeString()}:</strong> 
              {msg.message}
            </div>
          ))
        )}
      </div>
      <div className='input-send'>
      <input
        className="message-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Type a message..."
      />
      <button className="send-button" onClick={sendMessage}>Send</button>
    </div>
    </div>
  );
};

export default Chat;