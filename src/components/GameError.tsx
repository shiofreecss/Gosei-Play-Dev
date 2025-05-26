import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';

interface GameErrorProps {
  className?: string;
}

const GameError: React.FC<GameErrorProps> = ({ className = '' }) => {
  const { moveError, clearMoveError } = useGame();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (moveError) {
      setIsVisible(true);
      
      // Auto-hide the error after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        clearMoveError();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [moveError, clearMoveError]);
  
  if (!moveError || !isVisible) {
    return null;
  }
  
  return (
    <div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg transition-opacity ${className}`}
      onClick={clearMoveError}
    >
      {moveError}
    </div>
  );
};

export default GameError; 