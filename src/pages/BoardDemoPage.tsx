import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BoardSizeComparison from '../components/go-board/BoardSizeComparison';
import GoseiLogo from '../components/GoseiLogo';
import GoBoard from '../components/go-board/GoBoard';
import { Board, Position, StoneColor, Stone } from '../types/go';
import { useBoardTheme } from '../context/BoardThemeContext';
import BoardThemeSelector from '../components/BoardThemeSelector';
import RulesSidebar from '../components/RulesSidebar';

// Helper functions for capturing logic
const getAdjacentPositions = (pos: Position, size: number): Position[] => {
  const positions: Position[] = [];
  if (pos.y > 0) positions.push({ x: pos.x, y: pos.y - 1 }); // up
  if (pos.x < size - 1) positions.push({ x: pos.x + 1, y: pos.y }); // right
  if (pos.y < size - 1) positions.push({ x: pos.x, y: pos.y + 1 }); // down
  if (pos.x > 0) positions.push({ x: pos.x - 1, y: pos.y }); // left
  return positions;
};

const findStoneAt = (stones: Stone[], pos: Position): Stone | undefined => {
  return stones.find(stone => 
    stone.position.x === pos.x && stone.position.y === pos.y
  );
};

const getGroup = (stones: Stone[], startStone: Stone, size: number): Stone[] => {
  const group: Stone[] = [];
  const visited = new Set<string>();

  const traverse = (stone: Stone) => {
    const key = `${stone.position.x},${stone.position.y}`;
    if (visited.has(key)) return;
    visited.add(key);
    group.push(stone);

    getAdjacentPositions(stone.position, size).forEach(pos => {
      const adjacentStone = findStoneAt(stones, pos);
      if (adjacentStone && adjacentStone.color === stone.color) {
        traverse(adjacentStone);
      }
    });
  };

  traverse(startStone);
  return group;
};

const hasLiberties = (stones: Stone[], group: Stone[], size: number): boolean => {
  for (const stone of group) {
    const adjacent = getAdjacentPositions(stone.position, size);
    for (const pos of adjacent) {
      if (!findStoneAt(stones, pos)) {
        return true; // Found an empty adjacent position (liberty)
      }
    }
  }
  return false;
};

const findCapturedStones = (stones: Stone[], lastMove: Stone, size: number): Stone[] => {
  const capturedStones: Stone[] = [];
  const oppositeColor = lastMove.color === 'black' ? 'white' : 'black';

  // Check adjacent positions for opponent stones that might be captured
  getAdjacentPositions(lastMove.position, size).forEach(pos => {
    const stone = findStoneAt(stones, pos);
    if (stone && stone.color === oppositeColor) {
      const group = getGroup(stones, stone, size);
      if (!hasLiberties(stones, group, size)) {
        capturedStones.push(...group);
      }
    }
  });

  return capturedStones;
};

// Sample positions for different board sizes
const getSamplePositions = (size: number): Stone[] => {
  // Common patterns scaled to board size
  const scale = size / 19; // Use 19x19 as reference
  const center = Math.floor(size / 2);
  
  // Basic capturing example (black surrounding white)
  const capturingExample: Stone[] = [
    // White stone to be captured
    { position: { x: Math.floor(scale * 4), y: Math.floor(scale * 4) }, color: 'white' as StoneColor },
    // Black stones surrounding
    { position: { x: Math.floor(scale * 4), y: Math.floor(scale * 3) }, color: 'black' as StoneColor },
    { position: { x: Math.floor(scale * 4), y: Math.floor(scale * 5) }, color: 'black' as StoneColor },
    { position: { x: Math.floor(scale * 3), y: Math.floor(scale * 4) }, color: 'black' as StoneColor },
  ];

  // Ko situation example
  const koExample: Stone[] = [
    // Ko position setup
    { position: { x: center - 1, y: center }, color: 'black' as StoneColor },
    { position: { x: center - 2, y: center }, color: 'white' as StoneColor },
    { position: { x: center - 1, y: center - 1 }, color: 'white' as StoneColor },
    { position: { x: center - 1, y: center + 1 }, color: 'white' as StoneColor },
    // Additional stones to show context
    { position: { x: center - 3, y: center }, color: 'black' as StoneColor },
    { position: { x: center - 2, y: center - 1 }, color: 'black' as StoneColor },
    { position: { x: center - 2, y: center + 1 }, color: 'black' as StoneColor },
  ];

  // Corner territory example
  const cornerExample: Stone[] = [
    { position: { x: size - 2, y: 1 }, color: 'black' as StoneColor },
    { position: { x: size - 3, y: 1 }, color: 'black' as StoneColor },
    { position: { x: size - 2, y: 2 }, color: 'black' as StoneColor },
    { position: { x: size - 1, y: 2 }, color: 'white' as StoneColor },
  ];

  return [...capturingExample, ...koExample, ...cornerExample];
};

