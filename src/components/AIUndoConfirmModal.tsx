import React from 'react';
import { useAppTheme } from '../context/AppThemeContext';

interface AIUndoConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const AIUndoConfirmModal: React.FC<AIUndoConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  const { isDarkMode } = useAppTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-md w-full rounded-lg shadow-xl ${
        isDarkMode 
          ? 'bg-neutral-800 border border-neutral-700' 
          : 'bg-white border border-neutral-200'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          isDarkMode ? 'border-neutral-700' : 'border-neutral-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.875c1.242 0 2.25-1.007 2.25-2.25 0-1.242-1.007-2.25-2.25-2.25H5.062c-1.242 0-2.25 1.007-2.25 2.25 0 1.242 1.007 2.25 2.25 2.25z" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}>
              Confirm Undo Move
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="space-y-3">
            <p className={`text-base ${
              isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Are you sure you want to undo your move against the AI?
            </p>
            
            <div className={`p-3 rounded-lg ${
              isDarkMode 
                ? 'bg-amber-900/20 border border-amber-800/50' 
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  isDarkMode ? 'text-amber-400' : 'text-amber-600'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className={`font-medium ${
                    isDarkMode ? 'text-amber-300' : 'text-amber-800'
                  }`}>
                    One-time use only
                  </p>
                  <p className={`${
                    isDarkMode ? 'text-amber-400/80' : 'text-amber-700'
                  }`}>
                    You can only undo once per AI game. This will take you back 2 moves so you can replay your turn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          isDarkMode ? 'border-neutral-700' : 'border-neutral-200'
        }`}>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300 border border-neutral-600'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Yes, Undo Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIUndoConfirmModal; 