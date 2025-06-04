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

  return (
    <div className="chatbox-container bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col h-[500px] min-h-[400px] max-h-[600px] w-full overflow-hidden">
      {/* Header */}
      <div className="chatbox-header bg-slate-50 border-b border-slate-200 p-4 font-semibold text-lg text-slate-800 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
        </svg>
        Chat
      </div>
      
      {/* Messages Container */}
      <div className="chatbox-messages p-4 overflow-y-auto flex-grow flex flex-col gap-4 bg-slate-50/50">
        {chatMessages.length === 0 ? (
          <div className="text-slate-500 text-sm text-center p-8 bg-slate-100 rounded-xl border border-slate-200">
            No messages yet. Start the conversation!
          </div>
        ) : (
          chatMessages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex flex-col max-w-[80%] gap-1 ${
                msg.playerId === currentPlayerId 
                  ? 'self-end items-end' 
                  : 'self-start items-start'
              }`}
            >
              {msg.playerId !== currentPlayerId && (
                <div className="font-medium text-sm mb-1 text-slate-600">
                  {msg.username}
                </div>
              )}
              {msg.playerId === currentPlayerId && (
                <div className="font-medium text-sm mb-1 text-slate-600 text-right">
                  {msg.username} (me)
                </div>
              )}
              <div 
                className={`px-4 py-3 rounded-2xl text-sm break-words max-w-full leading-relaxed shadow-sm ${
                  msg.playerId === currentPlayerId 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                }`}
              >
                {msg.message}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {formatTime(msg.timestamp)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Container */}
      <div className="chatbox-input bg-white border-t border-slate-200 p-4 flex gap-3">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 resize-none text-sm leading-relaxed min-h-[2.5rem] max-h-24 bg-white text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Type a message..."
          rows={1}
        />
        <button 
          onClick={handleSendMessage}
          className={`w-10 h-10 rounded-xl border-none cursor-pointer flex items-center justify-center transition-all duration-150 ${
            !inputValue.trim() 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }`}
          disabled={!inputValue.trim()}
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