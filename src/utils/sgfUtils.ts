import { GameState, GameMove, Position, StoneColor } from '../types/go';

// Helper function to check if a move is a pass
function isPassMove(move: GameMove): move is { pass: true } {
  return (move as any).pass === true;
}

// Convert board coordinates to SGF format
function positionToSGF(pos: Position, boardSize: number): string {
  // SGF uses lowercase letters for coordinates
  // a-s for 19x19 boards (skipping 'i')
  const xCoord = String.fromCharCode(97 + pos.x); // a, b, c, etc.
  const yCoord = String.fromCharCode(97 + pos.y); // a, b, c, etc.
  return xCoord + yCoord;
}

// Get the SGF color character
function colorToSGF(color: StoneColor): string {
  return color === 'black' ? 'B' : 'W';
}

// Extract position from different move formats
function extractPosition(move: GameMove): Position | null {
  if (isPassMove(move)) {
    return null; // Pass moves don't have positions
  }
  
  // Handle different move formats
  if ((move as any).position) {
    // Server format: { position: { x, y }, color, ... }
    return (move as any).position;
  } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
    // Direct position format: { x, y }
    return move as Position;
  }
  
  console.warn('Unknown move format in SGF export:', move);
  return null;
}

// Generate SGF content from game state
export function generateSGF(gameState: GameState): string {
  const boardSize = gameState.board.size;
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Start SGF with game metadata
  let sgf = '(;FF[4]GM[1]SZ[' + boardSize + ']';
  
  // Add game information
  sgf += 'DT[' + date + ']';
  sgf += 'AP[Gosei Play:1.0]';
  
  // Add player information if available
  const blackPlayer = gameState.players.find(p => p.color === 'black');
  const whitePlayer = gameState.players.find(p => p.color === 'white');
  
  if (blackPlayer) {
    sgf += 'PB[' + blackPlayer.username + ']';
  }
  if (whitePlayer) {
    sgf += 'PW[' + whitePlayer.username + ']';
  }
  
  // Add time control information if available
  if (gameState.timeControl) {
    const timeControl = gameState.timeControl;
    // Convert time from minutes to seconds for SGF format
    const timeInSeconds = timeControl.timeControl * 60;
    sgf += 'TM[' + timeInSeconds + ']';
    
    if (timeControl.byoYomiPeriods && timeControl.byoYomiTime) {
      sgf += 'OT[' + timeControl.byoYomiPeriods + 'x' + timeControl.byoYomiTime + ' byoyomi]';
    } else if (timeControl.fischerTime) {
      sgf += 'OT[+' + timeControl.fischerTime + ' fischer]';
    }
  }
  
  // Add game type and handicap
  if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
    sgf += 'HA[' + gameState.handicap + ']';
    
    // Add handicap stone positions if available
    const handicapStones = gameState.board.stones.filter(stone => 
      stone.color === 'black' && 
      !gameState.history.some(move => {
        const pos = extractPosition(move);
        return pos && pos.x === stone.position.x && pos.y === stone.position.y;
      })
    );
    
    if (handicapStones.length > 0) {
      sgf += 'AB';
      handicapStones.forEach(stone => {
        sgf += '[' + positionToSGF(stone.position, boardSize) + ']';
      });
    }
  }
  
  // Add game result if finished
  if (gameState.status === 'finished' && gameState.result) {
    sgf += 'RE[' + gameState.result + ']';
  }
  
  // Determine starting color for moves
  let currentColor: StoneColor = 'black';
  if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
    currentColor = 'white'; // White plays first in handicap games
  }
  
  // Add moves
  gameState.history.forEach((move, index) => {
    if (isPassMove(move)) {
      // Pass move
      sgf += ';' + colorToSGF(currentColor) + '[]';
    } else {
      const pos = extractPosition(move);
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        // Validate coordinates are within board bounds
        if (pos.x >= 0 && pos.x < boardSize && pos.y >= 0 && pos.y < boardSize) {
          sgf += ';' + colorToSGF(currentColor) + '[' + positionToSGF(pos, boardSize) + ']';
        } else {
          console.warn('Invalid coordinates in SGF export:', pos);
        }
      } else {
        console.warn('Could not extract position for move', index, move);
      }
    }
    
    // Toggle color for next move
    currentColor = currentColor === 'black' ? 'white' : 'black';
  });
  
  // Close SGF
  sgf += ')';
  
  return sgf;
}

// Download SGF file
export function downloadSGF(gameState: GameState, filename?: string): void {
  const sgfContent = generateSGF(gameState);
  
  // Generate filename if not provided
  if (!filename) {
    const date = new Date().toISOString().split('T')[0];
    const blackPlayer = gameState.players.find(p => p.color === 'black');
    const whitePlayer = gameState.players.find(p => p.color === 'white');
    const blackName = blackPlayer?.username || 'Black';
    const whiteName = whitePlayer?.username || 'White';
    filename = `${blackName}_vs_${whiteName}_${date}.sgf`;
  }
  
  // Create blob and download
  const blob = new Blob([sgfContent], { type: 'application/x-go-sgf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Copy SGF to clipboard
export function copySGFToClipboard(gameState: GameState): Promise<void> {
  const sgfContent = generateSGF(gameState);
  return navigator.clipboard.writeText(sgfContent);
} 