import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { GameOptions, ColorPreference, ScoringRule, GameType } from '../types/go';

import BoardSizePreview from '../components/go-board/BoardSizePreview';
import CreateGameForm from '../components/CreateGameForm';
import GoseiLogo from '../components/GoseiLogo';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { useAppTheme } from '../context/AppThemeContext';
import { validateBlitzSettings, updateBlitzTimeControls } from '../utils/gameType';
import { updateTimeControls } from '../utils/timeControl';

// Define keys for localStorage
const STORAGE_KEYS = {
  USERNAME: 'gosei-player-name',
  BOARD_SIZE: 'gosei-board-size',
  COLOR_PREFERENCE: 'gosei-color-preference',
  TIME_CONTROL: 'gosei-time-control',
  TIME_PER_MOVE: 'gosei-time-per-move',
  HANDICAP: 'gosei-handicap',
  SCORING_RULE: 'gosei-scoring-rule',
  GAME_TYPE: 'gosei-game-type',
  VS_AI: 'gosei-vs-ai',
  AI_LEVEL: 'gosei-ai-level'
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

// Username validation function
const validateUsername = (name: string): { isValid: boolean; error: string | null } => {
  // Check length (4-32 characters)
  if (name.length < 4) {
    return { isValid: false, error: 'Name must be at least 4 characters long' };
  }
  if (name.length > 32) {
    return { isValid: false, error: 'Name must be no more than 32 characters long' };
  }
  
  // Check for special characters (only allow letters, numbers, spaces, underscores, and hyphens)
  const allowedCharsRegex = /^[a-zA-Z0-9\s_-]+$/;
  if (!allowedCharsRegex.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, numbers, spaces, underscores, and hyphens' };
  }
  
  // Check that it's not just spaces
  if (name.trim().length === 0) {
    return { isValid: false, error: 'Name cannot be empty or only spaces' };
  }
  
  return { isValid: true, error: null };
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { createGame, joinGame, gameState, error } = useGame();
  const { isDarkMode } = useAppTheme();
  const [username, setUsername] = useState('');
  const [gameId, setGameId] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [showCustomSizes, setShowCustomSizes] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
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
    // AI Game Options
    vsAI: getStoredValue(STORAGE_KEYS.VS_AI, false),
    aiLevel: getStoredValue(STORAGE_KEYS.AI_LEVEL, 'normal') as GameOptions['aiLevel'],
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
    // Save AI options
    setStoredValue(STORAGE_KEYS.VS_AI, gameOptions.vsAI);
    setStoredValue(STORAGE_KEYS.AI_LEVEL, gameOptions.aiLevel);
  }, [gameOptions]);

  // Helper function to update a single game option and save it
  const updateGameOption = <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => {
    setGameOptions(prev => {
      // Create a new state object
      const newState = {
        ...prev,
        [key]: value
      };
      
      // If updating board size, automatically set the recommended time
      if (key === 'boardSize') {
        const newRecommendedTime = getRecommendedTimeForBoardSize(value as number);
        
        // Always update time to the recommended value for the new board size
        // This provides a better user experience and ensures appropriate time for each board size
        newState.timeControl = newRecommendedTime;
        newState.timeControlOptions = {
          ...prev.timeControlOptions,
          timeControl: newRecommendedTime
        };
      }
      
      // If updating game type, apply proper time control settings
      if (key === 'gameType' && typeof value === 'string') {
        const gameType = value as GameType;
        
        // Use utility function to update blitz time controls
        if (gameType === 'blitz') {
          // Create a temporary object with the expected property names for the utility function
          const blitzSettings = {
            ...newState,
            mainTime: newState.timeControl || 0
          };
          updateBlitzTimeControls(blitzSettings);
          
          // Apply the results back to newState
          newState.timeControl = 0; // Blitz games always have 0 main time
          newState.timePerMove = blitzSettings.timePerMove || 5;
          
          // Sync with timeControlOptions
          newState.timeControlOptions = {
            ...prev.timeControlOptions,
            timeControl: 0,
            timePerMove: newState.timePerMove,
            byoYomiPeriods: 0,
            byoYomiTime: 0
          };
        } else if (gameType === 'even' || gameType === 'handicap' || gameType === 'teaching') {
          // Set defaults for standard games using utility function
          newState.timePerMove = 0;
          
          // Reset handicap to 0 for even games, set default for handicap games
          if (gameType === 'even') {
            newState.handicap = 0;
          } else if (gameType === 'handicap' && prev.gameType !== 'handicap') {
            // Only set default handicap when switching TO handicap from another game type
            // This preserves user's handicap selection when they're adjusting other settings
            newState.handicap = 2; // Default to 2 stones for new handicap games
          }
          
          // Auto-set main time based on board size for standard games
          const recommendedTime = getRecommendedTimeForBoardSize(newState.boardSize);
          const currentTimeControl = newState.timeControl || 0;
          const shouldAutoSetTime = currentTimeControl === 0;
          
          // Determine the appropriate time control based on game type
          let defaultTimeControl: number;
          if (gameType === 'teaching') {
            defaultTimeControl = shouldAutoSetTime ? recommendedTime * 2 : currentTimeControl;
          } else {
            defaultTimeControl = shouldAutoSetTime ? recommendedTime : currentTimeControl;
          }
          
          newState.timeControl = defaultTimeControl;
          
          newState.timeControlOptions = {
            ...prev.timeControlOptions,
            timePerMove: 0,
            timeControl: defaultTimeControl,
            fischerTime: 0,
            byoYomiPeriods: 5, // Default to 5 periods for standard games
            byoYomiTime: 30    // Default to 30 seconds per period
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
        
        // Auto-behavior: When Byo-yomi Periods is set to 0 (No byo-yomi), 
        // automatically set Byo-yomi Time to 0 (Not used)
        if ('byoYomiPeriods' in value && value.byoYomiPeriods === 0) {
          (value as any).byoYomiTime = 0;
        }
        
        // Validate blitz settings when byo-yomi is changed
        if ('byoYomiPeriods' in value && newState.gameType === 'blitz' && (value as any).byoYomiPeriods > 0) {
          console.warn('Byo-yomi is not allowed in Blitz games - automatically disabled');
          (value as any).byoYomiPeriods = 0;
          (value as any).byoYomiTime = 0;
        }
      }
      
      // If updating direct timeControl or timePerMove, sync the timeControlOptions
      if (key === 'timeControl' && typeof value === 'number') {
        newState.timeControl = value;
        newState.timeControlOptions = {
          ...prev.timeControlOptions,
          timeControl: value
        };
        
        // When main time is 0 (unlimited time), disable byo-yomi
        if (value === 0) {
          newState.timeControlOptions = {
            ...newState.timeControlOptions,
            byoYomiPeriods: 0,
            byoYomiTime: 0
          };
        }
        
        // Validate blitz settings - main time should be 0 for blitz games
        if (newState.gameType === 'blitz' && value > 0) {
          console.warn('Main time should be 0 for Blitz games - automatically set to 0');
          newState.timeControl = 0;
          newState.timeControlOptions = {
            ...newState.timeControlOptions,
            timeControl: 0
          };
        }
      }
      
      if (key === 'timePerMove' && typeof value === 'number') {
        // Use utility function to update time controls based on timePerMove
        const tempSettings: any = {
          ...newState,
          timePerMove: value,
          boardSize: prev.boardSize,
          mainTime: newState.timeControl || 0,
          byoYomiEnabled: false,
          byoYomiPeriods: 0,
          byoYomiTime: 0
        };
        
        updateTimeControls(tempSettings);
        
        // Apply the updated settings
        newState.gameType = tempSettings.gameType;
        newState.timePerMove = tempSettings.timePerMove;
        newState.timeControl = tempSettings.mainTime;
        
        // Sync with timeControlOptions
        newState.timeControlOptions = {
          ...prev.timeControlOptions,
          timePerMove: tempSettings.timePerMove,
          timeControl: tempSettings.mainTime,
          byoYomiPeriods: tempSettings.byoYomiPeriods || 0,
          byoYomiTime: tempSettings.byoYomiTime || 0
        };
      }
      
      // Final validation for blitz settings
      if (newState.gameType === 'blitz') {
        const validation: any = validateBlitzSettings({
          gameType: newState.gameType,
          timePerMove: newState.timePerMove || 0,
          byoYomiPeriods: newState.timeControlOptions?.byoYomiPeriods || 0,
          mainTime: newState.timeControl || 0
        });
        if (!validation.valid) {
          console.warn('Blitz validation failed:', validation.error);
          // Auto-correct invalid settings
          const blitzSettings: any = {
            gameType: 'blitz',
            timePerMove: newState.timePerMove || 5,
            mainTime: 0,
            byoYomiEnabled: false,
            byoYomiPeriods: 0,
            byoYomiTime: 0
          };
          updateBlitzTimeControls(blitzSettings);
          
          newState.timeControl = 0;
          newState.timePerMove = blitzSettings.timePerMove;
          newState.timeControlOptions = {
            ...newState.timeControlOptions,
            byoYomiPeriods: 0,
            byoYomiTime: 0,
            timeControl: 0,
            timePerMove: blitzSettings.timePerMove
          };
        }
      }
      
      return newState;
    });
  };

  // Handle username input changes with validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    // Clear errors when user starts typing again
    if (usernameError) {
      setUsernameError(null);
    }
    
    // Validate if not empty
    if (value.length > 0) {
      const validation = validateUsername(value);
      if (!validation.isValid) {
        setUsernameError(validation.error);
      }
    }
  };

  const handleCreateGame = () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      setUsernameError('Please enter your username');
      return;
    }

    // Validate username
    const validation = validateUsername(trimmedUsername);
    if (!validation.isValid) {
      setUsernameError(validation.error);
      return;
    }

    // Clear any errors and save username for future games
    setUsernameError(null);
    localStorage.setItem(STORAGE_KEYS.USERNAME, trimmedUsername);
    setShowGameSettings(true);
  };

  // New handler for CreateGameForm
  const handleCreateGameWithCaptcha = (playerName: string, options: GameOptions, captcha?: any, captchaAnswer?: any) => {
    setIsCreatingGame(true);
    setLocalError(null);

    // Validate AI game constraints
    if (options.vsAI && options.boardSize > 19) {
      setLocalError('AI opponents are not supported on boards larger than 19x19. Please choose a smaller board size or disable AI.');
      setIsCreatingGame(false);
      return;
    }

    console.log('Creating game with captcha verification:', { playerName, options, captcha: !!captcha, captchaAnswer: !!captchaAnswer });
    
    try {
      // Check if it's multi-captcha or single captcha
      const isMultiCaptcha = captcha && captcha.problems && Array.isArray(captcha.problems);
      
      // Create game through context
      createGame({
        ...options,
        playerName,
        ...(isMultiCaptcha ? {
          multiCaptcha: captcha,
          captchaAnswers: captchaAnswer
        } : {
          captcha,
          captchaAnswer
        })
      });
      
      // Close the captcha modal on successful creation
      setShowCreateForm(false);
      
      // Set a timeout to check if navigation hasn't happened
      setTimeout(() => {
        if (!gameState?.id) {
          console.log('Navigation did not occur through context');
          setLocalError('Could not navigate to the game. Please try again or check your connection.');
          setIsCreatingGame(false);
        }
      }, 3000); // Wait 3 seconds before showing error
    } catch (err) {
      console.error('Error in game creation:', err);
      setLocalError('Failed to create game. Please try again.');
      setIsCreatingGame(false);
    }
  };



  const handleJoinGame = async () => {
    const trimmedGameId = gameId.trim();
    
    if (!trimmedGameId) {
      setLocalError('Please enter a game code or share link');
      return;
    }

    // If no username is entered, focus on the username field and show helper
    if (!username.trim()) {
      setUsernameError('Please enter your username to join the game');
      // Focus on username input
      const usernameInput = document.getElementById('username');
      if (usernameInput) {
        usernameInput.focus();
      }
      return;
    }

    const trimmedUsername = username.trim();
    
    // Validate username
    const validation = validateUsername(trimmedUsername);
    if (!validation.isValid) {
      setUsernameError(validation.error);
      return;
    }

    // Clear any previous errors
    setLocalError(null);
    setUsernameError(null);

    // Save username for future games
    localStorage.setItem(STORAGE_KEYS.USERNAME, trimmedUsername);
    
    // Call the joinGame function from context and let the effect handle the navigation
    try {
      console.log(`Attempting to join game with ID/code: ${trimmedGameId}`);
      await joinGame(trimmedGameId, trimmedUsername);
      
      // Set a timeout to check if navigation hasn't happened
      setTimeout(() => {
        if (!gameState?.id) {
          setLocalError('Could not join the game. Please check the game code and try again.');
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
          // Update board size - let updateGameOption handle time control updates
          updateGameOption('boardSize', size);
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

        {/* AI Opponent Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🤖 AI Opponent
          </h3>
          
          <div className="space-y-4">
            {/* AI Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-neutral-50">
              <div>
                <label htmlFor="vs-ai" className="text-sm font-medium text-neutral-700">
                  Play against KataGo AI
                </label>
                <p className="text-xs text-neutral-500 mt-1">
                  Challenge yourself against a powerful Go AI engine (optimized for 9x9 boards)
                </p>
              </div>
              <input
                id="vs-ai"
                type="checkbox"
                checked={gameOptions.vsAI || false}
                onChange={(e) => updateGameOption('vsAI', e.target.checked)}
                className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
              />
            </div>

            {/* AI Difficulty Selection */}
            {gameOptions.vsAI && (
              <div className="pl-4 border-l-2 border-primary-200">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  AI Difficulty Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { 
                      level: 'easy' as const, 
                      title: '🐣 Easy', 
                      description: 'Great for beginners (1s thinking time, 50 visits)',
                      recommended: 'Recommended for new players'
                    },
                    { 
                      level: 'normal' as const, 
                      title: '🎯 Normal', 
                      description: 'Balanced challenge (3s thinking time, 100 visits)',
                      recommended: 'Good for most players'
                    },
                    { 
                      level: 'hard' as const, 
                      title: '🔥 Hard', 
                      description: 'Strong challenge (5s thinking time, 200 visits)',
                      recommended: 'For experienced players'
                    },
                    { 
                      level: 'expert' as const, 
                      title: '💎 Expert', 
                      description: 'Maximum strength (8s thinking time, 400 visits)',
                      recommended: 'For advanced players only'
                    }
                  ].map(({ level, title, description, recommended }) => (
                    <div
                      key={level}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        gameOptions.aiLevel === level
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                      onClick={() => updateGameOption('aiLevel', level)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{title}</span>
                        <input
                          type="radio"
                          name="ai-level"
                          checked={gameOptions.aiLevel === level}
                          onChange={() => updateGameOption('aiLevel', level)}
                          className="h-4 w-4 text-primary-500"
                        />
                      </div>
                      <p className="text-xs text-neutral-600 mb-1">{description}</p>
                      <p className="text-xs text-primary-600 font-medium">{recommended}</p>
                    </div>
                  ))}
                </div>
                
                {/* AI Board Size Optimization Notice */}
                {gameOptions.boardSize !== 9 && gameOptions.boardSize <= 19 && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-yellow-900/20 border-yellow-700/50' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}>⚠️</span>
                      <div>
                        <p className={`text-sm font-medium ${
                          isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
                        }`}>
                          Performance Notice
                        </p>
                        <p className={`text-xs mt-1 ${
                          isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                        }`}>
                          KataGo is optimized for 9x9 boards. {gameOptions.boardSize}x{gameOptions.boardSize} boards will be slower and require more system resources.
                        </p>
                        <div className={`text-xs mt-2 ${
                          isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                        }`}>
                          <p><strong>Expected performance:</strong></p>
                          <ul className="ml-2 mt-1 space-y-1">
                            {gameOptions.boardSize === 13 && <li>• 13x13: Good performance (3-15 seconds per move)</li>}
                            {gameOptions.boardSize === 15 && <li>• 15x15: Decent performance (5-20 seconds per move)</li>}
                            {gameOptions.boardSize === 19 && <li>• 19x19: Slower but playable (10-30 seconds per move)</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Not Supported Warning for Large Boards */}
                {gameOptions.boardSize > 19 && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-red-900/20 border-red-700/50' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className={isDarkMode ? 'text-red-400' : 'text-red-500'}>🚫</span>
                      <div>
                        <p className={`text-sm font-medium ${
                          isDarkMode ? 'text-red-300' : 'text-red-800'
                        }`}>
                          AI Not Available
                        </p>
                        <p className={`text-xs mt-1 ${
                          isDarkMode ? 'text-red-200' : 'text-red-700'
                        }`}>
                          AI opponents are not supported on {gameOptions.boardSize}x{gameOptions.boardSize} boards. Please choose a smaller board size (19x19 or smaller) to play against AI, or disable AI to play on larger boards.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  step="5"
                  disabled={gameOptions.gameType === 'blitz'}
                  className="form-input w-full"
                />
                <div className="mt-1">
                  {gameOptions.gameType === 'blitz' ? (
                    <p className="text-sm text-neutral-500">
                      Blitz games use 0 main time (time per move only)
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-500">
                        Recommended {getRecommendedTimeForBoardSize(gameOptions.boardSize)} minutes for {gameOptions.boardSize}×{gameOptions.boardSize} board (you can set any time you want)
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Set to 0 minutes for unlimited time (no time counting)
                      </p>
                    </>
                  )}
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
                  disabled={gameOptions.gameType === 'blitz' || (gameOptions.timeControl === 0)}
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
                    : gameOptions.timeControl === 0
                    ? 'Not available when main time is 0 (unlimited time)'
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
                  disabled={!gameOptions.timeControlOptions?.byoYomiPeriods || gameOptions.gameType === 'blitz' || (gameOptions.timeControl === 0)}
                >
                  <option value="0">Not used</option>
                  <option value="30">30 seconds (Standard)</option>
                  <option value="40">40 seconds</option>
                  <option value="60">60 seconds</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  {gameOptions.gameType === 'blitz' 
                    ? 'Not available in Blitz games'
                    : gameOptions.timeControl === 0
                    ? 'Not available when main time is 0 (unlimited time)'
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
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Header */}
        <header className="text-center mb-12">
          {/* Logo, title, and theme toggle - responsive layout */}
          <div className="flex flex-col items-center justify-center gap-4 mb-2">
            {/* Desktop layout: Logo + Title + Theme Toggle on same row */}
            <div className="hidden md:flex items-center justify-center gap-6">
              <div className="flex items-center gap-3">
                <GoseiLogo size={48} />
                                 <h1 className="text-4xl font-extrabold text-primary-700 font-display tracking-tight">Gosei Play</h1>
              </div>
              <ThemeToggleButton />
            </div>
            
            {/* Mobile/Tablet layout: Logo and Title on same row, Theme Toggle below */}
            <div className="md:hidden flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <GoseiLogo size={48} />
                                 <h1 className="text-3xl font-extrabold text-primary-700 font-display tracking-tight">Gosei Play</h1>
                <ThemeToggleButton />
              </div>
            </div>
          </div>
          <p className="text-lg sm:text-xl text-neutral-600">
            Play Go online with friends around the world
          </p>
          <div className="mt-6 flex flex-row justify-center items-center gap-2 sm:gap-4">
            <Link 
              to="/board-demo" 
              className="inline-flex items-center px-2 sm:px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Board Demo
            </Link>
            <Link 
              to="/rules" 
              className="inline-flex items-center px-2 sm:px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Learn Go
            </Link>
            <a 
              href="https://kifu.gosei.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`inline-flex items-center px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base ${
                isDarkMode
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-500 text-white hover:from-blue-600 hover:to-indigo-700 hover:border-blue-600'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 border border-primary-500 !text-white hover:from-primary-600 hover:to-primary-700 hover:border-primary-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="whitespace-nowrap">Gosei Kifu</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 flex-shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          {!showGameSettings ? (
            // Initial screen with name input
            <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="lg:flex">
                {/* Left panel - Create Game */}
                <div className="lg:w-1/2 p-6 md:p-10 border-r border-neutral-200">
              <h2 className="text-3xl font-bold mb-8 font-display tracking-tight">Play Go</h2>
              
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
                  className={`form-input text-lg py-3 transition-all duration-300 ${
                    usernameError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : gameId.trim() && !username.trim()
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50 animate-pulse'
                      : ''
                  }`}
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Enter your name (4-32 characters)"
                  maxLength={32}
                />
                {usernameError && (
                  <p className="mt-2 text-sm text-red-600">{usernameError}</p>
                )}
                <p className="mt-1 text-sm text-neutral-500">
                  Name must be 4-32 characters. Only letters, numbers, spaces, underscores, and hyphens allowed.
                </p>
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

                    <div className="space-y-3">
                      <input
                        type="text"
                        className="form-input w-full"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        placeholder="Enter game code or share link"
                      />
                      <button
                        onClick={handleJoinGame}
                        disabled={!username.trim() || !gameId.trim()}
                        className={`btn w-full whitespace-nowrap ${
                          !username.trim() || !gameId.trim() 
                            ? 'btn-disabled cursor-not-allowed opacity-60' 
                            : 'btn-secondary hover:btn-primary'
                        }`}
                      >
                        Join Game
                      </button>
                      {(!username.trim() || !gameId.trim()) && (
                        <p className={`text-xs text-center ${
                          gameId.trim() && !username.trim() 
                            ? 'text-amber-600 font-medium' 
                            : 'text-neutral-500'
                        }`}>
                          {!username.trim() && !gameId.trim() 
                            ? 'Enter your name and game code to join'
                            : !username.trim()
                            ? '⚠️ Missing: Your name is required to join this game'
                            : 'Enter a game code or share link to join'
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right panel - About Go */}
                <div className="hidden lg:block lg:w-1/2 bg-neutral-50 p-6 md:p-10">
                  <h2 className="text-3xl font-bold mb-6 font-display tracking-tight">About Go</h2>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-lg mb-6">
                      Go originated in China more than 2,500 years ago and is believed to be the oldest board game continuously played today. The game is played by two players who take turns placing black and white stones on the intersections of the grid.
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
                    <h2 className="text-3xl font-bold font-display tracking-tight">Game Settings</h2>
                    <p className="text-neutral-600 mt-1">Welcome, {username}! Configure your game preferences.</p>
                  </div>
                  <button 
                    onClick={() => setShowGameSettings(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 hover:scale-105 ${
                      isDarkMode
                        ? 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600 hover:border-neutral-500'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="font-medium">Back</span>
                  </button>
                      </div>

                {/* Game Options Panel */}
                <GameOptionsPanel />
                
                {/* Create Game button */}
                <div className="mt-8 flex justify-center md:justify-end">
                    <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn btn-primary text-lg py-3 px-8"
                  >
                    Create Game
                    </button>
                </div>
                </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-neutral-600">
            Powered by{' '}
            <a 
              href="https://beaver.foundation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid transition-all duration-200"
            >
              Beaver Foundation
            </a>
          </p>
        </div>
      </footer>
      
      {/* Captcha Modal */}
      {showCreateForm && createPortal(
        <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-xl max-w-2xl w-[90%] max-h-[90vh] overflow-y-auto z-[9999] ${
          isDarkMode ? 'bg-neutral-800' : 'bg-white'
        }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-neutral-100' : 'text-neutral-900'
                }`}>Anti-Bot Verification</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100' 
                      : 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <CreateGameForm
                onCreateGame={handleCreateGameWithCaptcha}
                gameOptions={gameOptions}
                onUpdateGameOptions={updateGameOption}
                isCreating={isCreatingGame}
                error={error || localError}
                initialPlayerName={username}
              />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default HomePage; 