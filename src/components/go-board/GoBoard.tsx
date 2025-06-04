import React, { useState, useEffect } from 'react';
import { Board, Position, Stone, StoneColor, Territory, GameState } from '../../types/go';
import { isHandicapPoint } from '../../utils/handicapUtils';
import { playStoneSound } from '../../utils/soundUtils';
import { useBoardTheme } from '../../context/BoardThemeContext';
import { useGame } from '../../context/GameContext';

interface GoBoardProps {
  board: Board;
  currentTurn: StoneColor;
  onPlaceStone: (position: Position) => void;
  isPlayerTurn: boolean;
  lastMove?: Position;
  isScoring?: boolean;
  deadStones?: Position[];
  onToggleDeadStone?: (position: Position) => void;
  territory?: Territory[];
  showTerritory?: boolean;
  isHandicapPlacement?: boolean;
}

const GoBoard: React.FC<GoBoardProps> = ({
  board,
  currentTurn,
  onPlaceStone,
  isPlayerTurn,
  lastMove,
  isScoring = false,
  deadStones = [],
  onToggleDeadStone,
  territory = [],
  showTerritory = false,
  isHandicapPlacement = false,
}) => {
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);
  const { currentTheme } = useBoardTheme();
  const { gameState } = useGame();

  // Get star point positions based on board size
  const getStarPoints = (size: number): Position[] => {
    const points: Position[] = [];
    
    if (size === 9) {
      // 9x9 board has 5 star points
      points.push({ x: 2, y: 2 });
      points.push({ x: 2, y: 6 });
      points.push({ x: 4, y: 4 }); // center
      points.push({ x: 6, y: 2 });
      points.push({ x: 6, y: 6 });
    } else if (size === 13) {
      // 13x13 board has 5 star points
      points.push({ x: 3, y: 3 });
      points.push({ x: 3, y: 9 });
      points.push({ x: 6, y: 6 }); // center
      points.push({ x: 9, y: 3 });
      points.push({ x: 9, y: 9 });
    } else if (size === 15) {
      // 15x15 board has 5 star points
      points.push({ x: 3, y: 3 });
      points.push({ x: 3, y: 11 });
      points.push({ x: 7, y: 7 }); // center
      points.push({ x: 11, y: 3 });
      points.push({ x: 11, y: 11 });
    } else if (size === 19) {
      // 19x19 board has 9 star points
      points.push({ x: 3, y: 3 });
      points.push({ x: 3, y: 9 });
      points.push({ x: 3, y: 15 });
      points.push({ x: 9, y: 3 });
      points.push({ x: 9, y: 9 }); // center
      points.push({ x: 9, y: 15 });
      points.push({ x: 15, y: 3 });
      points.push({ x: 15, y: 9 });
      points.push({ x: 15, y: 15 });
    } else if (size === 21) {
      // 21x21 board has 9 star points
      points.push({ x: 3, y: 3 });
      points.push({ x: 3, y: 10 });
      points.push({ x: 3, y: 17 });
      points.push({ x: 10, y: 3 });
      points.push({ x: 10, y: 10 }); // center
      points.push({ x: 10, y: 17 });
      points.push({ x: 17, y: 3 });
      points.push({ x: 17, y: 10 });
      points.push({ x: 17, y: 17 });
    }
    
    return points;
  };

  // Helper to get stone at position
  const getStoneAtPosition = (x: number, y: number): Stone | undefined => {
    return board.stones.find(
      (stone) => stone.position.x === x && stone.position.y === y
    );
  };

  // Check if position is valid for placement
  const isValidPlacement = (x: number, y: number): boolean => {
    return !getStoneAtPosition(x, y);
  };

  // Check if a stone is marked as dead during scoring
  const isDeadStone = (x: number, y: number): boolean => {
    return deadStones.some(stone => stone.x === x && stone.y === y);
  };

  // Check if a position is part of a territory and get its owner
  const getTerritoryOwner = (x: number, y: number): StoneColor => {
    if (!showTerritory) return null;
    const territoryPoint = territory.find(t => t.position.x === x && t.position.y === y);
    return territoryPoint?.owner || null;
  };

  // Check if a position is valid for handicap stone placement
  const isValidHandicapPoint = (x: number, y: number): boolean => {
    if (!isHandicapPlacement) return false;
    return isHandicapPoint({ x, y }, board.size) && !getStoneAtPosition(x, y);
  };

  // Handle click on board intersection
  const handleIntersectionClick = (x: number, y: number) => {
    if (isScoring) {
      // In scoring mode, clicking toggles whether a stone is marked as dead
      const stone = getStoneAtPosition(x, y);
      if (stone && onToggleDeadStone) {
        onToggleDeadStone({ x, y });
      }
    } else if (isPlayerTurn && isValidPlacement(x, y)) {
      // Play stone sound when placing a stone
      playStoneSound();
      onPlaceStone({ x, y });
    }
  };

  // Handle mouse over board intersection
  const handleMouseOver = (x: number, y: number) => {
    if (isPlayerTurn && isValidPlacement(x, y)) {
      setHoverPosition({ x, y });
    }
  };

  // Handle mouse leave from board
  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  // Get stone size based on board size (larger stones for smaller boards)
  const getStoneSize = () => {
    // Stone size is 90% of a single intersection size
    return 'calc(90%)'; // 90% of the parent intersection size
  };

  // Get star point class based on board size
  const getStarPointClass = () => {
    if (board.size === 9) return 'star-point-9';
    if (board.size === 13) return 'star-point-13';
    return 'star-point-19'; // 19x19 and larger
  };

  // Get all star points for the current board size
  const starPoints = getStarPoints(board.size);

  // Check if a position is a star point
  const isStarPoint = (x: number, y: number): boolean => {
    return starPoints.some(point => point.x === x && point.y === y);
  };

  return (
    <div className="go-board-container relative max-w-full overflow-auto">
      <div className={`board board-${board.size} board-theme-${currentTheme} max-w-full`}>
        {Array.from({ length: board.size * board.size }).map((_, index) => {
          const x = index % board.size;
          const y = Math.floor(index / board.size);
          
          // Get edge classes for grid styling
          let edgeClasses = '';
          if (y === 0) edgeClasses += ' top-edge';
          if (y === board.size - 1) edgeClasses += ' bottom-edge';
          if (x === 0) edgeClasses += ' left-edge';
          if (x === board.size - 1) edgeClasses += ' right-edge';
          
          // Check if there's a stone at this position
          const stone = getStoneAtPosition(x, y);
          
          // Check if this is the last move
          const isLastMove = lastMove && lastMove.x === x && lastMove.y === y;
          
          // Check if stone is marked as dead
          const isDead = stone && isDeadStone(x, y);
          
          // Check if this is the hover position
          const isHovered = hoverPosition && hoverPosition.x === x && hoverPosition.y === y;
          
          // Check territory ownership
          const territoryOwner = getTerritoryOwner(x, y);
          
          // Stone size based on board size
          const stoneSize = getStoneSize();

          // Add handicap point indicator
          const isValidHandicap = isValidHandicapPoint(x, y);

          return (
            <div
              key={`${x}-${y}`}
              className={`board-intersection${edgeClasses}${isScoring && stone ? ' cursor-pointer' : ''}${
                isValidHandicap ? ' valid-handicap-point' : ''
              }`}
              onClick={() => handleIntersectionClick(x, y)}
              onMouseOver={() => handleMouseOver(x, y)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Star point markers */}
              {isStarPoint(x, y) && (
                <div className={`star-point ${getStarPointClass()}`} />
              )}

              {/* Territory markers */}
              {showTerritory && territoryOwner && !stone && (
                <div 
                  className={`territory-marker ${territoryOwner === 'black' ? 'territory-black' : 'territory-white'}`}
                  style={{ 
                    width: stoneSize, 
                    height: stoneSize 
                  }}
                ></div>
              )}

              {/* Placed stones */}
              {stone && (
                <div
                  className={`stone ${stone.color === 'black' ? 'stone-black' : 'stone-white'}
                   ${isLastMove ? 'last-move' : ''} ${isDead ? 'dead-stone' : ''}`}
                  style={{ 
                    width: stoneSize, 
                    height: stoneSize,
                    opacity: isDead ? 0.3 : 1 
                  }}
                >
                  {isLastMove && (
                    <div 
                      className="absolute w-2 h-2 rounded-full last-move-dot"
                      style={{
                        backgroundColor: stone.color === 'black' ? 'white' : 'black',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.8
                      }}
                    />
                  )}
                </div>
              )}

              {/* Hover indicator */}
              {isHovered && !stone && !isScoring && (
                <div
                  className={`stone ${currentTurn === 'black' ? 'stone-black' : 'stone-white'} stone-hover`}
                  style={{ width: stoneSize, height: stoneSize }}
                ></div>
              )}

              {/* Handicap point indicator */}
              {isValidHandicap && !stone && (
                <div 
                  className="handicap-point-indicator"
                  style={{ 
                    width: getStoneSize(),
                    height: getStoneSize(),
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* KO position marker */}
      {gameState?.koPosition && (
        <div 
          className="absolute pointer-events-none ko-marker" 
          style={{
            left: `${(100 / board.size) * (gameState.koPosition.x + 0.5)}%`,
            top: `${(100 / board.size) * (gameState.koPosition.y + 0.5)}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
          }}
        >
          <svg 
            width="30" 
            height="30" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 18L18 6M6 6l12 12" stroke="#ff3333" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Scoring mode indicator */}
      {isScoring && (
        <div className="absolute top-0 left-0 bg-neutral-800/90 text-white px-4 py-2 rounded-br-lg text-sm font-medium shadow-md border border-neutral-700">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <span>Scoring Mode: Click stones to mark as dead</span>
          </div>
        </div>
      )}

      {isHandicapPlacement && (
        <div className="absolute top-0 left-0 bg-neutral-800/90 text-white px-3 py-1 rounded-br-lg text-sm font-medium">
          Handicap Mode: Place stones on highlighted points
        </div>
      )}

      {/* Territory legend */}
      {showTerritory && (
        <div className="absolute top-0 right-0 bg-neutral-800/90 text-white px-4 py-2 rounded-bl-lg text-sm font-medium shadow-md border border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-black opacity-40 rounded-full border-2 border-neutral-600"></div>
              <span>Black Territory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white opacity-40 rounded-full border-2 border-neutral-600"></div>
              <span>White Territory</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoBoard; 