import { Board, Position, Stone, StoneColor, Territory } from '../types/go';

/**
 * Determines if a position is within the board boundaries
 */
export const isWithinBounds = (position: Position, boardSize: number): boolean => {
  return position.x >= 0 && position.x < boardSize && position.y >= 0 && position.y < boardSize;
};

/**
 * Gets the adjacent positions (up, right, down, left) for a given position
 */
export const getAdjacentPositions = (position: Position): Position[] => {
  return [
    { x: position.x, y: position.y - 1 }, // Up
    { x: position.x + 1, y: position.y }, // Right
    { x: position.x, y: position.y + 1 }, // Down
    { x: position.x - 1, y: position.y }, // Left
  ];
};

/**
 * Checks if a position on the board is empty (no stone)
 */
export const isEmpty = (position: Position, stones: Stone[]): boolean => {
  return !stones.some(stone => stone.position.x === position.x && stone.position.y === position.y);
};

/**
 * Finds the stone at a specific position, if any
 */
export const findStoneAt = (position: Position, stones: Stone[]): Stone | undefined => {
  return stones.find(stone => stone.position.x === position.x && stone.position.y === position.y);
};

/**
 * Checks if a position is in the provided set of positions
 */
export const isPositionInSet = (position: Position, positionSet: Set<string>): boolean => {
  const key = `${position.x},${position.y}`;
  return positionSet.has(key);
};

/**
 * Adds a position to a position set
 */
export const addPositionToSet = (position: Position, positionSet: Set<string>): void => {
  const key = `${position.x},${position.y}`;
  positionSet.add(key);
};

/**
 * Converts a position key back to a Position object
 */
export const keyToPosition = (key: string): Position => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

/**
 * Performs flood fill to determine territory ownership
 * Returns the owner color if territory is surrounded by single color, or null if contested
 */
export const findTerritoryOwner = (
  board: Board, 
  startPosition: Position, 
  deadStonePositions: Set<string>
): { owner: StoneColor, territory: Position[] } => {
  const visited = new Set<string>();
  const territory: Position[] = [];
  let surroundingColors = new Set<StoneColor>();

  const floodFill = (position: Position) => {
    if (!isWithinBounds(position, board.size)) return;
    
    const posKey = `${position.x},${position.y}`;
    if (visited.has(posKey)) return;
    
    visited.add(posKey);
    
    // Check if there's a stone at this position
    const stone = findStoneAt(position, board.stones);
    
    if (stone) {
      // If it's a dead stone, treat it as empty space (part of territory)
      if (deadStonePositions.has(posKey)) {
        territory.push(position);
        
        // Continue flood filling from this position
        const adjacentPositions = getAdjacentPositions(position);
        for (const adjPos of adjacentPositions) {
          floodFill(adjPos);
        }
      } else {
        // Live stone - record its color as a surrounding color
        surroundingColors.add(stone.color);
      }
    } else {
      // Empty space - part of territory
      territory.push(position);
      
      // Continue flood filling
      const adjacentPositions = getAdjacentPositions(position);
      for (const adjPos of adjacentPositions) {
        floodFill(adjPos);
      }
    }
  };

  // Start flood filling from the given position
  floodFill(startPosition);
  
  // Determine owner based on surrounding colors
  let owner: StoneColor = null;
  
  // If surrounded by only one color (and not null), that color owns the territory
  if (surroundingColors.size === 1) {
    owner = surroundingColors.has('black') ? 'black' : 
            surroundingColors.has('white') ? 'white' : 
            null;
  }
  
  return { owner, territory };
};

/**
 * Calculates all territories on the board
 */
export const calculateTerritories = (
  board: Board, 
  deadStonePositions: Set<string>
): Territory[] => {
  const visited = new Set<string>();
  const territories: Territory[] = [];
  
  // Check each position on the board
  for (let x = 0; x < board.size; x++) {
    for (let y = 0; y < board.size; y++) {
      const position = { x, y };
      const posKey = `${x},${y}`;
      
      // Skip if already visited
      if (visited.has(posKey)) continue;
      
      // Skip if there's a live stone at this position
      const stone = findStoneAt(position, board.stones);
      if (stone && !deadStonePositions.has(posKey)) continue;
      
      // Find territory and its owner
      const { owner, territory } = findTerritoryOwner(board, position, deadStonePositions);
      
      // Mark all territory positions as visited
      territory.forEach(pos => {
        visited.add(`${pos.x},${pos.y}`);
      });
      
      // Add territories with valid owners
      if (owner) {
        territories.push(...territory.map(position => ({ position, owner })));
      }
    }
  }
  
  return territories;
};

