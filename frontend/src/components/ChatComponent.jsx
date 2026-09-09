import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ChatComponent.css';

const ChatComponent = ({ roomId, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(user || null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const userNameCache = useRef({});

  useEffect(() => {
    if (user) {
      const userObj = {
        id: user.id,
        name: user.email?.split('@')[0] || 'Anonymous'
      };
      setCurrentUser(userObj);
      userNameCache.current[user.id] = userObj.name;
      setLoading(false);
    } else {
      getCurrentUser();
    }
  }, [user]);

  useEffect(() => {
    if (!currentUser || !roomId) return;

    fetchMessages();

    const channel = supabase
      .channel(`room-chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const senderId = payload.new.user_id;
          if (!userNameCache.current[senderId]) {
            const { data: profile } = await supabase
              .from('users')
              .select('first_name')
              .eq('id', senderId)
              .single();
            userNameCache.current[senderId] = profile?.first_name || 'Anonymous';
          }
          setMessages(prev => [...prev, { ...payload.new, user_name: userNameCache.current[senderId] }]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.email?.split('@')[0] || 'Anonymous'
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error getting current user:', error);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_id, room_id, created_at')
        .eq('room_id', roomId)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Build name cache for all unique senders in one query
      const senderIds = [...new Set(data.map(m => m.user_id))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, first_name')
          .in('id', senderIds);
        profiles?.forEach(p => {
          userNameCache.current[p.id] = p.first_name || 'Anonymous';
        });
      }

      const messagesWithNames = data.map(m => ({
        ...m,
        user_name: userNameCache.current[m.user_id] || (m.user_id === currentUser.id ? currentUser.name : 'Anonymous'),
      }));

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      const messageData = {
        content: newMessage.trim(),
        user_id: currentUser.id,
        room_id: roomId,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('messages').insert([messageData]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const cleanupInterval = setInterval(async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { error } = await supabase
          .from('messages')
          .delete()
          .lt('created_at', fiveMinutesAgo)
          .eq('room_id', roomId);
          
        if (error) throw error;
      } catch (error) {
        console.error('Error cleaning up old messages:', error);
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, [currentUser, roomId]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (message) => {
    return currentUser && message.user_id === currentUser.id;
  };

  if (loading) return null;
  if (!currentUser) return null;

  return (
    <div className="chat-container">
      <div className="status-text">
        <MessageCircle size={16} style={{ display: 'inline', marginRight: '4px' }} />
        Room Chat (5 min history)
      </div>

      <div className="chat">
        {messages.length === 0 ? (
          <div className="empty-chat-message">
            No recent messages. Start the conversation! 💬
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${isOwnMessage(message) ? 'own-message' : ''}`}>
              <strong>
                {isOwnMessage(message) ? `${currentUser.name} (You)` : message.user_name}
              </strong>
              <div>
                {message.content}
                <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '8px' }}>
                  {formatTime(message.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-send">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="send-button"
        >
          <Send size={16} style={{ marginRight: '4px' }} />
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
