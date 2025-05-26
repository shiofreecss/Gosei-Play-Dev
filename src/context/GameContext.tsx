import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Position, Player, StoneColor, GameMove, GameOptions, Stone, ScoringRule, Territory, GameType, ColorPreference } from '../types/go';
import { applyGoRules } from '../utils/goGameLogic';
import { SOCKET_URL } from '../config';
import { 
  calculateChineseScore, 
  calculateJapaneseScore,
  calculateKoreanScore,
  calculateAGAScore,
  calculateIngScore
} from '../utils/scoringUtils';
import { getHandicapStones, getAdjustedKomi, getStartingColor } from '../utils/handicapUtils';
import { playStoneSound } from '../utils/soundUtils';
import { 
  isWithinBounds, 
  getStoneAt, 
  isKoViolation, 
  isSuicideMove, 
  captureDeadStones,
  getDeadStoneGroup,
  findStoneAt,
  getConnectedGroup,
  isGroupLikelyDead
} from '../utils/goGameLogic';

// Helper function to check if a move is a pass
function isPassMove(move: GameMove): move is { pass: true } {
  return typeof move === 'object' && 'pass' in move;
}

// Helper function to create a pass move
function createPassMove(): { pass: true } {
  return { pass: true };
}

// Define the context shape
interface GameContextType {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  moveError: string | null;
  currentPlayer: Player | null;
  createGame: (options: GameOptions & { playerName?: string }) => void;
  joinGame: (gameId: string, username: string) => void;
  placeStone: (position: Position) => void;
  passTurn: () => void;
  leaveGame: () => void;
  resetGame: () => void;
  syncGameState: () => void;
  syncDeadStones: () => void;
  clearMoveError: () => void;
  resignGame: () => void;
  toggleDeadStone: (position: Position) => void;
  confirmScore: () => void;
  requestUndo: () => void;
  respondToUndoRequest: (accept: boolean) => void;
  cancelScoring: () => void;
}

// Create context with default values
const GameContext = createContext<GameContextType>({
  gameState: null,
  loading: false,
  error: null,
  moveError: null,
  currentPlayer: null,
  createGame: () => {},
  joinGame: () => {},
  placeStone: () => {},
  passTurn: () => {},
  leaveGame: () => {},
  resetGame: () => {},
  syncGameState: () => {},
  syncDeadStones: () => {},
  clearMoveError: () => {},
  resignGame: () => {},
  toggleDeadStone: () => {},
  confirmScore: () => {},
  requestUndo: () => {},
  respondToUndoRequest: () => {},
  cancelScoring: () => {},
});

// Action types
type GameAction =
  | { type: 'CREATE_GAME_START' }
  | { type: 'CREATE_GAME_SUCCESS'; payload: { gameState: GameState; player: Player } }
  | { type: 'JOIN_GAME_START' }
  | { type: 'JOIN_GAME_SUCCESS'; payload: { gameState: GameState; player: Player } }
  | { type: 'UPDATE_GAME_STATE'; payload: GameState }
  | { type: 'GAME_ERROR'; payload: string }
  | { type: 'MOVE_ERROR'; payload: string }
  | { type: 'CLEAR_MOVE_ERROR' }
  | { type: 'RESET_GAME' }
  | { type: 'LEAVE_GAME' }
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'UPDATE_PLAYER_TIME'; payload: { playerId: string; color: StoneColor; timeRemaining: number; byoYomiPeriodsLeft?: number; byoYomiTimeLeft?: number; isInByoYomi?: boolean } };

// Reducer function
const gameReducer = (state: GameContextState, action: GameAction): GameContextState => {
  switch (action.type) {
    case 'CREATE_GAME_START':
    case 'JOIN_GAME_START':
      return { ...state, loading: true, error: null, moveError: null };
      
    case 'CREATE_GAME_SUCCESS':
    case 'JOIN_GAME_SUCCESS':
      return {
        ...state,
        gameState: {
          ...action.payload.gameState,
          socket: state.socket
        },
        currentPlayer: action.payload.player,
        loading: false,
        error: null,
        moveError: null,
      };
      
    case 'UPDATE_GAME_STATE':
      return {
        ...state,
        gameState: {
          ...action.payload,
          socket: state.socket
        },
        loading: false,
        error: null,
      };
      
    case 'GAME_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    
    case 'MOVE_ERROR':
      return {
        ...state,
        moveError: action.payload,
      };
    
    case 'CLEAR_MOVE_ERROR':
      return {
        ...state,
        moveError: null,
      };
      
    case 'RESET_GAME':
      return initialState;
      
    case 'LEAVE_GAME':
      return {
        ...initialState,
        socket: state.socket,
      };
      
    case 'SET_SOCKET':
      return {
        ...state,
        socket: action.payload,
      };
      
    case 'UPDATE_PLAYER_TIME':
      // Only update if gameState exists
      if (!state.gameState) return state;
      
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: state.gameState.players.map(player =>
            player.id === action.payload.playerId ? { 
              ...player, 
              timeRemaining: action.payload.timeRemaining,
              byoYomiPeriodsLeft: action.payload.byoYomiPeriodsLeft,
              byoYomiTimeLeft: action.payload.byoYomiTimeLeft,
              isInByoYomi: action.payload.isInByoYomi
            } : player
          )
        },
      };
      
    default:
      return state;
  }
};

// Initial state
interface GameContextState {
  gameState: GameState | null;
  currentPlayer: Player | null;
  loading: boolean;
  error: string | null;
  moveError: string | null;
  socket: Socket | null;
}

const initialState: GameContextState = {
  gameState: null,
  currentPlayer: null,
  loading: false,
  error: null,
  moveError: null,
  socket: null,
};

// Provider component
interface GameProviderProps {
  children: ReactNode;
  socketUrl?: string;
}

