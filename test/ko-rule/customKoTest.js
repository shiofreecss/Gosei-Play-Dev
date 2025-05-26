/**
 * Custom KO Rule Test
 * Easy-to-modify test scenarios
 */

// KO rule implementation
function checkKoRule(currentBoardState, proposedMove, previousBoardState) {
  if (!previousBoardState || !Array.isArray(previousBoardState)) {
    return false;
  }
  
  const boardSize = currentBoardState.length;
  const { position, color } = proposedMove;
  
  if (previousBoardState.length !== boardSize) return false;
  if (position.x < 0 || position.x >= boardSize || position.y < 0 || position.y >= boardSize) return false;
  if (currentBoardState[position.y][position.x] !== '.') return false;
  
  const simulatedBoard = currentBoardState.map(row => [...row]);
  simulatedBoard[position.y][position.x] = color === 'black' ? 'B' : 'W';
  
  const oppositeColor = color === 'black' ? 'W' : 'B';
  const adjacentPositions = [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 }
  ].filter(pos => pos.x >= 0 && pos.x < boardSize && pos.y >= 0 && pos.y < boardSize);
  
  for (const adjPos of adjacentPositions) {
    if (simulatedBoard[adjPos.y][adjPos.x] === oppositeColor) {
      const group = findConnectedGroup(simulatedBoard, adjPos, oppositeColor);
      const hasLibertiesInGroup = checkGroupLiberties(simulatedBoard, group);
      
      if (!hasLibertiesInGroup) {
        group.forEach(stone => {
          simulatedBoard[stone.y][stone.x] = '.';
        });
      }
    }
  }
  
  return boardStatesEqual(simulatedBoard, previousBoardState);
}

function findConnectedGroup(board, startPos, color) {
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
    
    visit({ x: pos.x - 1, y: pos.y });
    visit({ x: pos.x + 1, y: pos.y });
    visit({ x: pos.x, y: pos.y - 1 });
    visit({ x: pos.x, y: pos.y + 1 });
  }
  
  visit(startPos);
  return group;
}

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
          return true;
        }
      }
    }
  }
  
  return false;
}

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

function displayBoard(board, title = 'Board') {
  console.log(`\n${title}:`);
  board.forEach((row, y) => {
    console.log(`${y}: ${row.join(' ')}`);
  });
  console.log('   ' + Array.from({length: board[0].length}, (_, i) => i).join(' '));
}

// 🎮 EDIT THESE BOARDS TO TEST YOUR OWN SCENARIOS! 🎮

console.log('🧪 Custom KO Rule Test - Edit the boards below to test your own scenarios!');

// Test Case 1: Your Custom Board
console.log('\n=== TEST CASE 1: Your Custom Scenario ===');

const yourCurrentBoard = [
  ['.', '.', '.', '.', '.'],
  ['.', 'B', 'W', '.', '.'],
  ['.', 'W', '.', 'W', '.'],  // ← Edit this board
  ['.', 'B', 'W', '.', '.'],
  ['.', '.', '.', '.', '.']
];

const yourPreviousBoard = [
  ['.', '.', '.', '.', '.'],
  ['.', 'B', 'W', '.', '.'],
  ['.', 'W', 'B', 'W', '.'],  // ← Edit this board
  ['.', 'B', 'W', '.', '.'],
  ['.', '.', '.', '.', '.']
];

const yourMove = { position: { x: 2, y: 2 }, color: 'black' };  // ← Edit this move

displayBoard(yourCurrentBoard, 'Your Current Board');
displayBoard(yourPreviousBoard, 'Your Previous Board');

console.log(`\nYour move: ${yourMove.color} at (${yourMove.position.x}, ${yourMove.position.y})`);

const result1 = checkKoRule(yourCurrentBoard, yourMove, yourPreviousBoard);
console.log('Result:', result1 ? '🚫 KO VIOLATION' : '✅ LEGAL MOVE');

// Test Case 2: Another Custom Scenario
console.log('\n=== TEST CASE 2: Another Custom Scenario ===');

const anotherCurrentBoard = [
  ['.', '.', '.', '.', '.', '.', '.'],
  ['.', '.', 'B', 'B', 'B', '.', '.'],
  ['.', '.', 'W', '.', 'W', '.', '.'],  // ← Edit this board
  ['.', '.', 'B', 'B', 'B', '.', '.'],
  ['.', '.', '.', '.', '.', '.', '.']
];

const anotherPreviousBoard = [
  ['.', '.', '.', '.', '.', '.', '.'],
  ['.', '.', 'B', 'B', 'B', '.', '.'],
  ['.', '.', 'W', 'W', 'W', '.', '.'],  // ← Edit this board  
  ['.', '.', 'B', 'B', 'B', '.', '.'],
  ['.', '.', '.', '.', '.', '.', '.']
];

const anotherMove = { position: { x: 3, y: 2 }, color: 'white' };  // ← Edit this move

displayBoard(anotherCurrentBoard, 'Another Current Board');
displayBoard(anotherPreviousBoard, 'Another Previous Board');

console.log(`\nAnother move: ${anotherMove.color} at (${anotherMove.position.x}, ${anotherMove.position.y})`);

const result2 = checkKoRule(anotherCurrentBoard, anotherMove, anotherPreviousBoard);
console.log('Result:', result2 ? '🚫 KO VIOLATION' : '✅ LEGAL MOVE');

// Quick reference
console.log('\n' + '='.repeat(50));
console.log('📚 Quick Reference:');
console.log('• B = Black stone');
console.log('• W = White stone');
console.log('• . = Empty intersection');
console.log('• Coordinates: (x, y) where (0,0) is top-left');
console.log('• KO rule: Move is illegal if it recreates the previous board state');
console.log('='.repeat(50));

console.log('\n🎯 To test your own scenarios:');
console.log('1. Edit the board arrays above');
console.log('2. Change the move coordinates and color');
console.log('3. Run: node customKoTest.js');

module.exports = { checkKoRule }; 