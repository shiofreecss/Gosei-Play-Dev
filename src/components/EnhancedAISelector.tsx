import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../context/AppThemeContext';
import { API_BASE_URL } from '../config';

interface AINetwork {
  file: string;
  elo: number;
  level: string;
  rank: string;
}

interface AIOpponent {
  strength: 'easy' | 'equal' | 'hard';
  network: AINetwork;
  description: string;
  available: boolean;
}

interface EnhancedAISelectorProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedOpponent: string | null;
  onSelectOpponent: (opponentId: string | null) => void;
  humanPlayerRank: string;
  onRankChange: (rank: string) => void;
  boardSize: number;
}

const EnhancedAISelector: React.FC<EnhancedAISelectorProps> = ({
  enabled,
  onToggle,
  selectedOpponent,
  onSelectOpponent,
  humanPlayerRank,
  onRankChange,
  boardSize
}) => {
  const { isDarkMode } = useAppTheme();
  const [availableOpponents, setAvailableOpponents] = useState<AIOpponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available AI opponents when rank changes
  useEffect(() => {
    if (enabled && humanPlayerRank) {
      loadAvailableOpponents(humanPlayerRank);
    }
  }, [enabled, humanPlayerRank]);

  const loadAvailableOpponents = async (rank: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/ai/opponents/${rank}`);
      if (response.ok) {
        const opponents = await response.json();
        setAvailableOpponents(opponents.map((opp: any) => ({
          ...opp,
          available: true
        })));
      } else {
        throw new Error('Failed to load AI opponents');
      }
    } catch (err) {
      console.error('Error loading AI opponents:', err);
      setError('Failed to load AI opponents from server.');
      generateFallbackOpponents(rank);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackOpponents = (rank: string) => {
    const rankMap: { [key: string]: number } = {
      '15k': 400, '14k': 450, '13k': 500, '12k': 550, '11k': 600, '10k': 700,
      '9k': 800, '8k': 950, '7k': 1100, '6k': 1400, '5k': 1600, '4k': 1800,
      '3k': 1900, '2k': 2000, '1k': 2100, '1d': 2200, '2d': 2300, '3d': 2400,
      '4d': 2500, '5d': 2600, '6d': 2700, '7d': 2800, '8d': 2900, '9d': 3000
    };

    const baseElo = rankMap[rank] || 1600;
    
    const fallbackOpponents: AIOpponent[] = [
      {
        strength: 'easy',
        network: {
          file: 'fallback-easy',
          elo: Math.max(400, baseElo - 400),
          level: 'Weaker Opponent',
          rank: 'Approx. 3-4 ranks lower'
        },
        description: 'Easier opponent for learning',
        available: true
      },
      {
        strength: 'equal',
        network: {
          file: 'fallback-equal',
          elo: baseElo,
          level: 'Equal Strength',
          rank: `Approx. ${rank} level`
        },
        description: 'Equal strength opponent',
        available: true
      },
      {
        strength: 'hard',
        network: {
          file: 'fallback-hard',
          elo: baseElo + 400,
          level: 'Stronger Opponent',
          rank: 'Approx. 3-4 ranks higher'
        },
        description: 'Stronger opponent for challenge',
        available: true
      }
    ];

    setAvailableOpponents(fallbackOpponents);
  };

  const handleRankChange = (newRank: string) => {
    onRankChange(newRank);
    onSelectOpponent(null);
  };

  const getPerformanceNote = (boardSize: number) => {
    if (boardSize === 9) return 'Optimal performance';
    if (boardSize === 13) return 'Good performance (3-15 seconds per move)';
    if (boardSize === 19) return 'Slower but playable (10-30 seconds per move)';
    if (boardSize > 19) return 'AI not supported on this board size';
    return 'Performance may vary';
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'easy': return '🐣';
      case 'equal': return '⚖️';
      case 'hard': return '🔥';
      default: return '🤖';
    }
  };

  const getStrengthColor = (strength: string, isSelected: boolean) => {
    // Base classes for all cards (unselected state)
    const baseClasses = isDarkMode 
      ? 'border-neutral-600 bg-neutral-800/50 text-neutral-200' 
      : 'border-neutral-200 bg-white text-neutral-800';
    
    if (!isSelected) {
      return baseClasses;
    }
    
    // Selected state with proper dark mode support
    switch (strength) {
      case 'easy': 
        return isDarkMode 
          ? 'border-green-400 bg-green-900/40 text-green-100' 
          : 'border-green-500 bg-green-50 text-green-800';
      case 'equal': 
        return isDarkMode 
          ? 'border-blue-400 bg-blue-900/40 text-blue-100' 
          : 'border-blue-500 bg-blue-50 text-blue-800';
      case 'hard': 
        return isDarkMode 
          ? 'border-red-400 bg-red-900/40 text-red-100' 
          : 'border-red-500 bg-red-50 text-red-800';
      default: 
        return isDarkMode 
          ? 'border-neutral-400 bg-neutral-700 text-neutral-100' 
          : 'border-neutral-500 bg-neutral-50 text-neutral-800';
    }
  };

  const ranks = [
    '15k', '14k', '13k', '12k', '11k', '10k', '9k', '8k', '7k', '6k',
    '5k', '4k', '3k', '2k', '1k', '1d', '2d', '3d', '4d', '5d', '6d'
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        🤖 AI Opponent
      </h3>
      
      <div className="space-y-4">
        {/* AI Toggle */}
        <div className={`flex items-center justify-between p-4 border rounded-lg ${
          isDarkMode ? 'bg-neutral-800 border-neutral-600' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div>
            <label htmlFor="vs-ai" className={`text-sm font-medium ${
              isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
            }`}>
              Play against KataGo AI
            </label>
            <p className={`text-xs mt-1 ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              Challenge yourself against a powerful Go AI with customizable strength
            </p>
          </div>
          <input
            id="vs-ai"
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
          />
        </div>

        {/* AI Configuration */}
        {enabled && (
          <div className={`pl-4 border-l-2 ${
            isDarkMode ? 'border-primary-400' : 'border-primary-200'
          }`}>
            {/* Your Rank Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
              }`}>
                Your Playing Strength
              </label>
              <select
                value={humanPlayerRank}
                onChange={(e) => handleRankChange(e.target.value)}
                className={`form-select w-full max-w-xs ${
                  isDarkMode 
                    ? 'bg-neutral-700 border-neutral-600 text-neutral-200' 
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <option value="">Select your rank</option>
                {ranks.map(rank => (
                  <option key={rank} value={rank}>
                    {rank} {rank.includes('k') ? '(kyu)' : '(dan)'}
                  </option>
                ))}
              </select>
              <p className={`text-xs mt-1 ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                This helps us recommend appropriate AI opponents for you
              </p>
            </div>

            {/* AI Opponent Selection */}
            {humanPlayerRank && (
              <>
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
                  }`}>
                    Choose AI Opponent
                  </label>
                  
                  {loading ? (
                    <div className={`p-4 text-center ${
                      isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                    }`}>
                      <svg className="animate-spin h-5 w-5 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading AI opponents...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableOpponents.map((opponent, index) => {
                        const opponentId = `${opponent.strength}-${opponent.network.elo}`;
                        const isSelected = selectedOpponent === opponentId;
                        
                        return (
                          <div
                            key={opponentId}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              getStrengthColor(opponent.strength, isSelected)
                            } ${
                              !opponent.available 
                                ? 'opacity-50 cursor-not-allowed' 
                                : isSelected
                                  ? 'shadow-sm' // Subtle shadow for selected state
                                  : isDarkMode 
                                    ? 'hover:border-neutral-500 hover:bg-neutral-700/70'
                                    : 'hover:border-neutral-400 hover:bg-neutral-50'
                            }`}
                            onClick={() => opponent.available && onSelectOpponent(isSelected ? null : opponentId)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getStrengthIcon(opponent.strength)}</span>
                                <span className="font-medium text-sm">
                                  {opponent.network.level}
                                </span>
                              </div>
                              <input
                                type="radio"
                                name="ai-opponent"
                                checked={isSelected}
                                onChange={() => {}}
                                disabled={!opponent.available}
                                className="h-4 w-4 text-primary-500"
                              />
                            </div>
                            
                            <p className={`text-xs mb-1 ${
                              isSelected
                                ? 'opacity-90' // Use opacity for selected state hierarchy
                                : isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                            }`}>
                              {opponent.description}
                            </p>
                            
                            <p className={`text-xs ${
                              isSelected
                                ? 'opacity-75' // More dimmed for hierarchy
                                : isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                            }`}>
                              Playing strength: {opponent.network.rank}
                            </p>
                            
                            {!opponent.available && (
                              <p className={`text-xs mt-2 ${
                                isDarkMode ? 'text-red-400' : 'text-red-600'
                              }`}>
                                ⚠️ Network not downloaded
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Performance Notice */}
                <div className={`p-3 rounded-lg border ${
                  boardSize > 19
                    ? isDarkMode 
                      ? 'bg-red-900/20 border-red-700/50' 
                      : 'bg-red-50 border-red-200'
                    : boardSize !== 9
                      ? isDarkMode 
                        ? 'bg-yellow-900/20 border-yellow-700/50' 
                        : 'bg-yellow-50 border-yellow-200'
                      : isDarkMode 
                        ? 'bg-green-900/20 border-green-700/50' 
                        : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className={
                      boardSize > 19 
                        ? isDarkMode ? 'text-red-400' : 'text-red-600'
                        : boardSize !== 9
                          ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                          : isDarkMode ? 'text-green-400' : 'text-green-600'
                    }>
                      {boardSize > 19 ? '🚫' : boardSize !== 9 ? '⚠️' : '✅'}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${
                        boardSize > 19 
                          ? isDarkMode ? 'text-red-300' : 'text-red-800'
                          : boardSize !== 9
                            ? isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
                            : isDarkMode ? 'text-green-300' : 'text-green-800'
                      }`}>
                        {boardSize > 19 ? 'AI Not Supported' : 'Performance Info'}
                      </p>
                      <p className={`text-xs mt-1 ${
                        boardSize > 19 
                          ? isDarkMode ? 'text-red-200' : 'text-red-700'
                          : boardSize !== 9
                            ? isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
                            : isDarkMode ? 'text-green-200' : 'text-green-700'
                      }`}>
                        {boardSize > 19 
                          ? `AI opponents are not supported on ${boardSize}x${boardSize} boards.`
                          : `${boardSize}x${boardSize} board: ${getPerformanceNote(boardSize)}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAISelector; 