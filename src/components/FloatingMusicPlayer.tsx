import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';

// List of available music tracks
const musicTracks = [
  {
    name: 'Traditional Go',
    src: '/music/traditional-go.mp3',
  },
  {
    name: 'Zen Music 1',
    src: '/music/zen-music-1.mp3',
  },
  {
    name: 'Zen Music 2',
    src: '/music/zen-music-2.mp3',
  },
];

// Store music state globally to persist between route changes
let globalIsPlaying = false;
let globalTrackIndex = 0;

// Brown colors for the music player
const BROWN = {
  main: '#8B4513',      // SaddleBrown - main button color
  hover: '#A0522D',     // Sienna - hover button color
  light: '#DEB887',     // BurlyWood - light brown for backgrounds
  dark: '#654321',      // Dark brown for accents
  lightest: '#F5DEB3',  // Wheat - lightest brown for selected items
  text: '#3E2723'       // Very dark brown for text
};

const FloatingMusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(globalIsPlaying);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(globalTrackIndex);
  const [volume, setVolume] = useState(0.3); // Default to 30% volume
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const { gameState } = useGame();
  
  // Only show on active game pages where a game is in progress or finished
  // Don't show on board demo, join page, or during game setup/waiting
  const isActivePage = 
    location.pathname.includes('/game/') && 
    gameState && 
    (gameState.status === 'playing' || gameState.status === 'scoring' || gameState.status === 'finished');
  
  // Initialize audio element
  useEffect(() => {
    // Only initialize audio if we're showing the music player
    if (!isActivePage) return;
    
    audioRef.current = new Audio(musicTracks[currentTrackIndex].src);
    audioRef.current.volume = volume;
    audioRef.current.loop = true;
    
    // Load the user preferences if any
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
      if (audioRef.current) {
        audioRef.current.volume = parseFloat(savedVolume);
      }
    }
    
    // Resume playback if it was playing before
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(err => console.error('Error playing audio:', err));
    }
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        // Store current playing state when unmounting
        globalIsPlaying = isPlaying;
        globalTrackIndex = currentTrackIndex;
        
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isActivePage, currentTrackIndex, isPlaying, volume]);

  // Handle track change
  useEffect(() => {
    if (!isActivePage) return;
    
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.pause();
      audioRef.current = new Audio(musicTracks[currentTrackIndex].src);
      audioRef.current.volume = volume;
      audioRef.current.loop = true;
      
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.error('Error playing audio:', err));
      }
      
      // Update global state
      globalTrackIndex = currentTrackIndex;
    }
  }, [currentTrackIndex, isActivePage, isPlaying, volume]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isActivePage) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (playerRef.current && !playerRef.current.contains(event.target as Node) && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActivePage, isExpanded]);
  
  // Don't render if not on an active game page
  if (!isActivePage) return null;

  // Toggle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error('Error playing audio:', err));
      }
      setIsPlaying(!isPlaying);
      globalIsPlaying = !isPlaying;
    }
  };

  // Change track
  const changeTrack = (index: number) => {
    setCurrentTrackIndex(index);
    globalTrackIndex = index;
  };

  // Previous track
  const previousTrack = () => {
    const newIndex = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
    changeTrack(newIndex);
  };

  // Next track
  const nextTrack = () => {
    const newIndex = (currentTrackIndex + 1) % musicTracks.length;
    changeTrack(newIndex);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    localStorage.setItem('musicVolume', newVolume.toString());
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-40" ref={playerRef}>
      {/* Floating music panel */}
      <div className={`${
        isExpanded ? 'bg-neutral-800/90 rounded-lg shadow-lg p-4 w-72 border border-neutral-700' : 'w-14 h-14'
      } transition-all duration-200`}>
        
        {/* Collapsed view - just the music icon */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full h-full flex items-center justify-center rounded-lg bg-neutral-800/90 text-white shadow-lg border border-neutral-700 transition-all duration-200 hover:bg-neutral-800 hover:scale-105 focus:outline-none"
            title="Music Player"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z"/>
              <path fill-rule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z"/>
              <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z"/>
            </svg>
          </button>
        )}
        
        {/* Expanded view - full player */}
        {isExpanded && (
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-white">Music Player</h3>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-neutral-400 hover:text-white transition-colors"
                title="Minimize"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Current track info */}
            <div className="text-center mb-4">
              <div className="text-sm font-semibold text-white truncate">
                {musicTracks[currentTrackIndex].name}
              </div>
            </div>
            
            {/* Playback controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={previousTrack}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                title="Previous Track"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-lg flex items-center justify-center shadow transition-colors bg-neutral-700 hover:bg-neutral-600 text-white"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={nextTrack}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                title="Next Track"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Volume control */}
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={handleVolumeChange}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
              
              <span className="text-xs text-neutral-400">
                {Math.round(volume * 100)}%
              </span>
            </div>
            
            {/* Track selection */}
            <div className="space-y-1">
              <p className="text-xs text-neutral-400 mb-1">Select Track:</p>
              {musicTracks.map((track, index) => (
                <button
                  key={index}
                  onClick={() => changeTrack(index)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    currentTrackIndex === index 
                      ? 'bg-neutral-700 text-white' 
                      : 'text-neutral-300 hover:bg-neutral-700/50'
                  }`}
                >
                  {track.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingMusicPlayer; 