import { Board, Position, Stone, StoneColor, GameState, GameMove } from '../types/go';

// Check if a position is within the board boundaries
export const isWithinBounds = (position: Position, boardSize: number): boolean => {
  const { x, y } = position;
  return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
};

// Get adjacent positions (up, right, down, left)
export const getAdjacentPositions = (position: Position): Position[] => {
  const { x, y } = position;
  return [
    { x, y: y - 1 }, // up
    { x: x + 1, y }, // right
    { x, y: y + 1 }, // down
    { x: x - 1, y }, // left
  ];
};

// Get a stone at a specific position on the board
export const getStoneAt = (board: Board, position: Position): Stone | null => {
  return (
    board.stones.find(
      (stone) => stone.position.x === position.x && stone.position.y === position.y
    ) || null
  );
};

// Check if a group of stones has any liberties (empty adjacent intersections)
export const hasLiberties = (
  board: Board,
  position: Position,
  checkedPositions: Set<string> = new Set()
): boolean => {
  if (!isWithinBounds(position, board.size)) return false;
  
  const posKey = `${position.x},${position.y}`;
  if (checkedPositions.has(posKey)) return false;
  
  checkedPositions.add(posKey);
  
  const stone = getStoneAt(board, position);
  if (!stone) return true; // Empty intersection = liberty
  
  // Check adjacent positions
  const adjacentPositions = getAdjacentPositions(position);
  
  for (const adjPos of adjacentPositions) {
    if (!isWithinBounds(adjPos, board.size)) continue;
    
    const adjStone = getStoneAt(board, adjPos);
    
    // Empty adjacent position = liberty
    if (!adjStone) return true;
    
    // Adjacent stone is same color, check if that group has liberties
    if (adjStone.color === stone.color) {
      const adjPosKey = `${adjPos.x},${adjPos.y}`;
      if (!checkedPositions.has(adjPosKey)) {
        if (hasLiberties(board, adjPos, checkedPositions)) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Find all stones in a group connected to the stone at the given position
export const findConnectedGroup = (
  board: Board,
  position: Position,
  color: StoneColor,
  group: Position[] = [],
  visited: Set<string> = new Set()
): Position[] => {
  if (!isWithinBounds(position, board.size)) return group;
  
  const posKey = `${position.x},${position.y}`;
  if (visited.has(posKey)) return group;
  
  visited.add(posKey);
  
  const stone = getStoneAt(board, position);
  if (!stone || stone.color !== color) return group;
  
  group.push(position);
  
  // Check adjacent positions
  const adjacentPositions = getAdjacentPositions(position);
  
  for (const adjPos of adjacentPositions) {
    findConnectedGroup(board, adjPos, color, group, visited);
  }
  
  return group;
};

// Find stones that would be captured by a move
export const findCapturedStones = (
  board: Board,
  position: Position,
  color: StoneColor
): Position[] => {
  const oppositeColor: StoneColor = color === 'black' ? 'white' : 'black';
  const capturedStones: Position[] = [];
  
  // Check adjacent positions for opponent stones
  const adjacentPositions = getAdjacentPositions(position);
  
  for (const adjPos of adjacentPositions) {
    if (!isWithinBounds(adjPos, board.size)) continue;
    
    const adjStone = getStoneAt(board, adjPos);
    if (!adjStone || adjStone.color !== oppositeColor) continue;
    
    // Find group connected to this stone
    const group = findConnectedGroup(board, adjPos, oppositeColor);
    
    // Check if this group has liberties other than the position we're placing
    const hasOtherLiberties = group.some(groupPos => {
      const adjacentToGroupPos = getAdjacentPositions(groupPos);
      return adjacentToGroupPos.some(p => {
        if (p.x === position.x && p.y === position.y) return false;
        if (!isWithinBounds(p, board.size)) return false;
        return !getStoneAt(board, p);
      });
    });
    
    if (!hasOtherLiberties) {
      capturedStones.push(...group);
    }
  }
  
  return capturedStones;
};

// Check if a move would be suicidal (self-capture without capturing opponent stones)
export const isSuicidalMove = (
  board: Board,
  position: Position,
  color: StoneColor
): boolean => {
  // If we capture opponent stones, it's not suicidal
  const capturedStones = findCapturedStones(board, position, color);
  if (capturedStones.length > 0) return false;
  
  // Create a temporary board with the new stone added
  const tempBoard: Board = {
    ...board,
    stones: [
      ...board.stones,
      { position, color },
    ],
  };
  
  // Check if the group containing our new stone has liberties
  return !hasLiberties(tempBoard, position);
};

// Check if a position has a stone of a specific color
export const hasStoneOfColor = (position: Position, stones: Stone[], color: StoneColor): boolean => {
  return stones.some(
    stone => stone.position.x === position.x && stone.position.y === position.y && stone.color === color
  );
};

// Check if a position is empty (no stone)
export const isEmpty = (position: Position, stones: Stone[]): boolean => {
  return !stones.some(
    stone => stone.position.x === position.x && stone.position.y === position.y
  );
};

// Find a stone at a position, if any
export const findStoneAt = (position: Position, stones: Stone[]): Stone | undefined => {
  return stones.find(
    stone => stone.position.x === position.x && stone.position.y === position.y
  );
};

// Get positions of all stones in a group connected to the stone at the given position
export const getConnectedGroup = (position: Position, stones: Stone[], boardSize: number): Position[] => {
  const stone = findStoneAt(position, stones);
  if (!stone) return [];
  
  const color = stone.color;
  const visited = new Set<string>();
  const group: Position[] = [];
  
  const visit = (pos: Position) => {
    const key = `${pos.x},${pos.y}`;
    if (visited.has(key)) return;
    
    visited.add(key);
    
    const stoneAtPos = findStoneAt(pos, stones);
    if (!stoneAtPos || stoneAtPos.color !== color) return;
    
    group.push(pos);
    
    // Visit adjacent positions
    const adjacentPositions = getAdjacentPositions(pos).filter(p => isWithinBounds(p, boardSize));
    adjacentPositions.forEach(visit);
  };
  
  visit(position);
  return group;
};

// Advanced dead stone group detection with eye counting
export const getDeadStoneGroup = (position: Position, stones: Stone[], boardSize: number): Position[] => {
  const stone = findStoneAt(position, stones);
  if (!stone) return [];
  
  // First, get all connected stones of the same color
  const connectedGroup = getConnectedGroup(position, stones, boardSize);
  
  // For more advanced dead group detection, we could also analyze:
  // 1. Whether the group has enough eyes to live
  // 2. Whether the group is completely surrounded
  // 3. Whether the group has potential to form eyes
  
  // For now, this is a basic implementation that returns the connected group
  // In a full implementation, you would add additional logic here to identify
  // groups that are definitely dead based on Go theory
  
  return connectedGroup;
};

// Extended function to detect if a stone group is likely dead
export const isGroupLikelyDead = (group: Position[], stones: Stone[], boardSize: number): boolean => {
  if (group.length === 0) return false;
  
  // Count liberties of the group
  const liberties = countLiberties(group, stones, boardSize);
  
  // If there are no liberties, the group is definitely dead
  if (liberties === 0) return true;
  
  // If there's only one liberty, check if it's an "eye"
  if (liberties === 1) {
    // Find the liberty position
    const eyePosition = findSingleLiberty(group, stones, boardSize);
    if (!eyePosition) return false; // Should not happen if liberties === 1
    
    // Check if this eye is a false eye (surrounded by opponent stones diagonally)
    if (isFalseEye(eyePosition, stones, boardSize, getStoneSampleColor(group, stones))) {
      return true; // Group with only a false eye is dead
    }
  }
  
  // For groups with two liberties, check if they're real eyes or can be reduced to one
  if (liberties === 2) {
    const libertyPositions = findLibertyPositions(group, stones, boardSize);
    // Further analysis of the two liberties would go here
    // This is a simplification
    const color = getStoneSampleColor(group, stones);
    if (color) {
      const falseEyeCount = libertyPositions.filter(pos => 
        isFalseEye(pos, stones, boardSize, color)
      ).length;
      
      if (falseEyeCount > 0) {
        return true; // If any of the eyes are false, the group is likely dead
      }
    }
  }
  
  // More advanced dead shape recognition could be added here
  
  return false; // Default to not considering groups dead unless clear
};

// Helper to find a single liberty position when we know there's exactly one
function findSingleLiberty(group: Position[], stones: Stone[], boardSize: number): Position | null {
  for (const pos of group) {
    const adjacentPositions = getAdjacentPositions(pos).filter(p => isWithinBounds(p, boardSize));
    
    for (const adjPos of adjacentPositions) {
      if (isEmpty(adjPos, stones)) {
        return adjPos; // Return the first empty adjacent position found
      }
    }
  }
  
  return null; // Should not reach here if the group has one liberty
}

// Helper to find all liberty positions for a group
function findLibertyPositions(group: Position[], stones: Stone[], boardSize: number): Position[] {
  const libertySet = new Set<string>();
  const libertyPositions: Position[] = [];
  
  group.forEach(pos => {
    const adjacentPositions = getAdjacentPositions(pos).filter(p => isWithinBounds(p, boardSize));
    
    adjacentPositions.forEach(adjPos => {
      const key = `${adjPos.x},${adjPos.y}`;
      if (isEmpty(adjPos, stones) && !libertySet.has(key)) {
        libertySet.add(key);
        libertyPositions.push(adjPos);
      }
    });
  });
  
  return libertyPositions;
}

// Helper to check if an eye is a false eye
function isFalseEye(eyePosition: Position, stones: Stone[], boardSize: number, groupColor: StoneColor | null): boolean {
  if (!groupColor) return false;
  
  const oppositeColor = groupColor === 'black' ? 'white' : 'black';
  
  // Get diagonal positions
  const diagonalPositions = [
    { x: eyePosition.x - 1, y: eyePosition.y - 1 },
    { x: eyePosition.x + 1, y: eyePosition.y - 1 },
    { x: eyePosition.x - 1, y: eyePosition.y + 1 },
    { x: eyePosition.x + 1, y: eyePosition.y + 1 }
  ].filter(p => isWithinBounds(p, boardSize));
  
  // Count opponent stones at diagonal positions
  const opponentDiagonalCount = diagonalPositions.filter(pos => {
    const stone = findStoneAt(pos, stones);
    return stone && stone.color === oppositeColor;
  }).length;
  
  // A false eye has opponent stones on critical diagonal intersections
  // This is a simplified check - in a real Go engine, more factors would be considered
  return opponentDiagonalCount >= 2;
}

// Helper to get the color of a stone in the group
function getStoneSampleColor(group: Position[], stones: Stone[]): StoneColor | null {
  if (group.length === 0) return null;
  
  const stone = findStoneAt(group[0], stones);
  return stone ? stone.color : null;
}

// Count liberties (empty adjacent points) for a group of stones
export const countLiberties = (group: Position[], stones: Stone[], boardSize: number): number => {
  const liberties = new Set<string>();
  
  group.forEach(position => {
    const adjacentPositions = getAdjacentPositions(position).filter(p => isWithinBounds(p, boardSize));
    
    adjacentPositions.forEach(adjPos => {
      if (isEmpty(adjPos, stones)) {
        liberties.add(`${adjPos.x},${adjPos.y}`);
      }
    });
  });
  
  return liberties.size;
};

// Check if a move would be suicidal
export const isSuicideMove = (position: Position, color: StoneColor, gameState: GameState): boolean => {
  const { board } = gameState;
  const { stones, size } = board;
  
  // Temporarily add the stone
  const updatedStones = [...stones, { position, color }];
  
  // Get the group of the newly placed stone
  const group = getConnectedGroup(position, updatedStones, size);
  
  // Check liberties for the newly formed group
  const liberties = countLiberties(group, updatedStones, size);
  
  // If this move has no liberties, check if it captures any opponent groups
  if (liberties === 0) {
    const oppositeColor = color === 'black' ? 'white' : 'black';
    
    // Check if any adjacent enemy stones would be captured
    const adjacentPositions = getAdjacentPositions(position).filter(p => isWithinBounds(p, size));
    
    for (const adjPos of adjacentPositions) {
      const stoneAtPos = findStoneAt(adjPos, stones);
      if (stoneAtPos && stoneAtPos.color === oppositeColor) {
        const enemyGroup = getConnectedGroup(adjPos, updatedStones, size);
        const enemyLiberties = countLiberties(enemyGroup, updatedStones, size);
        
        // If placing this stone would capture an enemy group, it's not a suicide move
        if (enemyLiberties === 0) {
          return false;
        }
      }
    }
    
    // The move has no liberties and doesn't capture any enemy stones, so it's a suicide move
    return true;
  }
  
  // The move has liberties, so it's not a suicide move
  return false;
};

// Helper function to serialize a board state for comparison
export const serializeBoardState = (board: Board): string => {
  const stateArray: string[][] = Array(board.size).fill(null).map(() => Array(board.size).fill('.'));
  
  board.stones.forEach(stone => {
    stateArray[stone.position.y][stone.position.x] = stone.color === 'black' ? 'B' : 'W';
  });
  
  return stateArray.map(row => row.join('')).join('\n');
};

// Helper function to simulate a move and return the resulting board state
export const simulateMove = (
  currentBoard: Board,
  position: Position,
  color: StoneColor
): Board => {
  // Create a temporary board with the new stone
  const tempStones = [...currentBoard.stones, { position, color }];
  
  // Check for captures and remove captured stones
  const oppositeColor: StoneColor = color === 'black' ? 'white' : 'black';
  const capturedPositions: Position[] = [];
  
  // Check adjacent positions for opponent groups that would be captured
  const adjacentPositions = getAdjacentPositions(position);
  
  for (const adjPos of adjacentPositions) {
    if (!isWithinBounds(adjPos, currentBoard.size)) continue;
    
    const adjStone = tempStones.find(s => 
      s.position.x === adjPos.x && s.position.y === adjPos.y
    );
    
    if (adjStone && adjStone.color === oppositeColor) {
      // Get the connected group
      const group = findConnectedGroup(
        { size: currentBoard.size, stones: tempStones },
        adjPos,
        oppositeColor
      );
      
      // Check if this group has any liberties
      if (!hasLiberties({ size: currentBoard.size, stones: tempStones }, adjPos)) {
        capturedPositions.push(...group);
      }
    }
  }
  
  // Remove captured stones
  const finalStones = tempStones.filter(stone => 
    !capturedPositions.some(capturedPos => 
      capturedPos.x === stone.position.x && capturedPos.y === stone.position.y
    )
  );
  
  return {
    size: currentBoard.size,
    stones: finalStones
  };
};

// Original simple KO rule violation check (fallback)
export const isKoViolation = (position: Position, color: StoneColor, gameState: GameState): boolean => {
  // If there's a KO position set and this move is at that position, it's a violation
  // The KO position will remain restricted until another move is played
  if (gameState.koPosition) {
    return position.x === gameState.koPosition.x && position.y === gameState.koPosition.y;
  }
  
  return false;
};

/**
 * KO Rule Checking Function
 * 
 * Checks whether a move violates the KO rule according to Go game rules.
 * 
 * @param currentBoardState - The current board state as a 2D array where:
 *   - "B" represents a black stone
 *   - "W" represents a white stone  
 *   - "." represents an empty intersection
 * @param proposedMove - Object containing:
 *   - position: {x: number, y: number} - coordinates of the proposed move
 *   - color: "black" | "white" - color of the stone to be placed
 * @param previousBoardState - The board state immediately before the opponent's last move
 * 
 * @returns boolean - true if the move violates the KO rule, false if it's allowed
 */
export const checkKoRule = (
  currentBoardState: string[][],
  proposedMove: { position: { x: number; y: number }; color: 'black' | 'white' },
  previousBoardState: string[][] | null
): boolean => {
  // If there's no previous board state to compare, no KO violation possible
  if (!previousBoardState || !Array.isArray(previousBoardState)) {
    return false;
  }
  
  const boardSize = currentBoardState.length;
  const { position, color } = proposedMove;
  
  // Validate board size consistency
  if (previousBoardState.length !== boardSize) {
    return false;
  }
  
  // Validate move position is within bounds
  if (position.x < 0 || position.x >= boardSize || position.y < 0 || position.y >= boardSize) {
    return false;
  }
  
  // Validate position is empty
  if (currentBoardState[position.y][position.x] !== '.') {
    return false;
  }
  
  // Create a copy of the current board and simulate the move
  const simulatedBoard = currentBoardState.map(row => [...row]);
  simulatedBoard[position.y][position.x] = color === 'black' ? 'B' : 'W';
  
  // Find and remove captured opponent stones
  const oppositeColor = color === 'black' ? 'W' : 'B';
  const adjacentPositions = [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 }
  ].filter(pos => pos.x >= 0 && pos.x < boardSize && pos.y >= 0 && pos.y < boardSize);
  
  // Check each adjacent position for opponent groups to capture
  for (const adjPos of adjacentPositions) {
    if (simulatedBoard[adjPos.y][adjPos.x] === oppositeColor) {
      const group = findConnectedGroupFromArray(simulatedBoard, adjPos, oppositeColor);
      const hasLibertiesInGroup = checkGroupLiberties(simulatedBoard, group);
      
      if (!hasLibertiesInGroup) {
        // Remove captured stones
        group.forEach(stone => {
          simulatedBoard[stone.y][stone.x] = '.';
        });
      }
    }
  }
  
  // Compare the resulting board state with the previous board state
  return boardStatesEqual(simulatedBoard, previousBoardState);
};

// Helper function to find connected group from 2D array
function findConnectedGroupFromArray(
  board: string[][],
  startPos: { x: number; y: number },
  color: string
): { x: number; y: number }[] {
  const boardSize = board.length;
  const visited = new Set<string>();
  const group: { x: number; y: number }[] = [];
  
  function visit(pos: { x: number; y: number }) {
    const key = `${pos.x},${pos.y}`;
    if (visited.has(key)) return;
    if (pos.x < 0 || pos.x >= boardSize || pos.y < 0 || pos.y >= boardSize) return;
    if (board[pos.y][pos.x] !== color) return;
    
    visited.add(key);
    group.push(pos);
    
    // Check adjacent positions
    visit({ x: pos.x - 1, y: pos.y });
    visit({ x: pos.x + 1, y: pos.y });
    visit({ x: pos.x, y: pos.y - 1 });
    visit({ x: pos.x, y: pos.y + 1 });
  }
  
  visit(startPos);
  return group;
}

// Helper function to check if a group has liberties
function checkGroupLiberties(
  board: string[][],
  group: { x: number; y: number }[]
): boolean {
  const boardSize = board.length;
  
  for (const stone of group) {
    const adjacentPositions = [
      { x: stone.x - 1, y: stone.y },
      { x: stone.x + 1, y: stone.y },
      { x: stone.x, y: stone.y - 1 },
      { x: stone.x, y: stone.y + 1 }
    ];
    
    for (const adjPos of adjacentPositions) {
      if (adjPos.x >= 0 && adjPos.x < boardSize && adjPos.y >= 0 && adjPos.y < boardSize) {
        if (board[adjPos.y][adjPos.x] === '.') {
          return true; // Found a liberty
        }
      }
    }
  }
  
  return false; // No liberties found
}

// Helper function to compare two board states
function boardStatesEqual(board1: string[][], board2: string[][]): boolean {
  if (board1.length !== board2.length) return false;
  
  for (let y = 0; y < board1.length; y++) {
    if (board1[y].length !== board2[y].length) return false;
    for (let x = 0; x < board1[y].length; x++) {
      if (board1[y][x] !== board2[y][x]) return false;
    }
  }
  
  return true;
}

// Capture stones that have no liberties after a move
export const captureDeadStones = (gameState: GameState, lastMovePosition: Position): { 
  updatedStones: Stone[], 
  capturedCount: number,
  koPosition?: Position
} => {
  const { board } = gameState;
  const { stones, size } = board;
  
  // Find the stone just placed
  const lastStone = findStoneAt(lastMovePosition, stones);
  if (!lastStone) {
    console.log("No stone found at the last move position");
    return { updatedStones: stones, capturedCount: 0 };
  }
  
  const oppositeColor = lastStone.color === 'black' ? 'white' : 'black';
  
  // Check all adjacent positions for opponent stones
  const adjacentPositions = getAdjacentPositions(lastMovePosition).filter(p => isWithinBounds(p, size));
  console.log(`Checking ${adjacentPositions.length} adjacent positions for captures`);
  
  let capturedCount = 0;
  let remainingStones = [...stones];
  let capturedPositions: Position[] = [];
  // Preserve existing KO position by default unless we create a new one
  let koPosition: Position | undefined = gameState.koPosition;
  
  // Check each adjacent position for enemy groups that might be captured
  adjacentPositions.forEach(adjPos => {
    const stoneAtPos = findStoneAt(adjPos, remainingStones);
    
    // If there's an opponent's stone at this position
    if (stoneAtPos && stoneAtPos.color === oppositeColor) {
      console.log(`Found opponent ${oppositeColor} stone at (${adjPos.x}, ${adjPos.y})`);
      
      // Get the entire connected group
      const group = getConnectedGroup(adjPos, remainingStones, size);
      console.log(`Group has ${group.length} stones`);
      
      // Check if this group has any liberties
      const liberties = countLiberties(group, remainingStones, size);
      console.log(`Group has ${liberties} liberties`);
      
      // If the group has no liberties, remove all stones in the group
      if (liberties === 0) {
        console.log(`Capturing group of ${group.length} ${oppositeColor} stones`);
        
        // Store the captured positions for later rendering
        capturedPositions = [...capturedPositions, ...group];
        
        // Remove captured stones
        const beforeCount = remainingStones.length;
        remainingStones = remainingStones.filter(stone => 
          !group.some(pos => pos.x === stone.position.x && pos.y === stone.position.y)
        );
        const afterCount = remainingStones.length;
        console.log(`Removed ${beforeCount - afterCount} stones from board`);
        
        capturedCount += group.length;
        
        // Track KO position
        if (group.length === 1) {
          // Only update the KO position if we're capturing a single stone
          // This will create a new KO situation
          koPosition = group[0];
        }
      }
    }
  });
  
  console.log(`Total captured: ${capturedCount} ${oppositeColor} stones at positions:`, capturedPositions);
  
  return { updatedStones: remainingStones, capturedCount, koPosition };
};

// Helper function to check if a move is a pass
function isPassMove(move: GameMove): move is { pass: true } {
  return typeof move === 'object' && 'pass' in move;
}

// Apply all Go rules to validate and process a move
export const applyGoRules = (
  position: Position, 
  color: StoneColor, 
  gameState: GameState
): { 
  valid: boolean, 
  updatedGameState?: GameState,
  error?: string
} => {
  // Check basic move validity
  if (!isWithinBounds(position, gameState.board.size)) {
    return { valid: false, error: 'Position is outside the board' };
  }
  
  // Check if position is already occupied
  if (!isEmpty(position, gameState.board.stones)) {
    return { valid: false, error: 'Position is already occupied' };
  }
  
  // Check for ko rule violation
  if (isKoViolation(position, color, gameState)) {
    return { valid: false, error: 'Ko rule violation' };
  }
  
  // Check for suicide move
  if (isSuicideMove(position, color, gameState)) {
    return { valid: false, error: 'Suicide move is not allowed' };
  }
  
  // Add the new stone
  const updatedStones = [...gameState.board.stones, { position, color }];
  
  // Capture any dead stones and track KO state
  const { updatedStones: afterCaptureStones, capturedCount, koPosition } = 
    captureDeadStones({ ...gameState, board: { ...gameState.board, stones: updatedStones } }, position);
  
  // Update captured stones count
  const updatedCapturedStones = { ...gameState.capturedStones };
  if (color === 'black' || color === 'white') {
    updatedCapturedStones[color] += capturedCount;
  }
  
  // Special case: reset KO position if we just played elsewhere
  let newKoPosition = koPosition;
  
  // If the KO position was set and we played somewhere else,
  // we've satisfied the KO rule by playing elsewhere.
  // If a new KO position was created in this move, it will be in koPosition
  // If no new KO was created, we should clear the KO restriction for the next move
  if (gameState.koPosition && 
      (position.x !== gameState.koPosition.x || position.y !== gameState.koPosition.y) && 
      !koPosition) {
    newKoPosition = undefined;
  }

  // Update the game state
  const updatedGameState: GameState = {
    ...gameState,
    board: {
      ...gameState.board,
      stones: afterCaptureStones
    },
    capturedStones: updatedCapturedStones,
    // Toggle turn normally after the first move
    currentTurn: color === 'black' ? 'white' : 'black',
    history: [...gameState.history, position],
    koPosition: newKoPosition
  };
  
  return { valid: true, updatedGameState };
}; 