const BoardDemoPage: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const { currentTheme } = useBoardTheme();
  
  // Create a demo board with sample positions
  const [board, setBoard] = useState<Board>({
    size: 19,
    stones: getSamplePositions(19)
  });
  
  // Current turn for hover effect
  const [currentTurn, setCurrentTurn] = useState<StoneColor>('black');
  
  // Last move for highlighting
  const [lastMove, setLastMove] = useState<Position | undefined>(undefined);
  
  // Handle stone placement for demo
  const handlePlaceStone = (position: Position) => {
    // Check if position is already occupied
    if (findStoneAt(board.stones, position)) {
      return;
    }

    // Add new stone
    const newStone: Stone = {
      position,
      color: currentTurn
    };
    
    // Create new stones array with the new stone
    let updatedStones = [...board.stones, newStone];
    
    // Find and remove any captured stones
    const capturedStones = findCapturedStones(updatedStones, newStone, board.size);
    if (capturedStones.length > 0) {
      updatedStones = updatedStones.filter(stone => 
        !capturedStones.some(captured => 
          captured.position.x === stone.position.x && 
          captured.position.y === stone.position.y
        )
      );
    }

    // Check if the placed stone's group has liberties
    const placedGroup = getGroup(updatedStones, newStone, board.size);
    if (!hasLiberties(updatedStones, placedGroup, board.size)) {
      // Suicide move - not allowed
      return;
    }
    
    // Update board state
    setBoard({
      ...board,
      stones: updatedStones
    });
    
    // Update last move
    setLastMove(position);
    
    // Switch turn
    setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');
  };

  const handleSizeSelect = (size: number) => {
    setSelectedSize(size);
    setBoard({
      size: size,
      stones: getSamplePositions(size)
    });
    setLastMove(undefined);
    setCurrentTurn('black');
  };

  const handleBack = () => {
    setSelectedSize(null);
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GoseiLogo size={48} />
            <h1 className="text-4xl font-bold text-primary-700">
              {selectedSize ? `${selectedSize}×${selectedSize} Board` : 'Board Sizes'}
            </h1>
          </div>
          <p className="text-xl text-neutral-600">
            {selectedSize ? 'Try placing stones on the board' : 'Compare different Go board sizes'}
          </p>
        </header>

        {/* Navigation */}
        <div className="max-w-6xl mx-auto mb-6">
          {selectedSize ? (
            <button 
              onClick={handleBack}
              className="inline-flex items-center text-primary-600 hover:text-primary-700"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Size Selection
            </button>
          ) : (
            <Link 
              to="/" 
              className="inline-flex items-center text-primary-600 hover:text-primary-700"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </Link>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {selectedSize ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white p-4 rounded-xl shadow">
                  <h2 className="text-xl font-semibold mb-2">
                    Current Theme: {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1).replace('-', ' ')}
                  </h2>
                  <div className="max-w-2xl mx-auto">
                    <GoBoard
                      board={board}
                      currentTurn={currentTurn}
                      onPlaceStone={handlePlaceStone}
                      isPlayerTurn={true}
                      lastMove={lastMove}
                      isScoring={false}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow">
                  <h2 className="text-xl font-semibold mb-4">Theme Selection</h2>
                  <BoardThemeSelector />
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow">
                  <h2 className="text-xl font-semibold mb-4">Go Rules Examples</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Capturing Stones</h3>
                      <p className="text-sm text-neutral-600">
                        Look at the top-left area. A white stone is surrounded by three black stones. 
                        Place a black stone at the empty liberty to capture the white stone.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Ko Rule</h3>
                      <p className="text-sm text-neutral-600">
                        In the center area, there's a Ko situation. The Ko rule prevents immediate recapture 
                        to avoid infinite loops. After capturing, you must play elsewhere before recapturing.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow">
                  <h2 className="text-xl font-semibold mb-2">Instructions</h2>
                  <ul className="list-disc pl-5 space-y-2 text-neutral-700">
                    <li>Click on the board to place stones</li>
                    <li>Try completing the capture in the top-left</li>
                    <li>Experiment with the Ko situation in the center</li>
                    <li>Your theme selection will be saved for all games</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <BoardSizeComparison onSizeSelect={handleSizeSelect} />
              </div>
              <div>
                <RulesSidebar />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardDemoPage; 