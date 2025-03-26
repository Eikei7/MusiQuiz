import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import './Chat.css';
import { ENDPOINT_CHAT } from '../endpoints';

const Chat = ({ ws: externalWs, selectedRoom, onPlayerJoin, onPlayerLeave }) => {
  const { getDisplayName } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [displayName, setDisplayName] = useState('');
  const chatContainerRef = useRef(null);
  // Track whether we've joined already to prevent duplicate join messages
  const [hasJoined, setHasJoined] = useState(false);

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

  // Join the chat with current display name when connection is established
  useEffect(() => {
    // Only send join message when connection is OPEN, we have a display name, and haven't joined yet
    if (ws && ws.readyState === WebSocket.OPEN && displayName && !hasJoined && connectionStatus === 'connected') {
      console.log('Sending join message with displayName:', displayName);
      
      try {
        ws.send(JSON.stringify({
          action: 'joinchat', // Make sure this matches the route in serverless.yml
          displayName,
          roomId: selectedRoom?.roomId
        }));
        
        // Mark that we've joined to prevent sending duplicate join messages
        setHasJoined(true);
      } catch (error) {
        console.error('Error joining chat:', error);
      }
    }
  }, [ws, displayName, selectedRoom, connectionStatus, hasJoined]);

  // Handle incoming messages
  useEffect(() => {
    if (!ws) return;
    
    let isMounted = true;
    
    // In the handleMessage function, add room filtering 
const handleMessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    
    // Only process messages for our room (or global messages)
    const messageRoomId = data.roomId || null;
    const ourRoomId = selectedRoom?.roomId || null;
    
    // Skip messages not intended for our room
    if (messageRoomId && ourRoomId && messageRoomId !== ourRoomId) {
      return;
    }
    
    if (isMounted) {
      // Handle regular chat messages
      if (data.type === "message" || (!data.type && data.message)) {
        setMessages((prev) => [...prev, { 
          message: data.message || data.content, 
          timestamp: data.timestamp || Date.now(), 
          displayName: data.displayName || data.sender,
          type: "message"
        }]);
      } 
      // Handle system messages (user join/leave, etc.)
      else if (data.type === "system") {
        // Process player join/leave events (if callbacks exist)
        if (data.content && onPlayerJoin && data.content.includes('joined the room')) {
          const playerName = data.content.split(' joined')[0];
          onPlayerJoin(playerName);
        }
        
        if (data.content && onPlayerLeave && data.content.includes('left the room')) {
          const playerName = data.content.split(' left')[0];
          onPlayerLeave(playerName);
        }
        
        setMessages((prev) => [...prev, {
          message: data.content,
          timestamp: data.timestamp || Date.now(),
          type: "system"
        }]);
      } 
          // Handle users list updates
          else if (data.type === "users") {
            console.log('Users list received:', data);
            // You can add additional state to track users if needed
          } 
          else {
            console.log('Message not handled by Chat component:', data);
          }
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
  }, [ws, onPlayerJoin, onPlayerLeave]);

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
            <div 
              className={`message ${msg.type === "system" ? "system-message" : ""}`} 
              key={`msg-${index}-${msg.timestamp}`}
            >
              {msg.type === "system" ? (
                <div className="system-message-content">
                  <em>{msg.message}</em>
                  <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              ) : (
                <>
                  <strong>{msg.displayName} {new Date(msg.timestamp).toLocaleTimeString()}:</strong> 
                  {msg.message}
                </>
              )}
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