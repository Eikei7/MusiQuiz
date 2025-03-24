import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import './Chat.css';
import { ENDPOINT_CHAT } from '../endpoints';

const Chat = ({ ws: externalWs, selectedRoom }) => {
  const { getDisplayName } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [displayName, setDisplayName] = useState('');
  const chatContainerRef = useRef(null);

  // Set display name based on user info from Auth context
  useEffect(() => {
    setDisplayName(getDisplayName());
  }, [getDisplayName]);

  useEffect(() => {
    if (externalWs) {
      console.log('Using external WebSocket connection');
      setWs(externalWs);
      setConnectionStatus(externalWs.readyState === WebSocket.OPEN ? 'connected' : 'connecting');
      
      const handleOpen = () => {
        console.log('External WebSocket connection opened');
        setConnectionStatus('connected');
      };
      
      const handleClose = () => {
        console.log('External WebSocket connection closed');
        setConnectionStatus('disconnected');
      };
      
      const handleError = (error) => {
        console.error('External WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      // Add listeners to external WebSocket
      if (externalWs.readyState !== WebSocket.OPEN) {
        externalWs.addEventListener('open', handleOpen);
      }
      externalWs.addEventListener('close', handleClose);
      externalWs.addEventListener('error', handleError);
      
      return () => {
        // Remove listeners from external WebSocket
        externalWs.removeEventListener('open', handleOpen);
        externalWs.removeEventListener('close', handleClose);
        externalWs.removeEventListener('error', handleError);
      };
    } else {
      // Create our own WebSocket if none is provided
      console.log('Creating new WebSocket connection');
      const websocket = new WebSocket(ENDPOINT_CHAT);
      
      websocket.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
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
    }
  }, [externalWs]);

  // Handle incoming messages
  useEffect(() => {
    if (!ws) return;
    
    let isMounted = true;
    
    const handleMessage = (event) => {
      console.log('WebSocket message received:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        // Only handle chat messages, not room updates
        if (data.type === "message" || (!data.type && data.message)) {
          console.log('Chat message received:', data);
          if (isMounted) {
            setMessages((prev) => [...prev, { 
              message: data.message, 
              timestamp: data.timestamp || Date.now(), 
              displayName: data.displayName 
            }]);
          }
        } else {
          console.log('Message not handled by Chat component:', data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.addEventListener('message', handleMessage);
    
    return () => {
      isMounted = false;
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    if (!input.trim()) return;
    
    try {
      ws.send(JSON.stringify({ 
        action: 'sendmessage', 
        message: input, 
        displayName,
        roomId: selectedRoom?.roomId // Include roomId if available
      }));
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      // You might want to show a user-friendly error here
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
            <div className="message" key={`msg-${index}-${msg.timestamp}`}>
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