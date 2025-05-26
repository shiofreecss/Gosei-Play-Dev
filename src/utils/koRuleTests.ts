import { checkKoRule } from './goGameLogic';

/**
 * Test cases for the KO rule implementation
 * These demonstrate various scenarios where KO violations should be detected
 */

// Example 1: Simple KO situation on a 9x9 board
export const testSimpleKo = (): boolean => {
  // Current board state with a potential KO capture
  const currentBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', 'W', '.', 'W', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  // Previous board state (before white's last move)
  const previousBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', 'W', 'B', 'W', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  // Proposed move: Black tries to recapture at (3, 4)
  const proposedMove = {
    position: { x: 3, y: 4 },
    color: 'black' as const
  };

  // This should return true (KO violation)
  const result = checkKoRule(currentBoard, proposedMove, previousBoard);
  console.log('Simple KO test result:', result ? 'VIOLATION DETECTED' : 'MOVE ALLOWED');
  
  return result === true;
};

// Example 2: Legal move - not a KO violation
export const testLegalMove = (): boolean => {
  const currentBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', 'W', '.', 'W', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  const previousBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', 'W', 'B', 'W', '.', '.', '.', '.'],
    ['.', '.', 'B', 'W', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  // Proposed move: Black plays elsewhere at (6, 6)
  const proposedMove = {
    position: { x: 6, y: 6 },
    color: 'black' as const
  };

  // This should return false (legal move)
  const result = checkKoRule(currentBoard, proposedMove, previousBoard);
  console.log('Legal move test result:', result ? 'VIOLATION DETECTED' : 'MOVE ALLOWED');
  
  return result === false;
};

// Example 3: Multiple stone capture - not KO
export const testMultipleStoneCapture = (): boolean => {
  const currentBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.', '.', '.'],
    ['.', '.', 'W', '.', 'W', '.', '.', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  const previousBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.', '.', '.'],
    ['.', '.', 'W', 'W', 'W', '.', '.', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  // Proposed move: White recaptures at (3, 3)
  const proposedMove = {
    position: { x: 3, y: 3 },
    color: 'white' as const
  };

  // This should return false (not KO, multiple stones captured)
  const result = checkKoRule(currentBoard, proposedMove, previousBoard);
  console.log('Multiple stone capture test result:', result ? 'VIOLATION DETECTED' : 'MOVE ALLOWED');
  
  return result === false;
};

// Example 4: Edge case - no previous board state
export const testNoPreviousBoard = (): boolean => {
  const currentBoard = [
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.']
  ];

  const proposedMove = {
    position: { x: 4, y: 4 },
    color: 'black' as const
  };

  // This should return false (no KO possible without previous state)
  const result = checkKoRule(currentBoard, proposedMove, null);
  console.log('No previous board test result:', result ? 'VIOLATION DETECTED' : 'MOVE ALLOWED');
  
  return result === false;
};

// Example 5: Different board sizes
export const testDifferentBoardSizes = (): boolean => {
  // 13x13 board test
  const create13x13Board = (pattern: string[][]): string[][] => {
    const board = Array(13).fill(null).map(() => Array(13).fill('.'));
    pattern.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== '.') {
          board[y][x] = cell;
        }
      });
    });
    return board;
  };

  const pattern1 = [
    ['.', '.', '.', '.'],
    ['.', 'B', 'W', '.'],
    ['.', 'W', '.', 'W'],
    ['.', 'B', 'W', '.']
  ];

  const pattern2 = [
    ['.', '.', '.', '.'],
    ['.', 'B', 'W', '.'],
    ['.', 'W', 'B', 'W'],
    ['.', 'B', 'W', '.']
  ];

  const currentBoard = create13x13Board(pattern1);
  const previousBoard = create13x13Board(pattern2);

  const proposedMove = {
    position: { x: 2, y: 2 },
    color: 'black' as const
  };

  // This should return true (KO violation on 13x13 board)
  const result = checkKoRule(currentBoard, proposedMove, previousBoard);
  console.log('13x13 board test result:', result ? 'VIOLATION DETECTED' : 'MOVE ALLOWED');
  
  return result === true;
};

// Run all tests
export const runAllKoTests = (): void => {
  console.log('\n=== KO Rule Tests ===\n');
  
  const tests = [
    { name: 'Simple KO', test: testSimpleKo },
    { name: 'Legal Move', test: testLegalMove },
    { name: 'Multiple Stone Capture', test: testMultipleStoneCapture },
    { name: 'No Previous Board', test: testNoPreviousBoard },
    { name: 'Different Board Sizes', test: testDifferentBoardSizes }
  ];

  let passed = 0;
  
  tests.forEach(({ name, test }) => {
    try {
      const result = test();
      console.log(`✓ ${name}: ${result ? 'PASSED' : 'FAILED'}`);
      if (result) passed++;
    } catch (error) {
      console.log(`✗ ${name}: ERROR - ${error}`);
    }
  });

  console.log(`\nTests passed: ${passed}/${tests.length}\n`);
};

// Usage example for the main KO checking function
export const exampleUsage = (): void => {
  console.log('\n=== KO Rule Usage Example ===\n');
  
  // Create a simple board state
  const boardState = [
    ['.', '.', '.', '.', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', 'W', '.', 'W', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', '.', '.', '.', '.']
  ];

  const previousState = [
    ['.', '.', '.', '.', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', 'W', 'B', 'W', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', '.', '.', '.', '.']
  ];

  const move = {
    position: { x: 2, y: 2 },
    color: 'black' as const
  };

  const isKoViolation = checkKoRule(boardState, move, previousState);
  
  console.log('Board state:');
  boardState.forEach(row => console.log(row.join(' ')));
  
  console.log('\nProposed move:', move);
  console.log('Result:', isKoViolation ? 'KO VIOLATION - Move not allowed' : 'LEGAL MOVE - Move allowed');
};

// Helper function to display board state
export const displayBoard = (board: string[][], title: string = 'Board'): void => {
  console.log(`\n${title}:`);
  board.forEach(row => console.log(row.join(' ')));
  console.log('');
}; 