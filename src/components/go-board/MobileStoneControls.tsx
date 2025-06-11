import React from 'react';
import { Position, StoneColor } from '../../types/go';
import useDeviceDetect from '../../hooks/useDeviceDetect';

interface MobileStoneControlsProps {
  currentTurn: StoneColor;
  isPlayerTurn: boolean;
  isScoring?: boolean;
  isReviewing?: boolean;
  previewPosition: Position | null;
  onPlaceStone: () => void;
  boardSize: number;
}

const MobileStoneControls: React.FC<MobileStoneControlsProps> = ({
  currentTurn,
  isPlayerTurn,
  isScoring = false,
  isReviewing = false,
  previewPosition,
  onPlaceStone,
  boardSize,
}) => {
  const { isMobile } = useDeviceDetect();

  // Don't render if not mobile or if not in the right game state
  if (!isMobile || !isPlayerTurn || isScoring || isReviewing) {
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
        <>
          <div className="preview-position-indicator text-sm font-medium">
            {currentTurn === 'black' ? '●' : '○'} Position: {getPositionString(previewPosition)}
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={onPlaceStone}
              className="place-stone-btn px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Place
            </button>
          </div>
          
          <div className="cancel-instruction text-xs opacity-70">
            Touch outside the board to cancel
          </div>
        </>
      ) : (
        <>
          <div className="no-preview-indicator text-sm font-medium opacity-60">
            {currentTurn === 'black' ? '●' : '○'} {currentTurn === 'black' ? 'Black' : 'White'}'s Turn
          </div>
          
          <div className="touch-instruction text-xs opacity-60 text-center">
            Touch any intersection on the board to preview your move
          </div>
        </>
      )}
    </div>
  );
};

export default MobileStoneControls; 