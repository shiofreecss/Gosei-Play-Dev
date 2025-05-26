import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { GameOptions, ColorPreference, ScoringRule, GameType } from '../types/go';
import ConnectionStatus from '../components/ConnectionStatus';
import BoardSizePreview from '../components/go-board/BoardSizePreview';
import GoseiLogo from '../components/GoseiLogo';

// Define keys for localStorage
const STORAGE_KEYS = {
  USERNAME: 'gosei-player-name',
  BOARD_SIZE: 'gosei-board-size',
  COLOR_PREFERENCE: 'gosei-color-preference',
  TIME_CONTROL: 'gosei-time-control',
  TIME_PER_MOVE: 'gosei-time-per-move',
  HANDICAP: 'gosei-handicap',
  SCORING_RULE: 'gosei-scoring-rule',
  GAME_TYPE: 'gosei-game-type'
};

interface SavedGame {
  id: string;
  savedAt: number;
}

// Component to display and load saved offline games
interface SavedGamesListProps {
  username: string;
  navigate: any;
}

const SavedGamesList: React.FC<SavedGamesListProps> = ({ username, navigate }) => {
  const [savedGames, setSavedGames] = useState<Array<{
    id: string,
    savedAt: string,
    status: string,
    opponent: string
  }>>([]);

  useEffect(() => {
    // Load saved games from localStorage
    try {
      const offlineGames: any[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('gosei-offline-game-')) {
          try {
            const savedData = JSON.parse(localStorage.getItem(key) || '');
            if (savedData && savedData.gameState) {
              const { gameState, savedAt } = savedData;
              
              // Only show games for the current user
              const userInGame = gameState.players.some(
                (p: { username: string }) => p.username === username
              );
              
              if (userInGame) {
                // Find opponent name
                const opponent = gameState.players.find(
                  (p: { username: string }) => p.username !== username
                )?.username || 'Unknown';
                
                offlineGames.push({
                  id: gameState.id,
                  savedAt,
                  status: gameState.status,
                  opponent
                });
              }
            }
          } catch (err) {
            console.error('Error parsing saved game:', err);
          }
        }
      }
      
      // Sort by most recently saved
      offlineGames.sort((a, b) => 
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      
      setSavedGames(offlineGames);
    } catch (err) {
      console.error('Error loading saved games:', err);
    }
  }, [username]);

  if (savedGames.length === 0) {
    return (
      <div className="bg-neutral-50 rounded-lg p-4 text-center">
        <p className="text-neutral-500">No saved games found</p>
        <p className="text-sm text-neutral-400 mt-1">
          Enable Auto-Save during gameplay to access games offline
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 rounded-lg p-3">
      <div className="space-y-2">
        {savedGames.map(game => (
          <div 
            key={game.id} 
            className="bg-white rounded p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-neutral-100"
            onClick={() => navigate(`/game/${game.id}`)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Game with {game.opponent}</div>
                <div className="text-xs text-neutral-500">
                  Status: <span className="font-medium capitalize">{game.status}</span>
                </div>
              </div>
              <div className="text-xs text-neutral-400">
                {new Date(game.savedAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to safely get items from localStorage
const getStoredValue = (key: string, defaultValue: any): any => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) {
      return defaultValue;
    }
    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Helper function to safely set items in localStorage
const setStoredValue = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper function to get recommended time based on board size (changed from getMinimumTimeForBoardSize)
const getRecommendedTimeForBoardSize = (size: number): number => {
  switch (size) {
    case 9: return 10;
    case 13: return 20;
    case 15: return 30;
    case 19: return 45;
    case 21: return 60;
    default: return 30;
  };
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { createGame, joinGame, gameState, error } = useGame();
  const [username, setUsername] = useState('');
  const [gameId, setGameId] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [showCustomSizes, setShowCustomSizes] = useState(false);
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    boardSize: getStoredValue(STORAGE_KEYS.BOARD_SIZE, 19),
    handicap: getStoredValue(STORAGE_KEYS.HANDICAP, 0),
    scoringRule: getStoredValue(STORAGE_KEYS.SCORING_RULE, 'japanese') as ScoringRule,
    gameType: getStoredValue(STORAGE_KEYS.GAME_TYPE, 'even') as GameType,
    colorPreference: getStoredValue(STORAGE_KEYS.COLOR_PREFERENCE, 'random') as ColorPreference,
    timeControl: getStoredValue(STORAGE_KEYS.TIME_CONTROL, 30),
    timePerMove: getStoredValue(STORAGE_KEYS.TIME_PER_MOVE, 0),
    timeControlOptions: {
      timeControl: getStoredValue(STORAGE_KEYS.TIME_CONTROL, 30),
      timePerMove: getStoredValue(STORAGE_KEYS.TIME_PER_MOVE, 0),
      byoYomiPeriods: getStoredValue((STORAGE_KEYS as any).BYO_YOMI_PERIODS, 0),
      byoYomiTime: getStoredValue((STORAGE_KEYS as any).BYO_YOMI_TIME, 30),
      fischerTime: getStoredValue((STORAGE_KEYS as any).FISCHER_TIME, 0)
    },
  });

  // Effect to navigate to game after creation or joining
  useEffect(() => {
    if (gameState?.id) {
      console.log('Game state updated with ID, navigating to:', gameState.id);
      navigate(`/game/${gameState.id}`);
    }
  }, [gameState, navigate]);

  // Load saved username if available
  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_KEYS.USERNAME);
    if (savedName) {
      setUsername(savedName);
    }
  }, []);

  // Save game options when they change
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.BOARD_SIZE, gameOptions.boardSize);
    setStoredValue(STORAGE_KEYS.COLOR_PREFERENCE, gameOptions.colorPreference);
    setStoredValue(STORAGE_KEYS.TIME_CONTROL, gameOptions.timeControl);
    setStoredValue(STORAGE_KEYS.TIME_PER_MOVE, gameOptions.timePerMove);
    setStoredValue(STORAGE_KEYS.HANDICAP, gameOptions.handicap);
    setStoredValue(STORAGE_KEYS.SCORING_RULE, gameOptions.scoringRule);
    setStoredValue(STORAGE_KEYS.GAME_TYPE, gameOptions.gameType);
    setStoredValue((STORAGE_KEYS as any).BYO_YOMI_PERIODS, gameOptions.timeControlOptions.byoYomiPeriods);
    setStoredValue((STORAGE_KEYS as any).BYO_YOMI_TIME, gameOptions.timeControlOptions.byoYomiTime);
    setStoredValue((STORAGE_KEYS as any).FISCHER_TIME, gameOptions.timeControlOptions.fischerTime);
  }, [gameOptions]);

  // Helper function to update a single game option and save it
  const updateGameOption = <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => {
    setGameOptions(prev => {
      // Create a new state object
      const newState = {
        ...prev,
        [key]: value
      };
      
      // If updating board size, automatically set the recommended time (only if current time is at the old recommended value)
      if (key === 'boardSize') {
        const newRecommendedTime = getRecommendedTimeForBoardSize(value as number);
        const oldRecommendedTime = getRecommendedTimeForBoardSize(prev.boardSize);
        // Only update time if it's currently at the old recommended value (user hasn't customized it)
        if (prev.timeControl === oldRecommendedTime) {
          newState.timeControl = newRecommendedTime;
        newState.timeControlOptions = {
          ...prev.timeControlOptions,
            timeControl: newRecommendedTime
        };
        }
      }
      
      // If updating game type, set default time control settings for specific game types
      if (key === 'gameType' && typeof value === 'string') {
        const gameType = value as GameType;
        if (gameType === 'even' || gameType === 'handicap' || gameType === 'teaching') {
          // Set defaults for Even Game, Handicap Game, and Teaching Game
          newState.timePerMove = 0;
          newState.timeControlOptions = {
            ...prev.timeControlOptions,
            timePerMove: 0,
            fischerTime: 0,
            byoYomiPeriods: 0
          };
        } else if (gameType === 'blitz') {
          // Set defaults for Blitz Game - disable byo-yomi
          newState.timeControlOptions = {
            ...prev.timeControlOptions,
            byoYomiPeriods: 0
          };
        }
      }
      
      // If updating timeControlOptions, sync the direct timeControl and timePerMove properties
      if (key === 'timeControlOptions' && typeof value === 'object') {
        if ('timeControl' in value) {
          newState.timeControl = value.timeControl;
        }
        if ('timePerMove' in value) {
          newState.timePerMove = value.timePerMove;
        }
      }
      
      // If updating direct timeControl or timePerMove, sync the timeControlOptions
      if (key === 'timeControl' && typeof value === 'number') {
        newState.timeControl = value;
        newState.timeControlOptions = {
          ...prev.timeControlOptions,
          timeControl: value
        };
      }
      
      if (key === 'timePerMove' && typeof value === 'number') {
        newState.timeControlOptions = {
          ...prev.timeControlOptions,
          timePerMove: value
        };
        
        // Auto-change game type based on Time per Move value
        if (value === 0) {
          // Set to Even Game and restore main time based on board size
          newState.gameType = 'even';
          const recommendedTime = getRecommendedTimeForBoardSize(prev.boardSize);
          newState.timeControl = recommendedTime;
          newState.timeControlOptions = {
            ...newState.timeControlOptions,
            timeControl: recommendedTime
          };
        } else if (value >= 5) {
          // Set to Blitz Game and set main time to 0
          newState.gameType = 'blitz';
          newState.timeControl = 0;
          newState.timeControlOptions = {
            ...newState.timeControlOptions,
            timeControl: 0
          };
        }
      }
      
      return newState;
    });
  };

  const handleCreateGame = () => {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    // Save username for future games
    localStorage.setItem(STORAGE_KEYS.USERNAME, username.trim());
    setShowGameSettings(true);
  };

  const handleStartGame = () => {
    // Clear any previous errors
    setLocalError(null);

    // Update the player's username before creating the game
    const options = {
      ...gameOptions,
      playerName: username,
    };
    
    console.log('Creating game with options:', options);
    
    try {
      // Create game through context
      createGame(options);
      
      // Set a timeout to check if navigation hasn't happened
      setTimeout(() => {
        if (!gameState?.id) {
          console.log('Navigation did not occur through context');
          setLocalError('Could not navigate to the game. Please try again or check your connection.');
        }
      }, 3000); // Wait 3 seconds before showing error
    } catch (err) {
      console.error('Error in game creation:', err);
      setLocalError('Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async () => {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }
    
    if (!gameId.trim()) {
      alert('Please enter a game ID or code');
      return;
    }

    // Clear any previous errors
    setLocalError(null);

    // Save username for future games
    localStorage.setItem(STORAGE_KEYS.USERNAME, username.trim());
    
    // Call the joinGame function from context and let the effect handle the navigation
    try {
      console.log(`Attempting to join game with ID/code: ${gameId.trim()}`);
      await joinGame(gameId.trim(), username.trim());
      
      // Set a timeout to check if navigation hasn't happened
      setTimeout(() => {
        if (!gameState?.id) {
          setLocalError('Could not join the game. Please check the game ID and try again.');
        }
      }, 3000);
    } catch (error) {
      console.error('Error joining game:', error);
      setLocalError('There was a problem joining the game. Please try again.');
    }
  };

  // Board size option component
  const BoardSizeOption = ({ size, description, isStandard = true }: { size: number, description: string, isStandard?: boolean }) => {
    return (
      <div 
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          gameOptions.boardSize === size 
            ? 'border-primary-500 bg-primary-50 shadow-md' 
            : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30'
        } ${isStandard ? '' : 'opacity-90 hover:opacity-100'}`}
        onClick={() => {
          // Update board size
          updateGameOption('boardSize', size);
          // Only update time control to recommended if it's currently at the old recommended value
          const currentRecommendedTime = getRecommendedTimeForBoardSize(gameOptions.boardSize);
          const newRecommendedTime = getRecommendedTimeForBoardSize(size);
          if (!gameOptions.timeControl || gameOptions.timeControl === currentRecommendedTime) {
            updateGameOption('timeControl', newRecommendedTime);
          }
        }}
        title={`${size}×${size} board - ${description}`}
      >
        <div className="flex items-center gap-4">
          <BoardSizePreview size={size} className="w-20 h-20 rounded-lg shadow-sm" />
          <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
              <div>
          <span className="font-bold text-lg">{size}×{size}</span>
                {!isStandard && <span className="ml-2 text-xs px-2 py-1 bg-neutral-100 rounded-full">Custom</span>}
              </div>
          {gameOptions.boardSize === size && (
            <span className="text-primary-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">{description}</p>
            <div className="mt-2 text-xs text-neutral-500">
              {size === 9 && "Quick games (~20-30 min)"}
              {size === 13 && "Medium length (~45-60 min)"}
              {size === 19 && "Full length (~90-120 min)"}
              {size === 15 && "Traditional Korean size (~60-90 min)"}
              {size === 21 && "Extended play (~120-150 min)"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Color preference option component
  const ColorOption = ({ color, description }: { color: ColorPreference, description: string }) => {
    return (
      <div 
        className={`flex-1 border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          gameOptions.colorPreference === color 
            ? 'border-primary-500 bg-primary-50 shadow-md' 
            : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30'
        }`}
        onClick={() => updateGameOption('colorPreference', color)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg capitalize">{color}</span>
          {gameOptions.colorPreference === color && (
            <span className="text-primary-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    );
  };

  // Ruleset option component
  const RulesetOption = ({ rule, name, description }: { rule: ScoringRule, name: string, description: string }) => {
    return (
      <div 
        className={`flex-1 border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          gameOptions.scoringRule === rule 
            ? 'border-primary-500 bg-primary-50 shadow-md' 
            : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30'
        }`}
        onClick={() => updateGameOption('scoringRule', rule)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg">{name}</span>
          {gameOptions.scoringRule === rule && (
            <span className="text-primary-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    );
  };

  // Game type option component
  const GameTypeOption = ({ type, title, description, selected, onClick }: { type: GameType, title: string, description: string, selected: boolean, onClick: () => void }) => {
    return (
      <div 
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          selected 
            ? 'border-primary-500 bg-primary-50 shadow-md' 
            : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg">{title}</span>
          {selected && (
            <span className="text-primary-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    );
  };

  // Game options panel component
  const GameOptionsPanel = () => {
    return (
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Game Settings</h2>
        
        {/* Board Size Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Board Size</h3>
            <button
              onClick={() => setShowCustomSizes(!showCustomSizes)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              {showCustomSizes ? 'Hide' : 'Show'} Custom Sizes
              <span className={`transform transition-transform duration-200 ${showCustomSizes ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
          </div>
          
          {/* Standard Board Sizes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <BoardSizeOption size={9} description="Perfect for beginners" />
            <BoardSizeOption size={13} description="Intermediate play" />
            <BoardSizeOption size={19} description="Standard tournament size" />
          </div>
          
          {/* Custom Board Sizes */}
          {showCustomSizes && (
            <div>
              <div className="border-l-2 border-primary-200 pl-4 py-2 mb-3">
                <p className="text-sm text-neutral-600">
                  Custom board sizes offer unique playing experiences. Choose these sizes if you want to try something different from the standard tournament sizes.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                <BoardSizeOption size={15} description="Traditional Korean size" isStandard={false} />
                <BoardSizeOption size={21} description="Extended board size" isStandard={false} />
              </div>
            </div>
          )}
        </div>

        {/* Game Rules */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Scoring Rules
              </label>
              <select
                value={gameOptions.scoringRule}
                onChange={(e) => updateGameOption('scoringRule', e.target.value as ScoringRule)}
                className="form-select w-full"
              >
                <option value="japanese">Japanese</option>
                <option value="chinese">Chinese</option>
                <option value="korean">Korean</option>
                <option value="aga">AGA</option>
                <option value="ing">Ing</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Game Type
              </label>
              <select
                value={gameOptions.gameType}
                onChange={(e) => updateGameOption('gameType', e.target.value as GameType)}
                className="form-select w-full"
              >
                <option value="even">Even Game</option>
                <option value="handicap">Handicap Game</option>
                <option value="teaching">Teaching Game</option>
                <option value="blitz">Blitz Game</option>
              </select>
            </div>
          </div>
        </div>

        {/* Handicap Settings - Only show if handicap game type is selected */}
        {gameOptions.gameType === 'handicap' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Handicap Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Number of Handicap Stones
                </label>
                <select
                  value={gameOptions.handicap}
                  onChange={(e) => updateGameOption('handicap', parseInt(e.target.value))}
                  className="form-select w-full"
                >
                  {[2,3,4,5,6,7,8,9].map(num => (
                    <option key={num} value={num}>{num} stones</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Color Preference
                </label>
                <select
                  value={gameOptions.colorPreference}
                  onChange={(e) => updateGameOption('colorPreference', e.target.value as ColorPreference)}
                  className="form-select w-full"
                >
                  <option value="random">Random</option>
                  <option value="black">Black</option>
                  <option value="white">White</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Time Control Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Time Control</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Main Time (minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={gameOptions.timeControl}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    if (newValue >= 0) {
                      updateGameOption('timeControl', newValue);
                    }
                  }}
                  min="0"
                  className="form-input w-full"
                />
                <div className="mt-1">
                  <p className="text-sm text-neutral-500">
                    Recommended {getRecommendedTimeForBoardSize(gameOptions.boardSize)} minutes for {gameOptions.boardSize}×{gameOptions.boardSize} board (you can set any time you want)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Byo-yomi Periods
                </label>
                <select
                  value={gameOptions.timeControlOptions?.byoYomiPeriods || 0}
                  onChange={(e) => {
                    const periods = parseInt(e.target.value);
                    const newOptions = {
                      ...gameOptions.timeControlOptions,
                      byoYomiPeriods: periods,
                      // Auto-set to 30 seconds when selecting any byo-yomi periods
                      byoYomiTime: periods > 0 ? 30 : (gameOptions.timeControlOptions?.byoYomiTime || 0)
                    };
                    updateGameOption('timeControlOptions', newOptions);
                  }}
                  disabled={gameOptions.gameType === 'blitz'}
                  className="form-select w-full"
                >
                  <option value="0">No byo-yomi</option>
                  <option value="3">3 periods</option>
                  <option value="5">5 periods (Standard)</option>
                  <option value="7">7 periods</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  {gameOptions.gameType === 'blitz' 
                    ? 'Not available in Blitz games (uses per-move timing)'
                    : 'Number of extra time periods after main time'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Byo-yomi Time (seconds)
                </label>
                <select
                  value={gameOptions.timeControlOptions?.byoYomiTime || 0}
                  onChange={(e) => {
                    const newOptions = {
                      ...gameOptions.timeControlOptions,
                      byoYomiTime: parseInt(e.target.value)
                    };
                    updateGameOption('timeControlOptions', newOptions);
                  }}
                  className="form-select w-full"
                  disabled={!gameOptions.timeControlOptions?.byoYomiPeriods || gameOptions.gameType === 'blitz'}
                >
                  <option value="0">Not used</option>
                  <option value="30">30 seconds (Standard)</option>
                  <option value="40">40 seconds</option>
                  <option value="60">60 seconds</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  {gameOptions.gameType === 'blitz' 
                    ? 'Not available in Blitz games'
                    : 'Time per byo-yomi period (auto-set to 30s when periods selected)'
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Fischer Increment (seconds)
                </label>
                <select
                  value={gameOptions.timeControlOptions?.fischerTime || 0}
                  onChange={(e) => {
                    const newOptions = {
                      ...gameOptions.timeControlOptions,
                      fischerTime: parseInt(e.target.value)
                    };
                    updateGameOption('timeControlOptions', newOptions);
                  }}
                  className="form-select w-full"
                >
                  <option value="0">No increment</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="15">15 seconds</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  Time added after each move
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Time per Move (seconds)
                </label>
                <input
                  type="number"
                  value={gameOptions.timePerMove}
                  onChange={(e) => updateGameOption('timePerMove', parseInt(e.target.value))}
                  min="0"
                  step="5"
                  className="form-input w-full"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  For Blitz mode: Set to 5+ seconds. Set to 0 for Even Game.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <h4 className="text-sm font-semibold text-neutral-800 mb-2">Time Control Info</h4>
              <ul className="text-xs text-neutral-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span><strong className="text-neutral-800">Main Time:</strong> Primary time allocation for the entire game</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span><strong className="text-neutral-800">Byo-yomi:</strong> Extra periods after main time expires (Japanese timing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span><strong className="text-neutral-800">Fischer:</strong> Time added after each move (Western timing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span><strong className="text-neutral-800">Time per Move:</strong> Maximum time allowed for each move</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GoseiLogo size={48} />
            <h1 className="text-4xl font-bold text-primary-700">Gosei Play</h1>
          </div>
          <p className="text-xl text-neutral-600">
            Play Go online with friends around the world
          </p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link to="/board-demo" className="text-primary-600 underline hover:text-primary-800 transition-colors">
              View Board Size Comparison
            </Link>
            <Link to="/rules" className="text-primary-600 underline hover:text-primary-800 transition-colors">
              Learn Go Rules
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          {!showGameSettings ? (
            // Initial screen with name input
            <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="lg:flex">
                {/* Left panel - Create Game */}
                <div className="lg:w-1/2 p-6 md:p-10 border-r border-neutral-200">
              <h2 className="text-3xl font-bold mb-8">Play Go</h2>
              
              {(error || localError) && (
                <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
                  <p>{error || localError}</p>
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="username" className="block text-lg font-medium text-neutral-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="username"
                  className="form-input text-lg py-3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

                  <div className="space-y-4">
                <button
                      onClick={handleCreateGame}
                      className="btn btn-primary w-full text-lg py-3"
                >
                  Create New Game
                </button>
                
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-neutral-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-neutral-500">or</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                    <input
                      type="text"
                        className="form-input flex-1"
                      value={gameId}
                      onChange={(e) => setGameId(e.target.value)}
                      placeholder="Enter game link or ID"
                    />
                    <button
                      onClick={handleJoinGame}
                        className="btn btn-secondary whitespace-nowrap"
                    >
                      Join Game
                    </button>
                    </div>
                  </div>
                </div>
                
                {/* Right panel - About Go */}
                <div className="lg:w-1/2 bg-neutral-50 p-6 md:p-10">
                  <h2 className="text-3xl font-bold mb-6">About Go</h2>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-lg mb-6">
                      Go is an ancient board game that originated in China more than 2,500 years ago. The game is played by two players who take turns placing black and white stones on the intersections of the grid.
                    </p>
                    <p className="text-lg mb-6">
                      The objective is to control more territory than your opponent by surrounding empty areas with your stones. Stones that are completely surrounded by the opponent's stones are captured and removed from the board.
                    </p>
                    <h3 className="text-xl font-semibold mb-4">Common board sizes:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <span className="w-16 font-medium">9×9</span>
                        <span className="text-neutral-600">Standard size for beginners</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-16 font-medium">13×13</span>
                        <span className="text-neutral-600">Medium size for intermediate players</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-16 font-medium">19×19</span>
                        <span className="text-neutral-600">Full size, used in tournaments worldwide</span>
                      </li>
                    </ul>
                    <h4 className="text-lg font-semibold mt-4 mb-2">Additional sizes:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <span className="w-16 font-medium">15×15</span>
                        <span className="text-neutral-600">Traditional Korean board size</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-16 font-medium">21×21</span>
                        <span className="text-neutral-600">Extended size for unique gameplay</span>
                      </li>
                    </ul>
                    <p className="mt-6 text-sm text-neutral-500">
                      Go is considered one of the most elegant and challenging board games ever devised.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Game settings screen
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold">Game Settings</h2>
                    <p className="text-neutral-600 mt-1">Welcome, {username}! Configure your game preferences.</p>
                  </div>
                  <button 
                    onClick={() => setShowGameSettings(false)}
                    className="btn btn-secondary"
                  >
                    Back
                  </button>
                      </div>

                {/* Game Options Panel */}
                <GameOptionsPanel />
                
                {/* Let's Play button */}
                <div className="mt-8 flex justify-end">
                    <button
                    onClick={handleStartGame}
                    className="btn btn-primary text-lg py-3 px-8"
                  >
                    Let's Play
                    </button>
                </div>
                </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add connection status component */}
      <ConnectionStatus />
    </div>
  );
};

export default HomePage; 