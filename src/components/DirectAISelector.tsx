import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../context/AppThemeContext';
import { API_BASE_URL } from '../config';
import { STORAGE_KEYS } from '../constants/storage';

interface NetworkInfo {
  id: string;
  filename: string;
  elo: number;
  level: string;
  category: string;
  directory: string;
  cpuFriendly: boolean;
  available: boolean;
  networkFile: string;
}

interface DirectAISelectorProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedNetwork: string | null;
  onSelectNetwork: (networkId: string | null) => void;
  boardSize: number;
}

const DirectAISelector: React.FC<DirectAISelectorProps> = ({
  enabled,
  onToggle,
  selectedNetwork,
  onSelectNetwork,
  boardSize
}) => {
  const { isDarkMode } = useAppTheme();
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>(() => {
    // Load from localStorage or default to 'all'
    const stored = localStorage.getItem(STORAGE_KEYS.DIRECT_AI_FILTER_CATEGORY);
    return stored || 'all';
  });

  useEffect(() => {
    if (enabled) {
      loadAllNetworks();
    }
  }, [enabled]);

  const loadAllNetworks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/ai/all-networks`);
      const data = await response.json();
      
      if (data.success) {
        setNetworks(data.networks);
      } else {
        throw new Error('Failed to load networks');
      }
    } catch (err) {
      console.error('Error loading networks:', err);
      setError('Failed to load AI networks. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Persist filter category to localStorage
  const handleFilterCategoryChange = (categoryId: string) => {
    setFilterCategory(categoryId);
    localStorage.setItem(STORAGE_KEYS.DIRECT_AI_FILTER_CATEGORY, categoryId);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors = {
      beginner: isDarkMode ? 'bg-green-900/40 text-green-200 border-green-400' : 'bg-green-50 text-green-800 border-green-200',
      normal: isDarkMode ? 'bg-blue-900/40 text-blue-200 border-blue-400' : 'bg-blue-50 text-blue-800 border-blue-200',
      dan: isDarkMode ? 'bg-purple-900/40 text-purple-200 border-purple-400' : 'bg-purple-50 text-purple-800 border-purple-200',
      pro: isDarkMode ? 'bg-red-900/40 text-red-200 border-red-400' : 'bg-red-50 text-red-800 border-red-200'
    };
    return colors[category as keyof typeof colors] || (isDarkMode ? 'bg-neutral-700 text-neutral-300 border-neutral-600' : 'bg-neutral-100 text-neutral-700 border-neutral-300');
  };

  const getNetworkCardStyle = (network: NetworkInfo, isSelected: boolean) => {
    if (!network.available) {
      return isDarkMode 
        ? 'border-neutral-700 bg-neutral-900/30 text-neutral-500 opacity-50' 
        : 'border-neutral-300 bg-neutral-100 text-neutral-500 opacity-50';
    }
    
    if (isSelected) {
      return isDarkMode 
        ? 'border-primary-400 bg-primary-900/40 text-primary-100 shadow-sm' 
        : 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm';
    }
    
    return isDarkMode 
      ? 'border-neutral-600 bg-neutral-800/50 text-neutral-200' 
      : 'border-neutral-200 bg-white text-neutral-800';
  };

  const getEloStrength = (elo: number) => {
    if (elo < 1500) return 'Beginner';
    if (elo < 1900) return 'Intermediate';
    if (elo < 2400) return 'Advanced';
    return 'Master';
  };

  const getPerformanceNote = (boardSize: number) => {
    if (boardSize > 19) return 'AI not supported on boards larger than 19x19';
    if (boardSize === 19) return 'Optimal performance on 19x19 boards';
    if (boardSize === 13) return 'Good performance on 13x13 boards';
    return 'Excellent performance on 9x9 boards';
  };

  const filteredNetworks = networks.filter(network => 
    filterCategory === 'all' || network.category === filterCategory
  );

  const categories = [
    { id: 'all', name: 'All Networks', count: networks.length },
    { id: 'beginner', name: 'Beginner', count: networks.filter(n => n.category === 'beginner').length },
    { id: 'normal', name: 'Normal', count: networks.filter(n => n.category === 'normal').length },
    { id: 'dan', name: 'Dan', count: networks.filter(n => n.category === 'dan').length },
    { id: 'pro', name: 'Pro', count: networks.filter(n => n.category === 'pro').length }
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
            <label htmlFor="vs-ai-direct" className={`text-sm font-medium ${
              isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
            }`}>
              Play against KataGo AI
            </label>
            <p className={`text-xs mt-1 ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              Choose from all available AI networks with different strength levels
            </p>
          </div>
          <input
            id="vs-ai-direct"
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
            {/* Category Filter */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
              }`}>
                Filter by Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleFilterCategoryChange(category.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      filterCategory === category.id
                        ? isDarkMode 
                          ? 'bg-primary-600 text-white border border-primary-500' 
                          : 'bg-primary-500 text-white border border-primary-400'
                        : isDarkMode 
                          ? 'bg-neutral-700 text-neutral-300 border border-neutral-600 hover:bg-neutral-600' 
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200'
                    }`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Network Selection */}
            {loading ? (
              <div className={`p-4 text-center ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                <svg className="animate-spin h-5 w-5 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading AI networks...
              </div>
            ) : error ? (
              <div className={`p-4 text-center ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                <p className="mb-2">❌ {error}</p>
                <button
                  onClick={loadAllNetworks}
                  className={`px-3 py-1 rounded text-xs ${
                    isDarkMode 
                      ? 'bg-red-900/20 text-red-300 border border-red-700 hover:bg-red-900/40' 
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`text-sm ${
                  isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                }`}>
                  Showing {filteredNetworks.length} network{filteredNetworks.length !== 1 ? 's' : ''}
                  {filterCategory !== 'all' && ` in ${filterCategory} category`}
                </div>
                
                {filteredNetworks.map((network) => {
                  const isSelected = selectedNetwork === network.id;
                  
                  return (
                    <div
                      key={network.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        getNetworkCardStyle(network, isSelected)
                      } ${
                        !network.available 
                          ? 'cursor-not-allowed' 
                          : isSelected
                            ? ''
                            : isDarkMode 
                              ? 'hover:border-neutral-500 hover:bg-neutral-700/70'
                              : 'hover:border-neutral-400 hover:bg-neutral-50'
                      }`}
                      onClick={() => network.available && onSelectNetwork(isSelected ? null : network.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded border ${getCategoryBadgeColor(network.category)}`}>
                            {network.category.toUpperCase()}
                          </span>
                          <span className="font-medium text-sm">
                            {network.level}
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="ai-network"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={!network.available}
                          className="h-4 w-4 text-primary-500"
                        />
                      </div>
                      
                      <p className={`text-xs mb-1 ${
                        isSelected
                          ? 'opacity-90'
                          : isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                      }`}>
                        Strength: {getEloStrength(network.elo)} level
                      </p>
                      
                      {!network.available && (
                        <p className={`text-xs mt-2 ${
                          isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          ⚠️ Network file not downloaded
                        </p>
                      )}
                    </div>
                  );
                })}
                
                {filteredNetworks.length === 0 && (
                  <div className={`text-center py-8 ${
                    isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                  }`}>
                    No networks found in {filterCategory} category
                  </div>
                )}
              </div>
            )}

            {/* Performance Notice */}
            <div className={`mt-4 p-3 rounded-lg border ${
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
                    {getPerformanceNote(boardSize)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectAISelector; 