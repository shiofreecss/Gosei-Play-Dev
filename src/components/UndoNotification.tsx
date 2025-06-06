import React from 'react';
import { useAppTheme } from '../context/AppThemeContext';

interface UndoNotificationProps {
  onAccept: () => void;
  onReject: () => void;
  moveIndex?: number;
}

const UndoNotification: React.FC<UndoNotificationProps> = ({ onAccept, onReject, moveIndex }) => {
  const { isDarkMode } = useAppTheme();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm ${
        isDarkMode 
          ? 'bg-neutral-900/95 border border-neutral-700 text-white' 
          : 'bg-white/95 border border-neutral-300 text-neutral-900'
      }`}>
        <p className="text-center mb-4">
          Your opponent has requested to undo {moveIndex !== undefined ? `move ${moveIndex + 1}` : 'the last move'}.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onAccept}
            className={`px-6 py-2 rounded-md transition-colors font-medium ${
              isDarkMode
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className={`px-6 py-2 rounded-md transition-colors font-medium ${
              isDarkMode
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default UndoNotification; 