/**
 * Counts live stones by color, excluding dead stones
 */
export const countLiveStones = (
  board: Board, 
  deadStonePositions: Set<string>
): { black: number, white: number } => {
  let black = 0;
  let white = 0;
  
  board.stones.forEach(stone => {
    const posKey = `${stone.position.x},${stone.position.y}`;
    if (!deadStonePositions.has(posKey)) {
      if (stone.color === 'black') {
        black++;
      } else if (stone.color === 'white') {
        white++;
      }
    }
  });
  
  return { black, white };
};

/**
 * Counts territory points by color
 */
export const countTerritoryPoints = (
  territories: Territory[]
): { black: number, white: number } => {
  let black = 0;
  let white = 0;
  
  territories.forEach(territory => {
    if (territory.owner === 'black') {
      black++;
    } else if (territory.owner === 'white') {
      white++;
    }
  });
  
  return { black, white };
};

/**
 * Calculates score using Chinese rules: 
 * - Territory points + stones on the board + komi
 */
export const calculateChineseScore = (
  board: Board,
  deadStonePositions: Set<string>,
  capturedStones: { black: number, white: number },
  komi: number = 7.5
) => {
  // Calculate territories
  const territories = calculateTerritories(board, deadStonePositions);
  const territoryPoints = countTerritoryPoints(territories);
  
  // Count stones on the board
  const liveStones = countLiveStones(board, deadStonePositions);
  
  // Calculate final scores
  const blackScore = territoryPoints.black + liveStones.black;
  const whiteScore = territoryPoints.white + liveStones.white + komi;
  
  return {
    territories,
    score: {
      black: blackScore,
      white: whiteScore,
      blackTerritory: territoryPoints.black,
      whiteTerritory: territoryPoints.white,
      blackStones: liveStones.black,
      whiteStones: liveStones.white,
      komi
    },
    winner: blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : null as StoneColor
  };
};

/**
 * Calculates score using Japanese rules: 
 * - Territory points + captured stones + komi
 */
export const calculateJapaneseScore = (
  board: Board,
  deadStonePositions: Set<string>,
  capturedStones: { black: number, white: number },
  komi: number = 6.5
) => {
  // Calculate territories
  const territories = calculateTerritories(board, deadStonePositions);
  const territoryPoints = countTerritoryPoints(territories);
  
  // Count dead stones (they count as captures)
  let blackCaptures = capturedStones.black;
  let whiteCaptures = capturedStones.white;
  
  // Add dead stones to captures
  board.stones.forEach(stone => {
    const posKey = `${stone.position.x},${stone.position.y}`;
    if (deadStonePositions.has(posKey)) {
      if (stone.color === 'black') {
        whiteCaptures++;
      } else if (stone.color === 'white') {
        blackCaptures++;
      }
    }
  });
  
  // Calculate final scores
  const blackScore = territoryPoints.black + blackCaptures;
  const whiteScore = territoryPoints.white + whiteCaptures + komi;
  
  return {
    territories,
    score: {
      black: blackScore,
      white: whiteScore,
      blackTerritory: territoryPoints.black,
      whiteTerritory: territoryPoints.white,
      blackCaptures,
      whiteCaptures,
      komi
    },
    winner: blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : null as StoneColor
  };
};

/**
 * Calculates score using Korean rules: 
 * - Area scoring similar to Chinese rules but with some procedural differences
 * - Territory points + living stones on the board + komi
 * - Default komi is 6.5 (different from Chinese rules)
 * - Captures don't affect the final score
 */
export const calculateKoreanScore = (
  board: Board,
  deadStonePositions: Set<string>,
  capturedStones: { black: number, white: number },
  komi: number = 6.5
) => {
  // Calculate territories
  const territories = calculateTerritories(board, deadStonePositions);
  const territoryPoints = countTerritoryPoints(territories);
  
  // Count stones on the board
  const liveStones = countLiveStones(board, deadStonePositions);
  
  // Calculate final scores
  const blackScore = territoryPoints.black + liveStones.black;
  const whiteScore = territoryPoints.white + liveStones.white + komi;
  
  return {
    territories,
    score: {
      black: blackScore,
      white: whiteScore,
      blackTerritory: territoryPoints.black,
      whiteTerritory: territoryPoints.white,
      blackStones: liveStones.black,
      whiteStones: liveStones.white,
      komi
    },
    winner: blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : null as StoneColor
  };
};

