import React, { useEffect, useState } from 'react';
import BoardThemeSelector from './BoardThemeSelector';
import { useBoardTheme } from '../context/BoardThemeContext';

const GameSettings: React.FC = () => {
  const [resetCounter, setResetCounter] = useState(0);
  const [showBoardCoordinates, setShowBoardCoordinates] = useState(true);
  const [showMoveNumbers, setShowMoveNumbers] = useState(true);
  const [showTerritory, setShowTerritory] = useState(true);
  const [stoneSoundEnabled, setStoneSoundEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [autoPlayStoneSound, setAutoPlayStoneSound] = useState(true);
  const { setTheme } = useBoardTheme();
  
  const [defaultSettings, setDefaultSettings] = useState({
    showBoardCoordinates: true,
    showMoveNumbers: true,
    showTerritory: true,
    stoneSoundEnabled: true,
    animationsEnabled: true,
    autoPlayStoneSound: true,
    boardTheme: 'default'
  });

  useEffect(() => {
    if (resetCounter > 0) {
      // Reset all settings to default
      setShowBoardCoordinates(defaultSettings.showBoardCoordinates);
      setShowMoveNumbers(defaultSettings.showMoveNumbers);
      setShowTerritory(defaultSettings.showTerritory);
      setStoneSoundEnabled(defaultSettings.stoneSoundEnabled);
      setAnimationsEnabled(defaultSettings.animationsEnabled);
      setAutoPlayStoneSound(defaultSettings.autoPlayStoneSound);
      setTheme(defaultSettings.boardTheme as any);
      
      // Also update localStorage
      Object.entries(defaultSettings).forEach(([key, value]) => {
        localStorage.setItem(key, String(value));
      });
      localStorage.setItem('gosei-board-theme', defaultSettings.boardTheme);
    }
  }, [resetCounter, defaultSettings, setShowBoardCoordinates, setShowMoveNumbers, 
      setShowTerritory, setStoneSoundEnabled, setAnimationsEnabled, setAutoPlayStoneSound, setTheme]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4 font-display tracking-tight">Game Settings</h2>
      
      {/* Board Theme Settings */}
      <BoardThemeSelector />
      
      {/* Other Settings */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Visual Settings</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="board-coordinates" className="text-sm font-medium text-neutral-600">
              Show Board Coordinates
            </label>
            <input
              id="board-coordinates"
              type="checkbox"
              checked={showBoardCoordinates}
              onChange={() => setShowBoardCoordinates(!showBoardCoordinates)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="move-numbers" className="text-sm font-medium text-neutral-600">
              Show Move Numbers
            </label>
            <input
              id="move-numbers"
              type="checkbox"
              checked={showMoveNumbers}
              onChange={() => setShowMoveNumbers(!showMoveNumbers)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="show-territory" className="text-sm font-medium text-neutral-600">
              Show Territory Estimations
            </label>
            <input
              id="show-territory"
              type="checkbox"
              checked={showTerritory}
              onChange={() => setShowTerritory(!showTerritory)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="animations" className="text-sm font-medium text-neutral-600">
              Enable Animations
            </label>
            <input
              id="animations"
              type="checkbox"
              checked={animationsEnabled}
              onChange={() => setAnimationsEnabled(!animationsEnabled)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Sound Settings */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Sound Settings</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="stone-sound" className="text-sm font-medium text-neutral-600">
              Stone Placement Sound
            </label>
            <input
              id="stone-sound"
              type="checkbox"
              checked={stoneSoundEnabled}
              onChange={() => setStoneSoundEnabled(!stoneSoundEnabled)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="auto-sound" className="text-sm font-medium text-neutral-600">
              Auto-play Sound for Opponent Moves
            </label>
            <input
              id="auto-sound"
              type="checkbox"
              checked={autoPlayStoneSound}
              onChange={() => setAutoPlayStoneSound(!autoPlayStoneSound)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-400 rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Reset Button */}
      <button
        onClick={() => setResetCounter(prev => prev + 1)}
        className="mt-4 w-full py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
      >
        Reset to Default Settings
      </button>
    </div>
  );
};

export default GameSettings; 