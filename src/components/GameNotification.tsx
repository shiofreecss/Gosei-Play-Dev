import React, { useEffect, useState } from 'react';

export type GameNotificationType = 'info' | 'warning' | 'error' | 'resign' | 'leave';

interface GameNotificationProps {
  isVisible: boolean;
  message: string;
  type: GameNotificationType;
  duration?: number;
  onClose: () => void;
  result?: string; // For displaying game results like B+R or W+R
}

const GameNotification: React.FC<GameNotificationProps> = ({
  isVisible,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  result
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onClose();
          setIsExiting(false);
        }, 300); // Match the transition duration
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getNotificationStyles = () => {
    const baseStyles = 'fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] shadow-lg rounded-lg border backdrop-blur-md transition-all duration-300 ease-in-out z-50 transform';
    const exitStyles = isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0';
    
    switch (type) {
      case 'warning':
        return `${baseStyles} ${exitStyles} bg-amber-900/90 border-amber-700`;
      case 'error':
      case 'resign':
        return `${baseStyles} ${exitStyles} bg-red-900/90 border-red-700`;
      case 'leave':
        return `${baseStyles} ${exitStyles} bg-gray-900/90 border-gray-700`;
      default:
        return `${baseStyles} ${exitStyles} bg-indigo-900/90 border-indigo-700`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'resign':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'leave':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={getNotificationStyles()}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-3 flex-1">
            <p className="text-base font-medium text-white">{message}</p>
            {result && (
              <p className="mt-2 p-2 bg-black/30 rounded text-center text-lg font-bold text-white">
                {result}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setIsExiting(true);
                setTimeout(() => {
                  onClose();
                  setIsExiting(false);
                }, 300);
              }}
              className="bg-transparent rounded-md inline-flex text-white hover:text-gray-200 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameNotification; 