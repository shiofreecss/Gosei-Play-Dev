import React from 'react';

interface UndoNotificationProps {
  onAccept: () => void;
  onReject: () => void;
}

const UndoNotification: React.FC<UndoNotificationProps> = ({ onAccept, onReject }) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-700 bg-opacity-95 backdrop-blur-sm text-white px-6 py-4 rounded-lg shadow-lg">
        <p className="text-center mb-4">
          Your opponent has requested to undo to a previous position.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="bg-red-100 hover:bg-red-200 text-red-600 px-6 py-2 rounded-md transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default UndoNotification; 