/**
 * Calculates score using AGA (American Go Association) rules: 
 * - Hybrid approach combining area scoring with Japanese-style handling
 * - Territory points + living stones on the board + komi
 * - Empty points in seki are not counted as territory
 * - Captures are counted in the final score
 * - Default komi is 7.5
 */
export const calculateAGAScore = (
  board: Board,
  deadStonePositions: Set<string>,
  capturedStones: { black: number, white: number },
  komi: number = 7.5
) => {
  // Calculate territories
  const territories = calculateTerritories(board, deadStonePositions);
  const territoryPoints = countTerritoryPoints(territories);
  
  // Count stones on the board
  const liveStones = countLiveStones(board, deadStonePositions);
  
  // Count dead stones (they count as captures)
  let blackCaptures = capturedStones.black;
  let whiteCaptures = capturedStones.white;
  
  // Add dead stones to captures
  board.stones.forEach(stone => {
    const posKey = `${stone.position.x},${stone.position.y}`;
    if (deadStonePositions.has(posKey)) {
      if (stone.color === 'black') {
        whiteCaptures++;
      } else if (stone.color === 'white') {
        blackCaptures++;
      }
    }
  });
  
  // Calculate final scores - AGA combines area scoring with captures
  const blackScore = territoryPoints.black + liveStones.black + blackCaptures;
  const whiteScore = territoryPoints.white + liveStones.white + whiteCaptures + komi;
  
  return {
    territories,
    score: {
      black: blackScore,
      white: whiteScore,
      blackTerritory: territoryPoints.black,
      whiteTerritory: territoryPoints.white,
      blackStones: liveStones.black,
      whiteStones: liveStones.white,
      blackCaptures,
      whiteCaptures,
      komi
    },
    winner: blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : null as StoneColor
  };
};

/**
 * Calculates score using Ing (SST) rules: 
 * - Area scoring with special prisoner handling
 * - Each player counts their stones on the board plus territory
 * - Each player has a fixed number of stones (180 for 19x19)
 * - Prisoners affect the final count of each player's stones
 * - Default komi is 8 points (called "compensation points")
 */
export const calculateIngScore = (
  board: Board,
  deadStonePositions: Set<string>,
  capturedStones: { black: number, white: number },
  komi: number = 8
) => {
  // Calculate territories
  const territories = calculateTerritories(board, deadStonePositions);
  const territoryPoints = countTerritoryPoints(territories);
  
  // Count stones on the board
  const liveStones = countLiveStones(board, deadStonePositions);
  
  // Count dead stones as prisoners
  let blackPrisoners = capturedStones.black;
  let whitePrisoners = capturedStones.white;
  
  // Add dead stones to prisoners
  board.stones.forEach(stone => {
    const posKey = `${stone.position.x},${stone.position.y}`;
    if (deadStonePositions.has(posKey)) {
      if (stone.color === 'black') {
        whitePrisoners++;
      } else if (stone.color === 'white') {
        blackPrisoners++;
      }
    }
  });
  
  // In Ing rules, the total number of stones is fixed
  // We use 180 for 19x19 board, or less for smaller boards
  // Keeping this comment for reference - not currently used in calculations
  /* 
  const totalStones = board.size === 19 ? 180 : 
                     board.size === 13 ? 85 : 
                     board.size === 9 ? 40 : 180;
  */
  
  // Calculate adjusted stone counts (stones on board + prisoners)
  const adjustedBlackStones = liveStones.black + blackPrisoners;
  const adjustedWhiteStones = liveStones.white + whitePrisoners;
  
  // Calculate territory score (unconditionally occupied intersections)
  // and add adjusted stone count
  const blackScore = territoryPoints.black + adjustedBlackStones;
  const whiteScore = territoryPoints.white + adjustedWhiteStones + komi;
  
  return {
    territories,
    score: {
      black: blackScore,
      white: whiteScore,
      blackTerritory: territoryPoints.black,
      whiteTerritory: territoryPoints.white,
      blackStones: liveStones.black,
      whiteStones: liveStones.white,
      blackCaptures: blackPrisoners,
      whiteCaptures: whitePrisoners,
      komi
    },
    winner: blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : null as StoneColor
  };
}; 