/**
 * Interactive KO Rule Demo
 * Test the KO rule on various board scenarios
 */

// Import the KO rule function (copy from goGameLogic.ts)
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

function displayBoard(board, title = 'Board', highlight = null) {
  console.log(`\n${title}:`);
  board.forEach((row, y) => {
    let rowDisplay = `${y}: `;
    row.forEach((cell, x) => {
      if (highlight && highlight.x === x && highlight.y === y) {
        rowDisplay += `[${cell}]`;
      } else {
        rowDisplay += ` ${cell} `;
      }
    });
    console.log(rowDisplay);
  });
  console.log('   ' + Array.from({length: board[0].length}, (_, i) => ` ${i} `).join(''));
}

// Demo scenarios
const demos = {
  // Classic KO situation
  classicKo: {
    name: "Classic KO Situation",
    description: "White just captured a black stone. Can black recapture immediately?",
    current: [
      ['.', '.', '.', '.', '.'],
      ['.', 'B', 'W', '.', '.'],
      ['.', 'W', '.', 'W', '.'],  // White captured black at (2,2)
      ['.', 'B', 'W', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    previous: [
      ['.', '.', '.', '.', '.'],
      ['.', 'B', 'W', '.', '.'],
      ['.', 'W', 'B', 'W', '.'],  // Before white's capture
      ['.', 'B', 'W', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    testMoves: [
      { position: { x: 2, y: 2 }, color: 'black', description: "Black tries to recapture" },
      { position: { x: 0, y: 0 }, color: 'black', description: "Black plays elsewhere" }
    ]
  },
  
  // Edge KO
  edgeKo: {
    name: "Edge KO Situation",
    description: "KO situation near the board edge",
    current: [
      ['W', '.', 'W', '.', '.'],
      ['.', 'W', 'B', 'W', '.'],
      ['W', 'B', '.', 'B', '.'],  // Black captured white at (2,2)
      ['.', 'W', 'B', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    previous: [
      ['W', '.', 'W', '.', '.'],
      ['.', 'W', 'B', 'W', '.'],
      ['W', 'B', 'W', 'B', '.'],  // Before black's capture
      ['.', 'W', 'B', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    testMoves: [
      { position: { x: 2, y: 2 }, color: 'white', description: "White tries to recapture" },
      { position: { x: 4, y: 4 }, color: 'white', description: "White plays elsewhere" }
    ]
  },
  
  // Not KO - multiple captures
  multipleCapture: {
    name: "Multiple Stone Capture (Not KO)",
    description: "Capturing multiple stones - this should be legal",
    current: [
      ['.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', 'B', 'B', 'B', '.', '.'],
      ['.', '.', 'W', '.', 'W', '.', '.'],  // Black captured 2 white stones
      ['.', '.', 'B', 'B', 'B', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.']
    ],
    previous: [
      ['.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', 'B', 'B', 'B', '.', '.'],
      ['.', '.', 'W', 'W', 'W', '.', '.'],  // Before black's capture
      ['.', '.', 'B', 'B', 'B', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.']
    ],
    testMoves: [
      { position: { x: 3, y: 2 }, color: 'white', description: "White recaptures middle stone" }
    ]
  }
};

function runDemo(demoKey) {
  const demo = demos[demoKey];
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 ${demo.name}`);
  console.log(`📝 ${demo.description}`);
  console.log('='.repeat(60));
  
  displayBoard(demo.current, 'Current Board State');
  displayBoard(demo.previous, 'Previous Board State (2 moves ago)');
  
  demo.testMoves.forEach((move, index) => {
    console.log(`\n--- Test Move ${index + 1}: ${move.description} ---`);
    console.log(`Move: ${move.color} stone at (${move.position.x}, ${move.position.y})`);
    
    // Show where the move would be placed
    const boardCopy = demo.current.map(row => [...row]);
    displayBoard(boardCopy, 'Board with proposed move', move.position);
    
    const result = checkKoRule(demo.current, move, demo.previous);
    
    if (result) {
      console.log('🚫 Result: KO VIOLATION - Move is illegal');
    } else {
      console.log('✅ Result: LEGAL MOVE - Move is allowed');
    }
  });
}

// Interactive menu
function showMenu() {
  console.log('\n🎮 KO Rule Interactive Demo');
  console.log('═'.repeat(40));
  console.log('Choose a demo scenario:');
  console.log('1. Classic KO Situation');
  console.log('2. Edge KO Situation');
  console.log('3. Multiple Stone Capture (Not KO)');
  console.log('4. Run All Demos');
  console.log('5. Exit');
  console.log('═'.repeat(40));
}

function runAllDemos() {
  Object.keys(demos).forEach(demoKey => {
    runDemo(demoKey);
  });
}

// Main execution
function main() {
  console.log('🎯 Welcome to the KO Rule Demo!');
  console.log('This demo shows how the KO rule prevents infinite capture loops in Go.');
  
  // For now, let's run all demos automatically
  runAllDemos();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Demo Complete!');
  console.log('📚 Key Takeaways:');
  console.log('  • KO rule prevents immediate recapture of single stones');
  console.log('  • Multiple stone captures are usually legal');
  console.log('  • Players can break KO by playing elsewhere first');
  console.log('  • The rule compares entire board states, not just positions');
}

// Run the demo
main();

module.exports = { checkKoRule, demos, runDemo }; 