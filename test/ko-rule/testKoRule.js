/**
 * Simple KO Rule Test Script
 * Demonstrates the KO rule implementation for Go
 */

// Simulate the KO rule checking function
function checkKoRule(currentBoardState, proposedMove, previousBoardState) {
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
}

// Helper function to find connected group from 2D array
function findConnectedGroupFromArray(board, startPos, color) {
  const boardSize = board.length;
  const visited = new Set();
  const group = [];
  
  function visit(pos) {
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
function checkGroupLiberties(board, group) {
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
function boardStatesEqual(board1, board2) {
  if (board1.length !== board2.length) return false;
  
  for (let y = 0; y < board1.length; y++) {
    if (board1[y].length !== board2[y].length) return false;
    for (let x = 0; x < board1[y].length; x++) {
      if (board1[y][x] !== board2[y][x]) return false;
    }
  }
  
  return true;
}

// Helper function to display board
function displayBoard(board, title = 'Board') {
  console.log(`\n${title}:`);
  board.forEach((row, y) => {
    console.log(`${y}: ${row.join(' ')}`);
  });
  console.log('   ' + Array.from({length: board[0].length}, (_, i) => i).join(' '));
}

// Test cases
function runTests() {
  console.log('=== KO Rule Implementation Tests ===\n');

  // Test 1: Simple KO situation
  console.log('Test 1: Simple KO Violation');
  const currentBoard1 = [
    ['.', '.', '.', '.', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', 'W', '.', 'W', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', '.', '.', '.', '.']
  ];

  const previousBoard1 = [
    ['.', '.', '.', '.', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', 'W', 'B', 'W', '.'],
    ['.', 'B', 'W', '.', '.'],
    ['.', '.', '.', '.', '.']
  ];

  const move1 = { position: { x: 2, y: 2 }, color: 'black' };
  const result1 = checkKoRule(currentBoard1, move1, previousBoard1);
  
  displayBoard(currentBoard1, 'Current Board');
  displayBoard(previousBoard1, 'Previous Board');
  console.log('Proposed move: Black at (2, 2)');
  console.log('Result:', result1 ? '❌ KO VIOLATION - Move not allowed' : '✅ LEGAL MOVE');
  console.log('Expected: KO VIOLATION');
  console.log('Test 1:', result1 ? '✅ PASSED' : '❌ FAILED');

  // Test 2: Legal move (not KO)
  console.log('\n' + '='.repeat(50));
  console.log('Test 2: Legal Move (Different Position)');
  
  const move2 = { position: { x: 4, y: 4 }, color: 'black' };
  const result2 = checkKoRule(currentBoard1, move2, previousBoard1);
  
  console.log('Proposed move: Black at (4, 4)');
  console.log('Result:', result2 ? '❌ KO VIOLATION - Move not allowed' : '✅ LEGAL MOVE');
  console.log('Expected: LEGAL MOVE');
  console.log('Test 2:', !result2 ? '✅ PASSED' : '❌ FAILED');

  // Test 3: No previous board state
  console.log('\n' + '='.repeat(50));
  console.log('Test 3: No Previous Board State');
  
  const result3 = checkKoRule(currentBoard1, move1, null);
  console.log('Proposed move: Black at (2, 2)');
  console.log('Previous board: null');
  console.log('Result:', result3 ? '❌ KO VIOLATION - Move not allowed' : '✅ LEGAL MOVE');
  console.log('Expected: LEGAL MOVE (no KO possible)');
  console.log('Test 3:', !result3 ? '✅ PASSED' : '❌ FAILED');

  // Test 4: Multiple stone capture (not KO)
  console.log('\n' + '='.repeat(50));
  console.log('Test 4: Multiple Stone Capture (Not KO)');
  
  const currentBoard4 = [
    ['.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.'],
    ['.', '.', 'W', '.', 'W', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.']
  ];

  const previousBoard4 = [
    ['.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.'],
    ['.', '.', 'W', 'W', 'W', '.', '.'],
    ['.', '.', 'B', 'B', 'B', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.']
  ];

  const move4 = { position: { x: 3, y: 2 }, color: 'white' };
  const result4 = checkKoRule(currentBoard4, move4, previousBoard4);
  
  displayBoard(currentBoard4, 'Current Board (Multiple Capture)');
  displayBoard(previousBoard4, 'Previous Board (Multiple Capture)');
  console.log('Proposed move: White at (3, 2)');
  console.log('Result:', result4 ? '❌ KO VIOLATION - Move not allowed' : '✅ LEGAL MOVE');
  console.log('Expected: LEGAL MOVE (multiple stones, not KO)');
  console.log('Test 4:', !result4 ? '✅ PASSED' : '❌ FAILED');

  // Summary
  const totalTests = 4;
  const passedTests = [result1, !result2, !result3, !result4].filter(Boolean).length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! KO rule implementation is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the implementation.');
  }
}

// Run the tests
runTests();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkKoRule, displayBoard };
} 