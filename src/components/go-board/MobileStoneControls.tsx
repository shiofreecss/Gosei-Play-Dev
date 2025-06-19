import React from 'react';
import { Position, StoneColor } from '../../types/go';
import useDeviceDetect from '../../hooks/useDeviceDetect';

interface MobileStoneControlsProps {
  currentTurn: StoneColor;
  isPlayerTurn: boolean;
  isScoring?: boolean;
  isReviewing?: boolean;
  isThinking?: boolean;
  isFinished?: boolean;
  previewPosition: Position | null;
  onPlaceStone: () => void;
  boardSize: number;
}

const MobileStoneControls: React.FC<MobileStoneControlsProps> = ({
  currentTurn,
  isPlayerTurn,
  isScoring = false,
  isReviewing = false,
  isThinking = false,
  isFinished = false,
  previewPosition,
  onPlaceStone,
  boardSize,
}) => {
  const { isMobile, isTablet } = useDeviceDetect();

  // Don't render if not mobile/tablet or if in scoring/reviewing/finished mode
  if ((!isMobile && !isTablet) || isScoring || isReviewing || isFinished) {
    return null;
  }

  // Function to convert position to Go coordinate
  const getPositionString = (position: Position): string => {
    const columnLetter = position.x < 8 
      ? String.fromCharCode(65 + position.x)  // A-H
      : String.fromCharCode(65 + position.x + 1); // J-Z (skipping I)
    const rowNumber = boardSize - position.y;
    return `${columnLetter}${rowNumber}`;
  };

  return (
    <div className="mobile-stone-controls mt-4 flex flex-col items-center gap-3">
      {previewPosition ? (
        <div className="preview-position-indicator text-sm font-medium">
          {currentTurn === 'black' ? '●' : '○'} Position: {getPositionString(previewPosition)}
        </div>
      ) : (
        <div className="no-preview-indicator text-sm font-medium opacity-60">
          {currentTurn === 'black' ? '●' : '○'} {currentTurn === 'black' ? 'Black' : 'White'}'s Turn
        </div>
      )}
      
      <div className="flex justify-center">
        <button
          onClick={onPlaceStone}
          disabled={!previewPosition || !isPlayerTurn}
          className={`place-stone-btn px-6 py-3 font-semibold rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2 text-white ${
            !isPlayerTurn
              ? 'bg-gray-700 dark:bg-gray-600 cursor-not-allowed animate-pulse'
              : previewPosition && isPlayerTurn
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {!isPlayerTurn ? 'Thinking' : 'Place'}
        </button>
      </div>
      
      <div className="cancel-instruction text-xs opacity-70">
        {!isPlayerTurn 
          ? 'Waiting for opponent\'s move'
          : previewPosition 
            ? 'Touch outside the board to cancel'
            : 'Touch any intersection on the board to preview your move'
        }
      </div>
    </div>
  );
};

export default MobileStoneControls; 