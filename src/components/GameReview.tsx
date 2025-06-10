import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameMove, Position, StoneColor, Stone } from '../types/go';
import { useAppTheme } from '../context/AppThemeContext';
import useDeviceDetect from '../hooks/useDeviceDetect';
import { downloadSGF, copySGFToClipboard } from '../utils/sgfUtils';

// Helper function to check if a move is a pass
function isPassMove(move: GameMove): move is { pass: true } {
  return (move as any).pass === true;
}

interface GameReviewProps {
  gameState: GameState;
  onBoardStateChange: (boardState: {
    stones: Stone[];
    currentMoveIndex: number;
    isReviewing: boolean;
  }) => void;
}

const GameReview: React.FC<GameReviewProps> = ({ gameState, onBoardStateChange }) => {
  const { isDarkMode } = useAppTheme();
  const { isMobile, isTablet } = useDeviceDetect();
  
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(gameState.history.length);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // milliseconds between moves
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportSuccess, setShowExportSuccess] = useState<boolean>(false);
  const [showFinalPosition, setShowFinalPosition] = useState<boolean>(true);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate board state for the current move index
  const calculateBoardState = (moveIndex: number): Stone[] => {
    let stones: Stone[] = [];
    let currentTurn: StoneColor = 'black';
    
    // Add handicap stones first if this is a handicap game
    if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
      // Get handicap stones from the initial board state
      // These are typically black stones that were placed before any moves
      const handicapStones = gameState.board.stones.filter(stone => {
        // Check if this stone position matches any move in the history
        return !gameState.history.some(move => {
          if (isPassMove(move)) return false;
          
          // Extract position from move
          let pos: Position;
          if ((move as any).position) {
            pos = (move as any).position;
          } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
            pos = move as Position;
          } else {
            return false;
          }
          
          return pos.x === stone.position.x && pos.y === stone.position.y;
        });
      });
      
      stones = [...handicapStones];
      currentTurn = 'white'; // White plays first in handicap games
      
      console.log('GameReview - Handicap stones found:', handicapStones.length);
    }

    // Replay moves up to the current index
    for (let i = 0; i < moveIndex && i < gameState.history.length; i++) {
      const move = gameState.history[i];
      
      if (!isPassMove(move)) {
        // Extract position from different move formats
        let pos: Position;
        if ((move as any).position) {
          // Server format: { position: { x, y }, color, ... }
          pos = (move as any).position;
        } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
          // Direct position format: { x, y }
          pos = move as Position;
        } else {
          console.warn('Unknown move format during replay:', move);
          continue; // Skip this move
        }
        
        // Validate coordinates
        if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
          console.warn('Invalid coordinates during replay:', pos);
          continue; // Skip this move
        }
        
        // Add the stone
        stones.push({
          position: pos,
          color: currentTurn
        });
        
        // Simple capture logic - remove opponent stones with no liberties
        // This is a simplified version for review purposes
        const opponentColor: StoneColor = currentTurn === 'black' ? 'white' : 'black';
        const adjacentPositions = getAdjacentPositions(pos, gameState.board.size);
        
        // Check each adjacent position for opponent groups to capture
        for (const adjPos of adjacentPositions) {
          const adjStone = stones.find(s => s.position.x === adjPos.x && s.position.y === adjPos.y);
          if (adjStone && adjStone.color === opponentColor) {
            const group = getGroup(adjStone.position, stones, gameState.board.size);
            if (hasNoLiberties(group, stones, gameState.board.size)) {
              // Remove captured stones
              stones = stones.filter(s => !group.some(g => g.x === s.position.x && g.y === s.position.y));
            }
          }
        }
      }
      
      // Toggle turn
      currentTurn = currentTurn === 'black' ? 'white' : 'black';
    }
    
    return stones;
  };

  // Helper function to get adjacent positions
  const getAdjacentPositions = (pos: Position, boardSize: number): Position[] => {
    const positions: Position[] = [];
    if (pos.y > 0) positions.push({ x: pos.x, y: pos.y - 1 });
    if (pos.x < boardSize - 1) positions.push({ x: pos.x + 1, y: pos.y });
    if (pos.y < boardSize - 1) positions.push({ x: pos.x, y: pos.y + 1 });
    if (pos.x > 0) positions.push({ x: pos.x - 1, y: pos.y });
    return positions;
  };

  // Helper function to get a group of connected stones
  const getGroup = (pos: Position, stones: Stone[], boardSize: number): Position[] => {
    const targetStone = stones.find(s => s.position.x === pos.x && s.position.y === pos.y);
    if (!targetStone) return [];
    
    const group: Position[] = [];
    const visited = new Set<string>();
    const stack = [pos];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      const stone = stones.find(s => s.position.x === current.x && s.position.y === current.y);
      if (stone && stone.color === targetStone.color) {
        group.push(current);
        
        // Add adjacent positions to check
        const adjacent = getAdjacentPositions(current, boardSize);
        stack.push(...adjacent);
      }
    }
    
    return group;
  };

  // Helper function to check if a group has no liberties
  const hasNoLiberties = (group: Position[], stones: Stone[], boardSize: number): boolean => {
    for (const pos of group) {
      const adjacent = getAdjacentPositions(pos, boardSize);
      for (const adjPos of adjacent) {
        const hasStone = stones.some(s => s.position.x === adjPos.x && s.position.y === adjPos.y);
        if (!hasStone) {
          return false; // Found a liberty
        }
      }
    }
    return true; // No liberties found
  };

  // Update board state when move index changes or final position toggle changes
  useEffect(() => {
    if (showFinalPosition) {
      // Show final position with original board state (not reviewing)
      onBoardStateChange({
        stones: gameState.board.stones,
        currentMoveIndex: gameState.history.length,
        isReviewing: false
      });
    } else {
      // Show calculated board state for current move (reviewing)
      const stones = calculateBoardState(currentMoveIndex);
      
      // Debug: Log some information about the current state
      console.log('GameReview - Move Index:', currentMoveIndex);
      console.log('GameReview - Total moves:', gameState.history.length);
      console.log('GameReview - Calculated stones:', stones.length);
      if (currentMoveIndex > 0 && currentMoveIndex <= gameState.history.length) {
        console.log('GameReview - Current move:', gameState.history[currentMoveIndex - 1]);
      }
      
      onBoardStateChange({
        stones,
        currentMoveIndex,
        isReviewing: true
      });
    }
  }, [currentMoveIndex, gameState, onBoardStateChange, showFinalPosition]);

  // Handle play/pause functionality
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentMoveIndex(prev => {
          if (prev >= gameState.history.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, playSpeed, gameState.history.length]);

  // Navigation functions
  const goToPreviousMove = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextMove = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(prev => Math.min(gameState.history.length, prev + 1));
  };

  const togglePlay = () => {
    if (currentMoveIndex >= gameState.history.length) {
      // If at the end, restart from beginning
      setCurrentMoveIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const goToStart = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(0);
  };

  const goToEnd = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(gameState.history.length);
  };

  const toggleFinalPosition = () => {
    setIsPlaying(false);
    setShowFinalPosition(!showFinalPosition);
    if (!showFinalPosition) {
      // When switching to final position, set to end
      setCurrentMoveIndex(gameState.history.length);
    }
  };

  // SGF Export handlers
  const handleDownloadSGF = () => {
    try {
      setIsExporting(true);
      downloadSGF(gameState);
      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 3000);
    } catch (error) {
      console.error('Error downloading SGF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySGF = async () => {
    try {
      setIsExporting(true);
      await copySGFToClipboard(gameState);
      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 3000);
    } catch (error) {
      console.error('Error copying SGF to clipboard:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Get current move info for display
  const getCurrentMoveInfo = () => {
    if (currentMoveIndex === 0) {
      return gameState.gameType === 'handicap' && gameState.handicap > 0 
        ? `Start of game (${gameState.handicap} handicap stones placed)`
        : 'Start of game';
    }
    if (currentMoveIndex >= gameState.history.length) {
      return `End of game (${gameState.history.length} moves played)`;
    }
    
    const move = gameState.history[currentMoveIndex - 1];
    const moveNumber = currentMoveIndex;
    const color = (gameState.gameType === 'handicap' && gameState.handicap > 0) 
      ? (moveNumber % 2 === 1 ? 'white' : 'black')
      : (moveNumber % 2 === 1 ? 'black' : 'white');
    
    if (isPassMove(move)) {
      return `Move ${moveNumber}: ${color === 'black' ? 'Black' : 'White'} passes`;
    } else {
      // Handle different move formats
      let pos: Position;
      if ((move as any).position) {
        // Server format: { position: { x, y }, color, ... }
        pos = (move as any).position;
      } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
        // Direct position format: { x, y }
        pos = move as Position;
      } else {
        // Fallback for unknown format
        console.warn('Unknown move format:', move);
        return `Move ${moveNumber}: ${color === 'black' ? 'Black' : 'White'} plays at unknown position`;
      }
      
      // Validate coordinates
      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        console.warn('Invalid coordinates in move:', pos);
        return `Move ${moveNumber}: ${color === 'black' ? 'Black' : 'White'} plays at invalid position`;
      }
      
      // Convert to Go coordinates (A-T, 1-19)
      const colLetter = String.fromCharCode(65 + pos.x); // A, B, C, etc.
      const rowNumber = gameState.board.size - pos.y; // Convert from 0-based array to 1-based Go coordinates
      const coord = `${colLetter}${rowNumber}`;
      
      return `Move ${moveNumber}: ${color === 'black' ? 'Black' : 'White'} plays ${coord}`;
    }
  };

  const buttonSize = isTablet ? 'text-base px-4 py-3' : isMobile ? 'text-sm px-3 py-2' : 'text-sm px-3 py-2';
  const iconSize = isTablet ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className={`w-full max-w-full mt-4 ${isDarkMode ? 'bg-neutral-900' : 'bg-white'} rounded-lg border ${isDarkMode ? 'border-neutral-700' : 'border-neutral-200'} shadow-sm`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
        <h3 className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'} ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
          Game Review
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'} mt-1`}>
          {getCurrentMoveInfo()}
        </p>
      </div>

      {/* Controls */}
      <div className="px-4 py-4">
        {/* Toggle between Review and Final Position */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={toggleFinalPosition}
            className={`${buttonSize} ${
              showFinalPosition
                ? (isDarkMode 
                  ? 'bg-orange-700 hover:bg-orange-600 text-white border border-orange-600' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white border border-orange-600')
                : (isDarkMode 
                  ? 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-600' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600')
            } rounded-lg transition-colors duration-200 flex items-center justify-center gap-2`}
            title={showFinalPosition ? "Switch to Review Mode" : "Show Final Position"}
          >
            {showFinalPosition ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Review Moves</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Final Score</span>
              </>
            )}
          </button>
        </div>

        {/* Move slider */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={gameState.history.length}
            value={currentMoveIndex}
            disabled={showFinalPosition}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentMoveIndex(parseInt(e.target.value));
            }}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
              showFinalPosition ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              isDarkMode 
                ? 'bg-neutral-700 slider-thumb-dark' 
                : 'bg-neutral-200 slider-thumb-light'
            }`}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
              Start
            </span>
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
              Move {currentMoveIndex} / {gameState.history.length}
            </span>
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>
              End
            </span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="grid grid-cols-5 gap-2">
          {/* Go to start */}
          <button
            onClick={goToStart}
            disabled={showFinalPosition || currentMoveIndex === 0}
            className={`${buttonSize} ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 disabled:opacity-50' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 disabled:opacity-50'
            } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center`}
            title="Go to start"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Previous move */}
          <button
            onClick={goToPreviousMove}
            disabled={showFinalPosition || currentMoveIndex === 0}
            className={`${buttonSize} ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 disabled:opacity-50' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 disabled:opacity-50'
            } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center`}
            title="Previous move"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={showFinalPosition || (currentMoveIndex >= gameState.history.length && !isPlaying)}
            className={`${buttonSize} ${
              isDarkMode 
                ? 'bg-green-700 hover:bg-green-600 text-white disabled:opacity-50' 
                : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
            } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Next move */}
          <button
            onClick={goToNextMove}
            disabled={showFinalPosition || currentMoveIndex >= gameState.history.length}
            className={`${buttonSize} ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 disabled:opacity-50' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 disabled:opacity-50'
            } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center`}
            title="Next move"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Go to end */}
          <button
            onClick={goToEnd}
            disabled={showFinalPosition || currentMoveIndex >= gameState.history.length}
            className={`${buttonSize} ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 disabled:opacity-50' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 disabled:opacity-50'
            } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center`}
            title="Go to end"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Playback speed control */}
        <div className="mt-4 flex items-center gap-3">
          <label className={`text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'} ${showFinalPosition ? 'opacity-50' : ''}`}>
            Speed:
          </label>
          <select
            value={playSpeed}
            disabled={showFinalPosition}
            onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
            className={`text-sm px-3 py-1 rounded border ${
              showFinalPosition ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              isDarkMode 
                ? 'bg-neutral-800 border-neutral-600 text-neutral-300' 
                : 'bg-white border-neutral-300 text-neutral-700'
            } focus:outline-none focus:ring-2 focus:ring-green-500`}
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>

        {/* SGF Export Section */}
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Download SGF Button */}
            <button
              onClick={handleDownloadSGF}
              disabled={isExporting}
              className={`${buttonSize} flex-1 ${
                isDarkMode 
                  ? 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-600 disabled:opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 disabled:opacity-50'
              } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2`}
              title="Download game as SGF file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{isExporting ? 'Exporting...' : 'Download SGF'}</span>
            </button>

            {/* Copy SGF Button */}
            <button
              onClick={handleCopySGF}
              disabled={isExporting}
              className={`${buttonSize} flex-1 ${
                isDarkMode 
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300 border border-neutral-600 disabled:opacity-50' 
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 disabled:opacity-50'
              } rounded-lg disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2`}
              title="Copy SGF to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy SGF</span>
            </button>
          </div>

          {/* Export Success Message */}
          {showExportSuccess && (
            <div className={`mt-2 p-2 rounded text-sm ${
              isDarkMode 
                ? 'bg-green-800 text-green-200 border border-green-700' 
                : 'bg-green-100 text-green-800 border border-green-200'
            } flex items-center gap-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>SGF exported successfully!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameReview; 