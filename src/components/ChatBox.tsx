import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface ChatBoxProps {
  gameId: string;
  currentPlayerId: string;
  currentPlayerUsername: string;
  socket?: any;  // Use the actual socket type from your project
  messages?: ChatMessage[];
}

const ChatBox: React.FC<ChatBoxProps> = ({
  gameId,
  currentPlayerId,
  currentPlayerUsername,
  socket,
  messages = []
}) => {
  const [inputValue, setInputValue] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Listen for incoming chat messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data: ChatMessage) => {
      setChatMessages(prevMessages => [...prevMessages, data]);
    };

    socket.on('chatMessage', handleChatMessage);

    return () => {
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !socket) return;

    // Send message to server
    socket.emit('chatMessage', {
      gameId,
      playerId: currentPlayerId,
      username: currentPlayerUsername,
      message: inputValue.trim()
    });
    
    // Clear input
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const containerStyle: React.CSSProperties = {
    background: 'rgb(23 23 23 / 0.9)',
    borderRadius: '0.75rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '500px',
    minHeight: '400px',
    maxHeight: '600px',
    width: '100%',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '1rem',
    borderBottom: '1px solid rgb(38 38 38)',
    fontWeight: '600',
    fontSize: '1.125rem',
    color: 'white',
    backgroundColor: 'rgb(23 23 23)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const messagesContainerStyle: React.CSSProperties = {
    padding: '1rem',
    overflowY: 'auto' as const,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    scrollBehavior: 'smooth' as const,
    backgroundColor: 'rgb(23 23 23 / 0.9)',
  };

  const messageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as const,
    maxWidth: '80%',
    gap: '0.25rem',
  };

  const selfMessageStyle: React.CSSProperties = {
    ...messageStyle,
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  };

  const otherMessageStyle: React.CSSProperties = {
    ...messageStyle,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  };

  const messageContentStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderRadius: '1rem',
    fontSize: '0.9375rem',
    wordBreak: 'break-word' as const,
    maxWidth: '100%',
    lineHeight: '1.4',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  };

  const selfMessageContentStyle: React.CSSProperties = {
    ...messageContentStyle,
    backgroundColor: '#3730a3',
    color: 'white',
    borderBottomRightRadius: '0.25rem',
  };

  const otherMessageContentStyle: React.CSSProperties = {
    ...messageContentStyle,
    backgroundColor: 'rgb(38 38 38)',
    color: 'white',
    borderBottomLeftRadius: '0.25rem',
  };

  const metaInfoStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'rgb(163 163 163)',
    marginTop: '0.125rem',
  };

  const inputContainerStyle: React.CSSProperties = {
    padding: '1rem',
    borderTop: '1px solid rgb(38 38 38)',
    display: 'flex',
    gap: '0.75rem',
    backgroundColor: 'rgb(23 23 23)',
  };

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid rgb(38 38 38)',
    resize: 'none',
    fontSize: '0.9375rem',
    lineHeight: 1.4,
    minHeight: '2.5rem',
    maxHeight: '6rem',
    backgroundColor: 'rgb(38 38 38)',
    color: 'white',
    transition: 'all 0.15s ease-in-out',
    outline: 'none',
  };

  const sendButtonStyle: React.CSSProperties = {
    width: '2.5rem',
    height: '2.5rem',
    backgroundColor: '#3730a3',
    color: 'white',
    borderRadius: '0.75rem',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease-in-out',
  };

  const sendButtonDisabledStyle: React.CSSProperties = {
    ...sendButtonStyle,
    backgroundColor: 'rgb(38 38 38)',
    cursor: 'not-allowed',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
        </svg>
        Chat
      </div>
      
      <div style={messagesContainerStyle}>
        {chatMessages.length === 0 ? (
          <div style={{ 
            color: 'rgb(163 163 163)', 
            fontSize: '0.875rem', 
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'rgb(38 38 38)',
            borderRadius: '0.75rem',
            margin: '1rem 0'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          chatMessages.map(msg => (
            <div 
              key={msg.id} 
              style={msg.playerId === currentPlayerId ? selfMessageStyle : otherMessageStyle}
            >
              {msg.playerId !== currentPlayerId && (
                <div style={{ 
                  fontWeight: '500', 
                  fontSize: '0.875rem', 
                  marginBottom: '0.25rem',
                  color: '#4b5563'
                }}>
                  {msg.username}
                </div>
              )}
              <div 
                style={msg.playerId === currentPlayerId ? selfMessageContentStyle : otherMessageContentStyle}
              >
                {msg.message}
              </div>
              <div style={metaInfoStyle}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={inputContainerStyle}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          style={textareaStyle}
          placeholder="Type a message..."
          rows={1}
          onFocus={(e) => {
            e.target.style.borderColor = '#3730a3';
            e.target.style.boxShadow = '0 0 0 2px rgba(55, 48, 163, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgb(38 38 38)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <button 
          onClick={handleSendMessage}
          style={!inputValue.trim() ? sendButtonDisabledStyle : sendButtonStyle}
          disabled={!inputValue.trim()}
          onMouseEnter={(e) => {
            if (inputValue.trim()) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#312e81';
              (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (inputValue.trim()) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3730a3';
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatBox; 