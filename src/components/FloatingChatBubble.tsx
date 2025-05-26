import React, { useState, useEffect, useRef } from 'react';
import ChatBox from './ChatBox';

interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface FloatingChatBubbleProps {
  gameId: string;
  currentPlayerId: string;
  currentPlayerUsername: string;
  socket?: any;
  messages?: ChatMessage[];
}

// Brown colors for the chat bubble - matching music player
const BROWN = {
  main: '#8B4513',      // SaddleBrown - main button color
  hover: '#A0522D',     // Sienna - hover button color
  light: '#DEB887',     // BurlyWood - light brown for backgrounds
  dark: '#654321',      // Dark brown for accents
  lightest: '#F5DEB3',  // Wheat - lightest brown for selected items
  text: '#3E2723'       // Very dark brown for text
};

const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({
  gameId,
  currentPlayerId,
  currentPlayerUsername,
  socket,
  messages = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadIndex, setLastReadIndex] = useState(messages.length);
  const [lastNotificationSound, setLastNotificationSound] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    notificationSound.current = new Audio('/sounds/notification.mp3');
  }, []);

  // Track unread messages and play notification sound
  useEffect(() => {
    if (!isOpen && messages.length > lastReadIndex) {
      setUnreadCount(messages.length - lastReadIndex);
      
      // Play notification sound with cooldown
      const now = Date.now();
      if (now - lastNotificationSound > 1000) { // 1 second cooldown
        notificationSound.current?.play().catch(err => console.error('Error playing notification:', err));
        setLastNotificationSound(now);
      }
    }
  }, [messages, isOpen, lastReadIndex, lastNotificationSound]);

  // Reset unread count when opening the chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setLastReadIndex(messages.length);
    }
  }, [isOpen, messages.length]);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-24 right-8 z-50" ref={chatRef}>
      {/* Chat floating button */}
      <button 
        className="w-14 h-14 rounded-lg bg-neutral-800/90 text-white flex items-center justify-center cursor-pointer shadow-lg border border-neutral-700 transition-all duration-200 hover:bg-neutral-800 hover:scale-105 focus:outline-none relative"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6-.097 1.016-.417 2.13-.771 2.966-.079.186.074.394.273.362 2.256-.37 3.597-.938 4.18-1.234A9.06 9.06 0 0 0 8 15z"/>
          </svg>
        )}
        {unreadCount > 0 && !isOpen && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-neutral-800 animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Chat container */}
      <div className={`floating-chat-bubble absolute bottom-20 right-0 w-[350px] rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-5'}`}>
        <ChatBox
          gameId={gameId}
          currentPlayerId={currentPlayerId}
          currentPlayerUsername={currentPlayerUsername}
          socket={socket}
          messages={messages}
        />
      </div>
    </div>
  );
};

export default FloatingChatBubble; 