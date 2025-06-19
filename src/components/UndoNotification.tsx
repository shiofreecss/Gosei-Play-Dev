import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppTheme } from '../context/AppThemeContext';

interface UndoNotificationProps {
  onAccept: () => void;
  onReject: () => void;
  moveIndex?: number;
}

const UndoNotification: React.FC<UndoNotificationProps> = ({ onAccept, onReject, moveIndex }) => {
  const { isDarkMode } = useAppTheme();
  const [visible, setVisible] = useState(false);

  // Animation effect
  useEffect(() => {
    // Short delay to trigger entrance animation
    const timer = setTimeout(() => {
      setVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleReject();
    }
  };

  const handleAccept = () => {
    setVisible(false);
    setTimeout(() => {
      onAccept();
    }, 150);
  };

  const handleReject = () => {
    setVisible(false);
    setTimeout(() => {
      onReject();
    }, 150);
  };

  return createPortal(
    <div 
      className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9999] ${
        visible ? 'bg-opacity-50' : 'bg-opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 ${
        visible ? 'scale-100' : 'scale-95'
      } ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`text-white py-4 px-6 ${
          isDarkMode ? 'bg-orange-700' : 'bg-orange-600'
        }`}>
          <h2 className="text-xl font-bold text-center font-display tracking-tight">Undo Request</h2>
        </div>
        
        {/* Content */}
        <div className="p-6 text-center">
          <p className={`mb-6 text-lg ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Your opponent has requested to undo {moveIndex !== undefined ? `move ${moveIndex + 1}` : 'the last move'}.
          </p>
          
          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UndoNotification; 