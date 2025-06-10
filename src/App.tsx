import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { BoardThemeProvider } from './context/BoardThemeContext';
import { AppThemeProvider } from './context/AppThemeContext';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import BoardDemoPage from './pages/BoardDemoPage';
import RulesPage from './pages/RulesPage';
import MultiCaptchaDemo from './components/MultiCaptchaDemo';
import FloatingMusicPlayer from './components/FloatingMusicPlayer';
import { initializeSoundPreferences } from './utils/soundUtils';
import './App.css';

function App() {
  // Initialize sound preferences on app start
  useEffect(() => {
    initializeSoundPreferences();
  }, []);

  return (
    <Router>
      <AppThemeProvider>
        <GameProvider>
          <BoardThemeProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/game/:gameId" element={<GamePage />} />
              <Route path="/board-demo" element={<BoardDemoPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/multi-captcha-demo" element={<MultiCaptchaDemo />} />
            </Routes>
            <FloatingMusicPlayer />
          </BoardThemeProvider>
        </GameProvider>
      </AppThemeProvider>
    </Router>
  );
}

export default App;