export const GameProvider: React.FC<GameProviderProps> = ({ 
  children, 
  socketUrl = SOCKET_URL 
}) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Socket connection
  useEffect(() => {
    // Only try to connect if we don't already have a socket
    if (!state.socket) {
      try {
        console.log('Attempting to connect to socket server at:', socketUrl);
        const newSocket = io(socketUrl, {
          transports: ['websocket', 'polling'], // Try websocket first, then polling
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 60000,
          forceNew: true,
          autoConnect: true
        });
        
        dispatch({ type: 'SET_SOCKET', payload: newSocket });
        
        // Set up listeners for socket events
        newSocket.on('connect', () => {
          console.log('Connected to socket server successfully');
        });
        
        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          dispatch({
            type: 'GAME_ERROR', 
            payload: 'Could not connect to game server. Please check your connection.'
          });
        });
        
        newSocket.on('disconnect', (reason) => {
          console.log('Disconnected from socket server, reason:', reason);
        });
        
        newSocket.on('error', (error) => {
          console.error('Socket error:', error);
          dispatch({ type: 'GAME_ERROR', payload: error });
        });
        
        // Setup handlers for game events
        newSocket.on('gameCreated', (response) => {
          if (response.success) {
            console.log('Game created successfully with ID:', response.gameId);
          } else {
            console.error('Game creation failed:', response.error);
            dispatch({ type: 'GAME_ERROR', payload: response.error || 'Failed to create game' });
          }
        });
        
        newSocket.on('joinedGame', (response) => {
          if (response.success) {
            console.log(`Joined game ${response.gameId} with ${response.numPlayers} players, status: ${response.status}, currentTurn: ${response.currentTurn}`);
            
            // Verify that our local state is in sync with the server's state
            if (state.gameState && state.gameState.id === response.gameId) {
              // Ensure currentTurn is correct - this fixes the white-player-created game issue
              if (state.gameState.currentTurn !== response.currentTurn) {
                console.log(`Correcting current turn from ${state.gameState.currentTurn} to ${response.currentTurn}`);
                // Create an updated game state with the correct current turn
                const updatedGameState = {
                  ...state.gameState,
                  currentTurn: response.currentTurn
                };
                
                // Update our local state
                dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
                
                // Also update localStorage
                try {
                  safelySetItem(`gosei-game-${updatedGameState.id}`, JSON.stringify(updatedGameState));
                } catch (e) {
                  console.warn('Failed to save corrected game state to localStorage:', e);
                }
              }
            }
          } else {
            console.error('Failed to join game:', response.error);
            dispatch({ type: 'GAME_ERROR', payload: response.error || 'Failed to join game' });
          }
        });
        
        newSocket.on('gameState', (gameState: GameState) => {
          console.log('Received updated game state:', gameState.id);
          console.log('Current turn:', gameState.currentTurn);
          // Log players for debugging
          gameState.players.forEach(player => {
            console.log(`Player ${player.username} is ${player.color}`);
          });
          
          // If game is finished but dead stone counts are missing, add them
          if (gameState.status === 'finished' && 
              gameState.deadStones && 
              gameState.deadStones.length > 0 && 
              gameState.score && 
              (gameState.score.deadBlackStones === undefined || 
               gameState.score.deadWhiteStones === undefined)) {
            
            console.log('Fixing missing dead stone counts in finished game');
            
            // Convert dead stones to a Set for faster lookups
            const deadStonePositions = new Set<string>();
            gameState.deadStones.forEach(pos => {
              deadStonePositions.add(`${pos.x},${pos.y}`);
            });
            
            // Count dead stones by color
            const deadBlackStones = gameState.board.stones.filter(stone => 
              stone.color === 'black' && deadStonePositions.has(`${stone.position.x},${stone.position.y}`)
            ).length;
            
            const deadWhiteStones = gameState.board.stones.filter(stone => 
              stone.color === 'white' && deadStonePositions.has(`${stone.position.x},${stone.position.y}`)
            ).length;
            
            console.log(`Added dead stone counts: ${deadBlackStones} black, ${deadWhiteStones} white`);
            
            // Update the score object with dead stone counts
            gameState.score = {
              ...gameState.score,
              deadBlackStones,
              deadWhiteStones
            };
          }
          
          dispatch({ type: 'UPDATE_GAME_STATE', payload: gameState });
          
          // Save game state to localStorage for persistence
          try {
            safelySetItem(`gosei-game-${gameState.id}`, JSON.stringify(gameState));
          } catch (e) {
            console.warn('Failed to save game state to localStorage:', e);
          }
        });
        
        newSocket.on('moveMade', (moveData) => {
          console.log(`Move made at (${moveData.position.x}, ${moveData.position.y}) by ${moveData.playerId}`);
          
          // Play stone sound when opponent makes a move
          // We only want to play the sound if the current player exists and the move wasn't made by them
          if (state.currentPlayer && moveData.playerId !== state.currentPlayer.id) {
            playStoneSound();
          }
        });
        
        newSocket.on('turnPassed', (passData) => {
          console.log(`Turn passed by ${passData.playerId}, next turn: ${passData.nextTurn}`);
        });
        
        newSocket.on('playerJoined', (joinData) => {
          console.log(`Player ${joinData.username} (${joinData.playerId}) joined the game`);
        });
        
        newSocket.on('playerLeft', (leaveData) => {
          console.log(`Player ${leaveData.playerId} left the game`);
        });
        
        newSocket.on('playerDisconnected', (disconnectData) => {
          console.log(`Player with socket ${disconnectData.socketId} disconnected`);
        });
        
        // Handle timer updates
        newSocket.on('timeUpdate', (timeData: { playerId: string; color: StoneColor; timeRemaining: number; byoYomiPeriodsLeft?: number; byoYomiTimeLeft?: number; isInByoYomi?: boolean }) => {
          console.log(`Time update for player ${timeData.playerId} (${timeData.color}): ${timeData.timeRemaining}s remaining`);
          
          // Add more detailed logging for byo-yomi time updates
          if (timeData.isInByoYomi) {
            console.log(`Byo-yomi time update: ${timeData.byoYomiTimeLeft}s remaining in current period, ${timeData.byoYomiPeriodsLeft} periods left`);
          }
          
          // Update the player's time in the game state directly
          dispatch({ 
            type: 'UPDATE_PLAYER_TIME', 
            payload: {
              playerId: timeData.playerId,
              color: timeData.color,
              timeRemaining: timeData.timeRemaining,
              byoYomiPeriodsLeft: timeData.byoYomiPeriodsLeft,
              byoYomiTimeLeft: timeData.byoYomiTimeLeft,
              isInByoYomi: timeData.isInByoYomi
            }
          });
        });
        
        // Handle player timeout
        newSocket.on('playerTimeout', (timeoutData) => {
          console.log(`Player ${timeoutData.playerId} (${timeoutData.color}) has run out of time`);
          console.log(`Timer debug: Received playerTimeout event`, timeoutData);
          
          // Show timeout notification with the proper message and result
          if (timeoutData.message && timeoutData.result) {
            dispatch({ 
              type: 'MOVE_ERROR', 
              payload: timeoutData.message
            });
            
            // If we have a notification system available, use it to show the timeout
            // The GamePage component should handle showing GameNotification for timeouts
            console.log(`Game ended by timeout: ${timeoutData.message} (${timeoutData.result})`);
          } else {
            // Fallback for backward compatibility
          if (timeoutData.color === state.currentPlayer?.color) {
            dispatch({ 
              type: 'MOVE_ERROR', 
              payload: 'You ran out of time! The game is over.' 
            });
            } else {
              dispatch({ 
                type: 'MOVE_ERROR', 
                payload: 'Your opponent ran out of time! You win!' 
              });
            }
          }
        });
        
        // Handle byo-yomi started event
        newSocket.on('byoYomiStarted', (byoYomiData) => {
          console.log(`Player ${byoYomiData.playerId} (${byoYomiData.color}) entered byo-yomi`);
          
          // Show notification about byo-yomi start
          if (byoYomiData.color === state.currentPlayer?.color) {
            dispatch({ 
              type: 'MOVE_ERROR', 
              payload: `You've entered byo-yomi! ${byoYomiData.periodsLeft} periods of ${byoYomiData.timePerPeriod} seconds each.` 
            });
          } else {
            dispatch({ 
              type: 'MOVE_ERROR', 
              payload: `Your opponent entered byo-yomi! ${byoYomiData.periodsLeft} periods remaining.` 
            });
          }
        });
        
        // Handle byo-yomi period used event
        newSocket.on('byoYomiPeriodUsed', (periodData) => {
          console.log(`Player ${periodData.playerId} (${periodData.color}) used a byo-yomi period`);
          
          // Show notification about period usage
          if (periodData.color === state.currentPlayer?.color) {
            dispatch({ 
              type: 'MOVE_ERROR', 
              payload: `Byo-yomi period used! ${periodData.periodsLeft} periods remaining.` 
            });
          } else {
            dispatch({ 
              type: 'MOVE_ERROR', 
              payload: `Opponent used a byo-yomi period. ${periodData.periodsLeft} periods remaining.` 
            });
          }
        });
        
        // Handle dead stone toggle from other players
        newSocket.on('deadStoneToggled', (deadStoneData) => {
          console.log(`Dead stone toggled at (${deadStoneData.position.x}, ${deadStoneData.position.y}) by player ${deadStoneData.playerId}`);
          
          // Apply dead stone changes from server regardless of which player initiated them
          if (state.gameState) {
            console.log(`Updating dead stones from server: ${deadStoneData.deadStones?.length || 0} stones (${deadStoneData.deadBlackStones || '?'} black, ${deadStoneData.deadWhiteStones || '?'} white)`);
            
            // Create updated game state with new dead stones list
            const updatedGameState = {
              ...state.gameState,
              deadStones: deadStoneData.deadStones,
              // Optionally update scoring information if available
              score: state.gameState.score && deadStoneData.deadBlackStones !== undefined && deadStoneData.deadWhiteStones !== undefined 
                ? {
                    ...state.gameState.score,
                    deadBlackStones: deadStoneData.deadBlackStones,
                    deadWhiteStones: deadStoneData.deadWhiteStones
                  }
                : state.gameState.score
            };
            
            // Update local state
            dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
            
            // Update in localStorage as backup
            try {
              safelySetItem(`gosei-game-${updatedGameState.id}`, JSON.stringify(updatedGameState));
            } catch (e) {
              console.warn('Failed to save updated dead stones to localStorage:', e);
            }
          }
        });
        
        // Handle scoring phase cancellation
        newSocket.on('scoringCanceled', (cancelData) => {
          console.log(`Scoring phase canceled for game ${cancelData.gameId}`);
          
          // Apply the cancellation regardless of which player initiated it
          if (state.gameState && state.gameState.id === cancelData.gameId) {
            // We don't need to handle this explicitly as the server will broadcast
            // an updated gameState after cancellation, which will be processed
            // by the gameState event handler
            console.log('Scoring phase has been canceled, returning to play mode');
          }
        });
        
        // Timer tick handler for polling
        let timerInterval: ReturnType<typeof setInterval> | null = null;
        
        // Set up timer interval when game state changes
        const startTimerPolling = (gameState: GameState | null) => {
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          
          if (gameState && gameState.status === 'playing' && gameState.timeControl && gameState.timeControl.timePerMove > 0) {
            console.log('Timer debug: Starting timer polling interval');
            timerInterval = setInterval(() => {
              if (newSocket && gameState.id) {
                console.log('Timer debug: Sending timerTick event to server');
                newSocket.emit('timerTick', { gameId: gameState.id });
              }
            }, 1000);
          }
        };
        
        // Call startTimerPolling whenever the game state changes
        if (state.gameState) {
          startTimerPolling(state.gameState);
        }
        
        // Clean up effect
        return () => {
          if (newSocket) {
            console.log('Cleaning up socket event listeners');
            newSocket.off('connect');
            newSocket.off('connect_error');
            newSocket.off('disconnect');
            newSocket.off('error');
            newSocket.off('gameCreated');
            newSocket.off('joinedGame');
            newSocket.off('gameState');
            newSocket.off('moveMade');
            newSocket.off('turnPassed');
            newSocket.off('playerJoined');
            newSocket.off('playerLeft');
            newSocket.off('playerDisconnected');
            newSocket.off('timeUpdate');
            newSocket.off('playerTimeout');
            newSocket.off('byoYomiStarted');
            newSocket.off('byoYomiPeriodUsed');
            newSocket.off('deadStoneToggled');
            newSocket.off('scoringCanceled');
            
            if (newSocket.connected) {
              console.log('Disconnecting socket on cleanup');
              newSocket.disconnect();
            }
            
            if (timerInterval) {
              clearInterval(timerInterval);
            }
          }
        };
      } catch (error) {
        console.error('Error setting up socket connection:', error);
        dispatch({
          type: 'GAME_ERROR',
          payload: 'Failed to connect to game server'
        });
      }
    }
  }, [state.socket, socketUrl]);

  // Listen for changes in game state from other clients
  useEffect(() => {
    if (state.socket) {
      console.log('Setting up game state listener');
      
      // Listen for game state updates from other clients
      state.socket.on('gameState', (updatedGameState: GameState) => {
        console.log('Received updated game state from server');
        
        // Only update if we already have a game with this ID
        if (state.gameState && state.gameState.id === updatedGameState.id) {
          console.log('Updating local game state');
          
          // Preserve the current player reference
          const currentPlayer = state.currentPlayer && updatedGameState.players.find(
            p => p.id === state.currentPlayer?.id
          );
          
          // If game is finished but dead stone counts are missing, add them
          if (updatedGameState.status === 'finished' && 
              updatedGameState.deadStones && 
              updatedGameState.deadStones.length > 0 && 
              updatedGameState.score && 
              (updatedGameState.score.deadBlackStones === undefined || 
               updatedGameState.score.deadWhiteStones === undefined)) {
            
            console.log('Fixing missing dead stone counts in finished game');
            
            // Convert dead stones to a Set for faster lookups
            const deadStonePositions = new Set<string>();
            updatedGameState.deadStones.forEach(pos => {
              deadStonePositions.add(`${pos.x},${pos.y}`);
            });
            
            // Count dead stones by color
            const deadBlackStones = updatedGameState.board.stones.filter(stone => 
              stone.color === 'black' && deadStonePositions.has(`${stone.position.x},${stone.position.y}`)
            ).length;
            
            const deadWhiteStones = updatedGameState.board.stones.filter(stone => 
              stone.color === 'white' && deadStonePositions.has(`${stone.position.x},${stone.position.y}`)
            ).length;
            
            console.log(`Added dead stone counts: ${deadBlackStones} black, ${deadWhiteStones} white`);
            
            // Update the score object with dead stone counts
            updatedGameState.score = {
              ...updatedGameState.score,
              deadBlackStones,
              deadWhiteStones
            };
          }
          
          dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
          
          // If there's a currentPlayer mismatch after update, fix it
          if (currentPlayer && state.currentPlayer?.id !== currentPlayer.id) {
            console.log('Fixing current player reference after game state update');
            // We'd need to add a new action type to fix just the currentPlayer
          }
        }
      });
      
      return () => {
        state.socket?.off('gameState');
      };
    }
  }, [state.socket, state.gameState, state.currentPlayer]);

  // Add timer effect to component
  useEffect(() => {
    if (state.socket && state.gameState?.status === 'playing' && 
        ((state.gameState.timeControl?.timePerMove ?? 0) > 0 || (state.gameState.timePerMove ?? 0) > 0)) {
      // Send timer ticks more frequently for better accuracy
      const timerInterval = setInterval(() => {
        if (state.gameState?.status === 'playing' && state.socket) {
          state.socket.emit('timerTick', {
            gameId: state.gameState.id
          });
        }
      }, 500); // Update twice per second for smoother countdown
      
      return () => clearInterval(timerInterval);
    }
  }, [state.socket, state.gameState]);

  // Update socket event handlers
  useEffect(() => {
    if (state.socket) {
      // Handle time updates
      state.socket.on('timeUpdate', (timeData: { playerId: string; color: StoneColor; timeRemaining: number; byoYomiPeriodsLeft?: number; byoYomiTimeLeft?: number; isInByoYomi?: boolean }) => {
        console.log(`Time update for player ${timeData.playerId} (${timeData.color}): ${timeData.timeRemaining}s remaining`);
        
        // Add more detailed logging for byo-yomi time updates
        if (timeData.isInByoYomi) {
          console.log(`Byo-yomi time update: ${timeData.byoYomiTimeLeft}s remaining in current period, ${timeData.byoYomiPeriodsLeft} periods left`);
        }
        
        // Update the player's time in the game state directly
        dispatch({ 
          type: 'UPDATE_PLAYER_TIME', 
          payload: {
            playerId: timeData.playerId,
            color: timeData.color,
            timeRemaining: timeData.timeRemaining,
            byoYomiPeriodsLeft: timeData.byoYomiPeriodsLeft,
            byoYomiTimeLeft: timeData.byoYomiTimeLeft,
            isInByoYomi: timeData.isInByoYomi
          }
        });
      });

      // Handle move updates
      state.socket.on('moveMade', (moveData) => {
        console.log(`Move made at (${moveData.position.x}, ${moveData.position.y}) by ${moveData.playerId}`);
        
        // Play stone sound when opponent makes a move
        if (state.currentPlayer && moveData.playerId !== state.currentPlayer.id) {
          playStoneSound();
        }
      });

      // Handle game state updates
      state.socket.on('gameState', (gameState) => {
        console.log('Received updated game state:', gameState.id);
        
        // Preserve the socket instance
        const updatedState = {
          ...gameState,
          socket: state.socket
        };
        
        dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedState });
        
        // Save game state to localStorage for persistence
        try {
          safelySetItem(`gosei-game-${gameState.id}`, JSON.stringify(gameState));
        } catch (e) {
          console.warn('Failed to save game state to localStorage:', e);
        }
      });

      // Handle timeout events
      state.socket.on('playerTimeout', (timeoutData) => {
        console.log(`Player ${timeoutData.playerId} has timed out`);
        // Game state update will be handled by the gameState event
      });

      // Clean up event listeners
      const socket = state.socket; // Store reference for cleanup
      return () => {
        socket.off('timeUpdate');
        socket.off('moveMade');
        socket.off('gameState');
        socket.off('playerTimeout');
      };
    }
  }, [state.socket]);

  // Helper to generate a short, readable game code
  const generateGameCode = (): string => {
    // Create a short, readable code (e.g., "BLUE-STONE-42")
    const adjectives = ['BLACK', 'WHITE', 'QUICK', 'WISE', 'SMART', 'GRAND', 'CALM', 'BOLD', 'BRAVE'];
    const nouns = ['STONE', 'BOARD', 'MOVE', 'PLAY', 'STAR', 'POINT', 'GAME', 'MATCH', 'PATH'];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 100);
    
    return `${randomAdjective}-${randomNoun}-${randomNumber}`;
  };
  
  // Helper functions for localStorage
  const safelyGetItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`Error retrieving item from localStorage with key ${key}:`, e);
      return null;
    }
  };
  
  const safelySetItem = (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`Error setting item in localStorage with key ${key}:`, e);
      return false;
    }
  };

  // Add a function to clean up old games from localStorage
  const cleanupOldGames = () => {
    try {
      const allKeys = Object.keys(localStorage);
      const gameKeys = allKeys.filter(key => key.startsWith('gosei-game-'));
      
      // Remove games older than 24 hours
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      gameKeys.forEach(key => {
        try {
          const gameData = JSON.parse(localStorage.getItem(key) || '');
          if (gameData.savedAt && new Date(gameData.savedAt).getTime() < twentyFourHoursAgo) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If the game data is invalid, remove it
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error cleaning up old games:', e);
    }
  };

  // Modify findGameByCode function signature to return Promise
  const findGameByCode = async (code: string): Promise<GameState | null> => {
    try {
      // Clean up old games first
      cleanupOldGames();
      
      // Check if we have a socket connection and the game exists on the server
      if (state.socket?.connected) {
        return new Promise<GameState | null>((resolve) => {
          // Request game state from server
          state.socket!.emit('getGameState', { gameId: code });
          
          // Wait for response
          const timeout = setTimeout(() => {
            resolve(findGameInLocalStorage(code));
          }, 3000);
          
          state.socket!.once('gameState', (serverGameState) => {
            clearTimeout(timeout);
            if (serverGameState) {
              // Update localStorage with server state
              try {
                safelySetItem(`gosei-game-${serverGameState.id}`, JSON.stringify({
                  ...serverGameState,
                  savedAt: new Date().toISOString()
                }));
              } catch (e) {
                console.warn('Failed to update localStorage with server state:', e);
              }
              resolve(serverGameState);
            } else {
              resolve(findGameInLocalStorage(code));
            }
          });
        });
      }
      
      return findGameInLocalStorage(code);
    } catch (e) {
      console.error('Error in findGameByCode:', e);
      return null;
    }
  };

  // Helper function to find game in localStorage
  const findGameInLocalStorage = (code: string): GameState | null => {
    // Try to find exact match first with the key pattern
    const gameData = safelyGetItem(`gosei-game-${code}`);
    if (gameData) {
      const game = JSON.parse(gameData);
      return game;
    }
    
    // Try direct ID match from all games in localStorage
    let allKeys: string[] = [];
    try {
      allKeys = Object.keys(localStorage);
    } catch (e) {
      console.error('Error accessing localStorage keys:', e);
      return null;
    }
    
    for (const key of allKeys) {
      if (key.startsWith('gosei-game-')) {
        try {
          const gameData = safelyGetItem(key);
          if (!gameData) continue;
          
          const game = JSON.parse(gameData);
          
          // Check if the game ID matches
          if (game.id === code) {
            return game;
          }
          
          // Check if the code matches case-insensitive
          if (typeof game.code === 'string' && 
              game.code.toLowerCase() === code.toLowerCase()) {
            return game;
          }
        } catch (e) {
          console.error('Error parsing game data:', e);
        }
      }
    }
    
    return null;
  };

  // Create a new game
  const createGame = (options: GameOptions & { playerName?: string }) => {
    dispatch({ type: 'CREATE_GAME_START' });
    
    const playerId = uuidv4(); // Generate a unique ID for this player
    
    // Set default options if not provided
    const { boardSize = 19, handicap = 0, scoringRule = 'japanese', timeControlOptions } = options;
    const {
      timeControl = 30,
      timePerMove = 0,
      byoYomiPeriods = 0,
      byoYomiTime = 30,
      fischerTime = 0
    } = timeControlOptions || {};
    const playerName = options.playerName || 'Player 1';
    const colorPreference = options.colorPreference || 'random';
    
    // Determine player color based on preference and handicap
    let playerColor: 'black' | 'white';
    
    if (colorPreference === 'white') {
      playerColor = 'white';
    } else if (colorPreference === 'black') {
      playerColor = 'black';
    } else {
      // Random assignment
      playerColor = Math.random() < 0.5 ? 'black' : 'white';
    }
    
    // Create the player object
    const player: Player = {
      id: playerId,
      username: playerName,
      color: playerColor,
      timeRemaining: timeControl > 0 ? timeControl * 60 : undefined // Initialize with full time control in seconds
    };
    
    // Get handicap stones if applicable
    const handicapStones = getHandicapStones(boardSize, handicap);
    
    // Determine starting color based on handicap
    const startingColor = getStartingColor(handicap);
    
    // Calculate adjusted komi based on handicap and rules
    const adjustedKomi = getAdjustedKomi(handicap, scoringRule);
    
    // Create the initial game state
    const gameId = uuidv4(); // Generate unique game ID
    const gameCode = generateGameCode();
    
    // Create new game state
    const gameState: GameState = {
      id: gameId,
      code: gameCode,
      board: {
        size: boardSize,
        stones: handicapStones
      },
      players: [player],
      currentTurn: handicap > 0 ? 'white' : 'black',
      history: [],
      capturedStones: {
        black: 0,
        white: 0
      },
      status: 'waiting',
      winner: null,
      scoringRule: scoringRule,
      timeControl: {
        timeControl,
        timePerMove,
        byoYomiPeriods,
        byoYomiTime,
        fischerTime
      },
      komi: adjustedKomi,
      gameType: handicap > 0 ? 'handicap' : 'even',
      handicap: handicap
    };
    
    // Send the game data to the server
    if (state.socket) {
      console.log('Sending createGame request to server with game state:', gameState.id);
      state.socket.emit('createGame', {
        gameState,
        playerId
      });
    } else {
      console.error('Socket not connected, cannot create game');
      dispatch({
        type: 'GAME_ERROR',
        payload: 'Not connected to game server. Please refresh and try again.'
      });
      return;
    }
    
    // Update the local state with the new game
    dispatch({
      type: 'CREATE_GAME_SUCCESS',
      payload: {
        gameState,
        player
      }
    });
    
    // Save game to localStorage for persistence
    try {
      safelySetItem(`gosei-game-${gameId}`, JSON.stringify(gameState));
      safelySetItem('gosei-current-game', gameId);
      safelySetItem('gosei-player-id', playerId);
    } catch (e) {
      console.warn('Failed to save game to localStorage:', e);
    }
  };
  
  // Join an existing game
  const joinGame = async (gameIdOrCode: string, username: string) => {
    if (!gameIdOrCode || !username) {
      dispatch({ type: 'GAME_ERROR', payload: 'Game ID/link and username are required.' });
      return;
    }
    
    dispatch({ type: 'JOIN_GAME_START' });
    
    try {
      console.log(`Trying to join game with input: ${gameIdOrCode}`);
      
      // Extract gameId from link if user pasted a URL
      let gameId = gameIdOrCode;
      if (gameIdOrCode.includes('/game/')) {
        const urlParts = gameIdOrCode.split('/game/');
        if (urlParts.length > 1) {
          gameId = urlParts[1].split('?')[0]; // Remove any query parameters
          console.log(`Extracted game ID from link: ${gameId}`);
        }
      }
      
      // Try to find the game by ID or code
      let foundGame = await findGameByCode(gameId);
      
      // If not found by code or ID, check if it's the current game's ID
      if (!foundGame && state.gameState?.id === gameId) {
        foundGame = state.gameState;
      }
      
      if (!foundGame) {
        console.log(`Game with ID/code ${gameId} not found`);
        dispatch({ type: 'GAME_ERROR', payload: 'Game not found. Check the link and try again.' });
        return;
      }
      
      console.log(`Found game: ${foundGame.code}, players: ${foundGame.players.length}, status: ${foundGame.status}`);
      
      // Check if game already has two players and is in progress
      if (foundGame.players.length >= 2) {
        // If the player is trying to rejoin (e.g., after refresh)
        const existingPlayer = foundGame.players.find(p => 
          p.username.toLowerCase() === username.toLowerCase());
        
        if (existingPlayer) {
          console.log(`Found existing player with username: ${username}`);
          // Allow rejoining - player is already part of this game
          
          // If we have a socket connection, join the socket room
          if (state.socket && state.socket.connected) {
            state.socket.emit('joinGame', {
              gameId: foundGame.id,
              playerId: existingPlayer.id,
              username: existingPlayer.username,
              isReconnect: true
            });
          }
          
          dispatch({
            type: 'JOIN_GAME_SUCCESS',
            payload: { 
              gameState: foundGame, 
              player: existingPlayer 
            },
          });
          return;
        }
        
        console.log(`Game already has ${foundGame.players.length} players and username doesn't match any existing player`);
        dispatch({ type: 'GAME_ERROR', payload: 'This game already has two players.' });
        return;
      }
      
      // Create a new player or reuse existing if they're rejoining
      let player: Player;
      let updatedPlayers = [...foundGame.players];
      
      // Check if player with this username already exists
      const existingPlayer = foundGame.players.find(p => 
        p.username.toLowerCase() === username.toLowerCase());
      
      if (existingPlayer) {
        // Returning player
        console.log(`Player ${username} is rejoining the game`);
        player = existingPlayer;
      } else {
        // New player joins
        console.log(`Creating new player with username: ${username}`);
        const playerId = uuidv4();
        
        // Determine color based on existing players
        let playerColor: StoneColor = 'white'; // Default for second player
        
        if (foundGame.players.length > 0) {
          const firstPlayerColor = foundGame.players[0].color;
          playerColor = firstPlayerColor === 'black' ? 'white' : 'black';
        }
        
        player = {
          id: playerId,
          username,
          color: playerColor,
          timeRemaining: foundGame.timeControl ? foundGame.timeControl.timeControl * 60 : undefined // Initialize with full time control in seconds
        };
        updatedPlayers.push(player);
      }
      
      // Update game status to playing if we now have 2 players
      const newStatus = updatedPlayers.length >= 2 ? 'playing' : 'waiting';
      
      const updatedGameState: GameState = {
        ...foundGame,
        players: updatedPlayers,
        status: newStatus,
        // Preserve white's turn for handicap games
        currentTurn: foundGame.gameType === 'handicap' ? 'white' : 'black'
      };
      
      // Update the game in localStorage
      try {
        const stored = safelySetItem(`gosei-game-${updatedGameState.id}`, JSON.stringify({
          ...updatedGameState,
          savedAt: new Date().toISOString()
        }));
        if (!stored) {
          throw new Error('Failed to save game state');
        }
        console.log(`Game ${updatedGameState.id} updated in localStorage`);
      } catch (e) {
        console.error('Error saving game to localStorage:', e);
        dispatch({ type: 'GAME_ERROR', payload: 'Failed to update the game. Please try again.' });
        return;
      }
      
      // If we have a socket connection, join the socket room
      if (state.socket && state.socket.connected) {
        console.log(`Emitting joinGame event for game ${updatedGameState.id}`);
        state.socket.emit('joinGame', {
          gameId: updatedGameState.id,
          playerId: player.id,
          username: player.username,
          isReconnect: !!existingPlayer
        });
        
        // If game status changed to playing, notify all players
        if (newStatus === 'playing') {
          state.socket.emit('gameStatusChanged', {
            gameId: updatedGameState.id,
            status: 'playing'
          });
        }
      } else {
        console.warn('Socket not connected, game state will only be synchronized locally');
      }
      
      dispatch({
        type: 'JOIN_GAME_SUCCESS',
        payload: { gameState: updatedGameState, player },
      });
    } catch (e) {
      console.error('Error joining game:', e);
      dispatch({ type: 'GAME_ERROR', payload: 'An error occurred while joining the game.' });
    }
  };
  
  // Place a stone on the board
  const placeStone = (position: Position) => {
    if (!state.gameState || !state.currentPlayer) {
      console.log("Cannot place stone: no game state or current player");
      dispatch({ type: 'MOVE_ERROR', payload: 'Game not started properly' });
      return;
    }
    
    const { gameState, currentPlayer } = state;
    
    // Debug logs for handicap games
    if (gameState.gameType === 'handicap') {
      console.log(`Handicap game - current turn: ${gameState.currentTurn}, player color: ${currentPlayer.color}`);
      console.log(`Handicap stones on board: ${gameState.board.stones.filter(s => s.color === 'black').length}`);
    }
    
    // Prevent playing if game status is not 'playing' (still waiting for opponent)
    if (gameState.status !== 'playing') {
      console.log("Cannot play - waiting for opponent to join");
      dispatch({ type: 'MOVE_ERROR', payload: 'Waiting for opponent to join' });
      return;
    }
    
    // Check if it's the player's turn
    if (currentPlayer.color !== gameState.currentTurn) {
      console.log(`Not your turn - current turn: ${gameState.currentTurn}, player color: ${currentPlayer.color}`);
      dispatch({ type: 'MOVE_ERROR', payload: `Not your turn - waiting for ${gameState.currentTurn} to play` });
      return;
    }
    
    // Apply Go rules to validate and process the move
    const result = applyGoRules(position, currentPlayer.color, gameState);
    
    if (!result.valid || !result.updatedGameState) {
      console.log(`Invalid move: ${result.error}`);
      dispatch({ type: 'MOVE_ERROR', payload: result.error || 'Invalid move' });
      return;
    }
    
    // Clear any previous move errors
    dispatch({ type: 'CLEAR_MOVE_ERROR' });
    
    const updatedGameState = result.updatedGameState;
    
    // Update local state immediately for responsive UI
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit move to server if socket is available
    if (state.socket && state.socket.connected) {
      const moveData = {
        gameId: gameState.id,
        position,
        color: currentPlayer.color,
        playerId: currentPlayer.id
      };
      
      console.log('Emitting move to server:', moveData);
      
      state.socket.emit('makeMove', moveData);
    } else {
      console.warn('Socket not connected, updating state locally only');
      
      // Try to reconnect
      if (state.socket) {
        console.log('Attempting to reconnect...');
        state.socket.connect();
      }
    }
    
    // Update the game in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.code}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after placing stone');
      }
    } catch (e) {
      console.error('Error saving game state after placing stone:', e);
    }
  };
  
  // Pass the current turn (allow player to skip their move)
  const passTurn = () => {
    if (!state.gameState || !state.currentPlayer) {
      console.log("Cannot pass turn: no game state or current player");
      dispatch({ type: 'MOVE_ERROR', payload: 'Game not started properly' });
      return;
    }
    
    const { gameState, currentPlayer } = state;
    
    // Prevent playing if game status is not 'playing' (still waiting for opponent)
    if (gameState.status !== 'playing') {
      console.log("Cannot pass - waiting for opponent to join");
      dispatch({ type: 'MOVE_ERROR', payload: 'Waiting for opponent to join' });
      return;
    }
    
    // Check if it's the player's turn
    if (currentPlayer.color !== gameState.currentTurn) {
      console.log("Not your turn");
      dispatch({ type: 'MOVE_ERROR', payload: `Not your turn - waiting for ${gameState.currentTurn} to play` });
      return;
    }
    
    // Clear any previous move errors
    dispatch({ type: 'CLEAR_MOVE_ERROR' });
    
    // Create the pass move
    const passMove = createPassMove();
    
    // Update the game state for the pass move
    const updatedGameState: GameState = {
      ...gameState,
      currentTurn: gameState.currentTurn === 'black' ? 'white' : 'black',
      history: [...gameState.history, passMove],
    };
    
    // Check for two consecutive passes to transition to scoring phase
    const historyLength = updatedGameState.history.length;
    if (historyLength >= 2) {
      const lastMove = updatedGameState.history[historyLength - 1];
      const secondLastMove = updatedGameState.history[historyLength - 2];
      
      if (isPassMove(lastMove) && isPassMove(secondLastMove)) {
        // Transition to scoring phase after two consecutive passes
        console.log("Two consecutive passes detected - transitioning to scoring phase");
        updatedGameState.status = 'scoring';
        updatedGameState.deadStones = []; // Initialize empty dead stones array
        
        // Calculate initial territory for visual feedback
        // This is just for UI feedback and will be recalculated when scoring is confirmed
        const deadStonePositions = new Set<string>();
        const scoringRule = updatedGameState.scoringRule || 'japanese';
        const komi = updatedGameState.komi || (scoringRule === 'chinese' ? 7.5 : 6.5);
        
        try {
          // Get territories and preliminary score for visual feedback
          let scoringUtils;
          if (scoringRule === 'chinese') {
            scoringUtils = calculateChineseScore(updatedGameState.board, deadStonePositions, updatedGameState.capturedStones, komi);
          } else if (scoringRule === 'korean') {
            scoringUtils = calculateKoreanScore(updatedGameState.board, deadStonePositions, updatedGameState.capturedStones, komi);
          } else if (scoringRule === 'aga') {
            scoringUtils = calculateAGAScore(updatedGameState.board, deadStonePositions, updatedGameState.capturedStones, komi);
          } else if (scoringRule === 'ing') {
            scoringUtils = calculateIngScore(updatedGameState.board, deadStonePositions, updatedGameState.capturedStones, komi);
          } else {
            scoringUtils = calculateJapaneseScore(updatedGameState.board, deadStonePositions, updatedGameState.capturedStones, komi);
          }
          
          updatedGameState.territory = scoringUtils.territories;
          // Set preliminary score for display
          updatedGameState.score = { 
            ...scoringUtils.score,
            blackCaptures: updatedGameState.capturedStones.black,
            whiteCaptures: updatedGameState.capturedStones.white
          };
        } catch (e) {
          console.error('Error calculating initial territories:', e);
        }
      }
    }
    
    // Update local state immediately for responsive UI
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit move to server if socket is available
    if (state.socket && state.socket.connected) {
      const passData = {
        gameId: gameState.id,
        pass: true,
        color: currentPlayer.color,
        playerId: currentPlayer.id,
        endGame: updatedGameState.status === 'scoring' // Signal if this pass triggered end game
      };
      
      console.log('Emitting pass to server:', passData);
      state.socket.emit('passTurn', passData);
    } else {
      console.warn('Socket not connected, updating state locally only');
      
      // Try to reconnect
      if (state.socket) {
        console.log('Attempting to reconnect...');
        state.socket.connect();
      }
    }
    
    // Update the game in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.code}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after passing turn');
      }
    } catch (e) {
      console.error('Error saving game state after passing turn:', e);
    }
  };
  
  // Leave the current game
  const leaveGame = () => {
    // Notify server if socket is connected
    if (state.socket && state.socket.connected && state.gameState && state.currentPlayer) {
      console.log(`Emitting leaveGame event for game ${state.gameState.id}`);
      
      // Find the opponent player
      const opponent = state.gameState.players.find(p => p.id !== state.currentPlayer?.id);
      
      // Emit leave game event with additional info
      state.socket.emit('leaveGame', {
        gameId: state.gameState.id,
        playerId: state.currentPlayer.id,
        username: state.currentPlayer.username,
        opponentId: opponent?.id
      });

      // Update game state to reflect player leaving
      const updatedGameState: GameState = {
        ...state.gameState,
        status: 'finished' as const,
        players: state.gameState.players.filter(p => p.id !== state.currentPlayer?.id)
      };

      // Update local state before leaving
      dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    }
    
    // Clean up local state
    dispatch({ type: 'LEAVE_GAME' });
  };
  
  // Reset the game state
  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };
  
  // Function to manually sync game state with server
  const syncGameState = () => {
    if (!state.gameState || !state.currentPlayer || !state.socket) {
      console.log('Cannot sync game state: missing required data');
      return;
    }
    
    console.log('Manually triggering game state sync');
    state.socket.emit('requestSync', {
      gameId: state.gameState.id,
      playerId: state.currentPlayer.id
    });
    
    // If in scoring mode, also sync dead stones
    if (state.gameState.status === 'scoring' && state.gameState.deadStones) {
      console.log(`Syncing ${state.gameState.deadStones.length} dead stones to server`);
      syncDeadStones();
    }
  };

  // Function to sync dead stones with server
  const syncDeadStones = () => {
    if (!state.gameState || !state.currentPlayer || !state.socket || state.gameState.status !== 'scoring') {
      console.log('Cannot sync dead stones: not in scoring mode or missing data');
      return;
    }
    
    const gameState = state.gameState;
    const deadStones = gameState.deadStones || [];
    
    // Count dead stones by color for better sync
    const deadBlackStones = gameState.board.stones.filter(stone => 
      stone.color === 'black' && 
      deadStones.some(dead => dead.x === stone.position.x && dead.y === stone.position.y)
    ).length;
    
    const deadWhiteStones = gameState.board.stones.filter(stone => 
      stone.color === 'white' && 
      deadStones.some(dead => dead.x === stone.position.x && dead.y === stone.position.y)
    ).length;
    
    console.log(`Manually syncing ${deadStones.length} dead stones (${deadBlackStones} black, ${deadWhiteStones} white) with server`);
    
    state.socket.emit('syncDeadStones', {
      gameId: gameState.id,
      playerId: state.currentPlayer.id,
      deadStones: deadStones,
      deadBlackStones,
      deadWhiteStones
    });
  };

  // Clear move error
  const clearMoveError = () => {
    dispatch({ type: 'CLEAR_MOVE_ERROR' });
  };
  
  // Resign from the game (forfeit)
  const resignGame = () => {
    if (!state.gameState || !state.currentPlayer) {
      console.log("Cannot resign: no game state or current player");
      dispatch({ type: 'MOVE_ERROR', payload: 'Game not started properly' });
      return;
    }
    
    const { gameState, currentPlayer } = state;
    
    // Prevent resigning if game status is not 'playing'
    if (gameState.status !== 'playing') {
      console.log("Cannot resign - game not in progress");
      dispatch({ type: 'MOVE_ERROR', payload: 'Game not in progress' });
      return;
    }
    
    // Clear any previous move errors
    dispatch({ type: 'CLEAR_MOVE_ERROR' });
    
    // Update the game state for resignation
    const updatedGameState: GameState = {
      ...gameState,
      status: 'finished',
      winner: currentPlayer.color === 'black' ? 'white' : 'black',
      result: currentPlayer.color === 'black' ? 'W+R' : 'B+R'
    };
    
    // Update local state immediately for responsive UI
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit resignation to server if socket is available
    if (state.socket && state.socket.connected) {
      const resignData = {
        gameId: gameState.id,
        playerId: currentPlayer.id,
        color: currentPlayer.color
      };
      
      console.log('Emitting resign to server:', resignData);
      state.socket.emit('resignGame', resignData);
    } else {
      console.warn('Socket not connected, updating state locally only');
      
      // Try to reconnect
      if (state.socket) {
        console.log('Attempting to reconnect...');
        state.socket.connect();
      }
    }
    
    // Update the game in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.code}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after resignation');
      }
    } catch (e) {
      console.error('Error saving game state after resignation:', e);
    }
  };

  // Function to toggle a stone as dead during scoring
  const toggleDeadStone = (position: Position) => {
    if (!state.gameState) {
      console.log("Cannot toggle dead stone: no game state");
      return;
    }
    
    const { gameState } = state;
    
    // Only allow toggling in scoring mode
    if (gameState.status !== 'scoring') {
      console.log("Cannot toggle dead stone: not in scoring mode");
      return;
    }
    
    // Get the board stones
    const { stones } = gameState.board;
    
    // Find the stone at this position
    const stone = findStoneAt(position, stones);
    if (!stone) {
      console.log("No stone at position", position);
      return;
    }
    
    // Get all stones in the connected group
    const connectedGroup = getDeadStoneGroup(position, stones, gameState.board.size);
    
    // If this is an auto-detection request, scan for other likely dead groups
    // of the same color that are connected or nearby
    const autoDetectDeadGroups = connectedGroup.length >= 3; // Only auto-detect for larger groups
    
    let allDeadPositions = [...connectedGroup];
    
    if (autoDetectDeadGroups) {
      // The color of the original group
      const groupColor = stone.color;
      
      // Find potential dead groups using cached results when possible
      const potentialDeadGroups = stones
        .filter(s => s.color === groupColor)
        .filter(s => !connectedGroup.some(p => p.x === s.position.x && p.y === s.position.y))
        .map(s => s.position)
        .filter(p => {
          // Use a more efficient check for likely dead groups
          const group = getConnectedGroup(p, stones, gameState.board.size);
          return group.length <= 5 && isGroupLikelyDead(group, stones, gameState.board.size);
        })
        .map(p => getConnectedGroup(p, stones, gameState.board.size))
        .flat();
      
      // Add the newly found potential dead groups
      allDeadPositions = [...allDeadPositions, ...potentialDeadGroups];
      
      // Log detection information
      if (potentialDeadGroups.length > 0) {
        console.log(`Auto-detected ${potentialDeadGroups.length} additional dead stones in likely dead groups`);
      }
    }
    
    // Use Set for more efficient comparison
    const currentDeadStones = gameState.deadStones || [];
    const currentDeadStoneSet = new Set(currentDeadStones.map(pos => `${pos.x},${pos.y}`));
    
    // Calculate how many stones in the group are already marked
    const alreadyMarkedCount = connectedGroup.filter(pos => 
      currentDeadStoneSet.has(`${pos.x},${pos.y}`)
    ).length;
    
    let updatedDeadStones: Position[];
    
    // If more than half the group is already marked as dead, remove all of them
    // Otherwise, add all positions in the group as dead
    if (alreadyMarkedCount > connectedGroup.length / 2) {
      // Remove all stones in the group from dead stones
      updatedDeadStones = currentDeadStones.filter(deadStone => 
        !allDeadPositions.some(groupStone => groupStone.x === deadStone.x && groupStone.y === deadStone.y)
      );
    } else {
      // Add all stones in the group to dead stones (avoiding duplicates with Set operations)
      const allPositionSet = new Set(allDeadPositions.map(pos => `${pos.x},${pos.y}`));
      const newDeadStones = allDeadPositions.filter(groupStone => 
        !currentDeadStoneSet.has(`${groupStone.x},${groupStone.y}`)
      );
      
      updatedDeadStones = [...currentDeadStones, ...newDeadStones];
    }
    
    // Memoize the dead stone counts for better performance
    const deadBlackStones = stones.filter(stone => 
      stone.color === 'black' && 
      updatedDeadStones.some(dead => dead.x === stone.position.x && dead.y === stone.position.y)
    ).length;
    
    const deadWhiteStones = stones.filter(stone => 
      stone.color === 'white' && 
      updatedDeadStones.some(dead => dead.x === stone.position.x && dead.y === stone.position.y)
    ).length;
    
    const updatedGameState: GameState = {
      ...gameState,
      deadStones: updatedDeadStones
    };
    
    // Update local state immediately
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit changes to the server if socket is available and connected
    if (state.socket && state.socket.connected && state.currentPlayer) {
      console.log(`Emitting toggleDeadStone to server with ${updatedDeadStones.length} dead stones (${deadBlackStones} black, ${deadWhiteStones} white)`);
      state.socket.emit('toggleDeadStone', {
        gameId: gameState.id,
        position,
        playerId: state.currentPlayer.id,
        deadStones: updatedDeadStones,
        deadBlackStones,
        deadWhiteStones
      });
    } else {
      console.warn('Socket not connected, updating dead stone state locally only');
    }
    
    // Update in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.id}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after toggling dead stone');
      }
    } catch (e) {
      console.error('Error saving game state after toggling dead stone:', e);
    }
  };
  
  // Calculate the final score and end the game
  const confirmScore = () => {
    if (!state.gameState) {
      console.log("Cannot confirm score: no game state");
      return;
    }
    
    const { gameState } = state;
    
    // Only allow scoring confirmation in scoring mode
    if (gameState.status !== 'scoring') {
      console.log("Cannot confirm score: not in scoring mode");
      return;
    }
    
    // Convert dead stones to a Set for faster lookups
    const deadStonePositions = new Set<string>();
    const deadStones = gameState.deadStones || [];
    
    // Ensure dead stones are properly included in the set
    deadStones.forEach(pos => {
      deadStonePositions.add(`${pos.x},${pos.y}`);
    });
    
    // Count dead stones by color first for later use
    const deadBlackStones = gameState.board.stones.filter(stone => 
      stone.color === 'black' && deadStonePositions.has(`${stone.position.x},${stone.position.y}`)
    ).length;
    
    const deadWhiteStones = gameState.board.stones.filter(stone => 
      stone.color === 'white' && deadStonePositions.has(`${stone.position.x},${stone.position.y}`)
    ).length;
    
    console.log(`Scoring with dead stones: ${deadStones.length} (${deadBlackStones} black, ${deadWhiteStones} white)`);
    console.log(`Dead stone positions set has ${deadStonePositions.size} entries`);
    
    // Update captured stones count to include dead stones of opposite color
    const updatedCapturedStones = {
      black: (gameState.capturedStones.black || 0) + deadWhiteStones,
      white: (gameState.capturedStones.white || 0) + deadBlackStones
    };
    
    // Calculate score based on selected scoring rule
    const scoringRule = gameState.scoringRule || 'japanese'; // Default to Japanese rules if not specified
    const komi = gameState.komi || (scoringRule === 'chinese' ? 7.5 : 6.5); // Default komi based on rule set
    
    let scoringResult;
    
    if (scoringRule === 'chinese') {
      // Use Chinese scoring rules
      scoringResult = calculateChineseScore(
        gameState.board,
        deadStonePositions,
        updatedCapturedStones,
        komi
      );
    } else if (scoringRule === 'korean') {
      // Use Korean scoring rules
      scoringResult = calculateKoreanScore(
        gameState.board,
        deadStonePositions,
        updatedCapturedStones,
        komi
      );
    } else if (scoringRule === 'aga') {
      // Use AGA scoring rules
      scoringResult = calculateAGAScore(
        gameState.board,
        deadStonePositions,
        updatedCapturedStones,
        komi
      );
    } else if (scoringRule === 'ing') {
      // Use Ing scoring rules
      scoringResult = calculateIngScore(
        gameState.board,
        deadStonePositions,
        updatedCapturedStones,
        komi
      );
    } else {
      // Use Japanese scoring rules
      scoringResult = calculateJapaneseScore(
        gameState.board,
        deadStonePositions,
        updatedCapturedStones,
        komi
      );
    }
    
    // Update game state with score, territory, and winner
    const updatedGameState: GameState = {
      ...gameState,
      status: 'finished',
      score: {
        ...scoringResult.score,
        // Add dead stone counts to established properties in the score object
        blackCaptures: updatedCapturedStones.black,
        whiteCaptures: updatedCapturedStones.white,
        deadBlackStones: deadBlackStones,
        deadWhiteStones: deadWhiteStones
      },
      territory: scoringResult.territories,
      winner: scoringResult.winner,
      capturedStones: updatedCapturedStones,  // Update captured stones to include dead stones
      deadStones: deadStones  // Ensure dead stones are preserved in the final game state
    };
    
    // Update local state immediately for responsive UI
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit game end to server if socket is available
    if (state.socket && state.socket.connected) {
      const scoreData = {
        gameId: gameState.id,
        score: updatedGameState.score,
        winner: scoringResult.winner,
        territory: scoringResult.territories,
        capturedStones: updatedCapturedStones,
        deadStones: deadStones,
        deadBlackStones: deadBlackStones,
        deadWhiteStones: deadWhiteStones
      };
      
      console.log(`Emitting game end to server with ${deadStones.length} dead stones (${deadBlackStones} black, ${deadWhiteStones} white)`);
      state.socket.emit('gameEnded', scoreData);
    } else {
      console.warn('Socket not connected, updating state locally only');
      
      // Try to reconnect
      if (state.socket) {
        console.log('Attempting to reconnect...');
        state.socket.connect();
      }
    }
    
    // Update in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.id}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after scoring');
      }
    } catch (e) {
      console.error('Error saving game state after scoring:', e);
    }
  };

  // Request undo
  const requestUndo = () => {
    if (!state.gameState || !state.currentPlayer) {
      console.log("Cannot request undo: no game state or current player");
      dispatch({ type: 'MOVE_ERROR', payload: 'Game not started properly' });
      return;
    }
    
    const { gameState, currentPlayer } = state;
    
    // Prevent undo requests if game is not in playing state
    if (gameState.status !== 'playing') {
      console.log("Cannot request undo - game not in progress");
      dispatch({ type: 'MOVE_ERROR', payload: 'Cannot undo when game is not in progress' });
      return;
    }
    
    // Check if there are moves to undo
    if (gameState.history.length === 0) {
      console.log("No moves to undo");
      dispatch({ type: 'MOVE_ERROR', payload: 'No moves to undo' });
      return;
    }
    
    // Clear any previous move errors
    dispatch({ type: 'CLEAR_MOVE_ERROR' });
    
    // Create undo request - typically we'd undo the last two moves (one from each player)
    // But if there's only one move, we'll undo just that one
    const moveIndex = Math.max(0, gameState.history.length - 2);
    
    // Update the game state with the undo request
    const updatedGameState: GameState = {
      ...gameState,
      undoRequest: {
        requestedBy: currentPlayer.id,
        moveIndex
      }
    };
    
    // Update local state immediately
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit undo request to server if socket is available
    if (state.socket && state.socket.connected) {
      const undoData = {
        gameId: gameState.id,
        playerId: currentPlayer.id,
        moveIndex
      };
      
      console.log('Emitting undo request to server:', undoData);
      state.socket.emit('requestUndo', undoData);
    }
    
    // Update in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.code}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after undo request');
      }
    } catch (e) {
      console.error('Error saving game state after undo request:', e);
    }
  };

  // Respond to undo request
  const respondToUndoRequest = (accept: boolean) => {
    if (!state.gameState || !state.currentPlayer) {
      console.log("Cannot respond to undo: no game state or current player");
      dispatch({ type: 'MOVE_ERROR', payload: 'Game not started properly' });
      return;
    }
    
    const { gameState, currentPlayer } = state;
    
    // Check if there's an undo request to respond to
    if (!gameState.undoRequest) {
      console.log("No undo request to respond to");
      dispatch({ type: 'MOVE_ERROR', payload: 'No undo request to respond to' });
      return;
    }
    
    // Check if the current player is the one who should respond
    // (not the one who made the request)
    if (gameState.undoRequest.requestedBy === currentPlayer.id) {
      console.log("You cannot respond to your own undo request");
      dispatch({ type: 'MOVE_ERROR', payload: 'You cannot respond to your own undo request' });
      return;
    }
    
    // Clear any previous move errors
    dispatch({ type: 'CLEAR_MOVE_ERROR' });
    
    if (accept) {
      // If accepted, revert to the requested move index
      const moveIndex = gameState.undoRequest.moveIndex;
      const historyToKeep = gameState.history.slice(0, moveIndex);
      
      // Get the stones on the board at that point in history
      // We need to recreate the board state
      const boardSize = gameState.board.size;
      let stones: Stone[] = [];
      
      // Add handicap stones first if any
      if (historyToKeep.length === 0) {
        // No moves yet, check if there were handicap stones
        if (gameState.currentTurn === 'white' && gameState.board.stones.some(s => s.color === 'black')) {
          // If white goes first, there must have been handicap stones
          stones = gameState.board.stones.filter(s => s.color === 'black');
        }
      } else {
        // Replay history to create the board state
        let currentTurn: StoneColor = 'black'; // Black goes first by default
        
        historyToKeep.forEach(move => {
          if (!isPassMove(move)) {
            // Add a stone for this move
            stones.push({
              position: move,
              color: currentTurn
            });
            
            // Check for captures
            // This is a simplified version - in practice you'd need to fully reapply rules
            // to account for captures at each step
            
            // Toggle turn
            currentTurn = currentTurn === 'black' ? 'white' : 'black';
          } else {
            // Just toggle turn for passes
            currentTurn = currentTurn === 'black' ? 'white' : 'black';
          }
        });
      }
      
      // Calculate the current turn after undo
      const nextTurn = historyToKeep.length === 0 ? 
        (gameState.board.stones.some(s => s.color === 'black') ? 'white' : 'black') : // Handicap logic
        (historyToKeep.length % 2 === 0 ? 'black' : 'white');
      
      // Create the updated game state
      const updatedGameState: GameState = {
        ...gameState,
        board: {
          ...gameState.board,
          stones
        },
        currentTurn: nextTurn,
        history: historyToKeep,
        undoRequest: undefined // Clear the undo request
      };
      
      // Update local state
      dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
      
      // Emit response to server if socket is available
      if (state.socket && state.socket.connected) {
        const undoResponseData = {
          gameId: gameState.id,
          playerId: currentPlayer.id,
          accepted: true,
          moveIndex
        };
        
        console.log('Emitting undo response to server:', undoResponseData);
        state.socket.emit('respondToUndoRequest', undoResponseData);
      }
    } else {
      // If rejected, just clear the undo request
      const updatedGameState: GameState = {
        ...gameState,
        undoRequest: undefined
      };
      
      // Update local state
      dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
      
      // Emit response to server if socket is available
      if (state.socket && state.socket.connected) {
        const undoResponseData = {
          gameId: gameState.id,
          playerId: currentPlayer.id,
          accepted: false
        };
        
        console.log('Emitting undo response to server:', undoResponseData);
        state.socket.emit('respondToUndoRequest', undoResponseData);
      }
    }
    
    // Update in localStorage
    try {
      const stored = safelySetItem(`gosei-game-${gameState.code}`, JSON.stringify(gameState));
      if (!stored) {
        console.error('Failed to save game state after undo response');
      }
    } catch (e) {
      console.error('Error saving game state after undo response:', e);
    }
  };

  // Cancel scoring phase and return to playing
  const cancelScoring = () => {
    if (!state.gameState) {
      console.log("Cannot cancel scoring: no game state");
      return;
    }
    
    const { gameState } = state;
    
    // Only allow cancellation in scoring mode
    if (gameState.status !== 'scoring') {
      console.log("Cannot cancel scoring: not in scoring mode");
      return;
    }
    
    // Return to playing state
    const updatedGameState: GameState = {
      ...gameState,
      status: 'playing',
      deadStones: [], // Clear dead stones
      territory: undefined // Clear territory visualization
    };
    
    // Update local state immediately for responsive UI
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
    
    // Emit cancel scoring to server if socket is available
    if (state.socket && state.socket.connected) {
      const cancelData = {
        gameId: gameState.id
      };
      
      console.log('Emitting cancelScoring to server:', cancelData);
      state.socket.emit('cancelScoring', cancelData);
    } else {
      console.warn('Socket not connected, updating state locally only');
      
      // Try to reconnect
      if (state.socket) {
        console.log('Attempting to reconnect...');
        state.socket.connect();
      }
    }
    
    // Update in localStorage as backup
    try {
      const stored = safelySetItem(`gosei-game-${updatedGameState.id}`, JSON.stringify(updatedGameState));
      if (!stored) {
        console.error('Failed to save game state after canceling scoring');
      }
    } catch (e) {
      console.error('Error saving game state after canceling scoring:', e);
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState: state.gameState,
        loading: state.loading,
        error: state.error,
        moveError: state.moveError,
        currentPlayer: state.currentPlayer,
        createGame,
        joinGame,
        placeStone,
        passTurn,
        leaveGame,
        resetGame,
        syncGameState,
        syncDeadStones,
        clearMoveError,
        resignGame,
        toggleDeadStone,
        confirmScore,
        requestUndo,
        respondToUndoRequest,
        cancelScoring
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

// Custom hook for using the game context
export const useGame = () => useContext(GameContext);

// Only export default once
export default GameContext; 