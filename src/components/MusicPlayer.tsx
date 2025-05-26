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

interface MusicPlayerProps {
  onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(globalIsPlaying);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(globalTrackIndex);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    audioRef.current.volume = volume / 100;
    audioRef.current.loop = true;
    
    // Load the user preferences if any
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume) {
      setVolume(parseInt(savedVolume));
      if (audioRef.current) {
        audioRef.current.volume = parseInt(savedVolume) / 100;
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
      audioRef.current.volume = volume / 100;
      audioRef.current.loop = true;
      
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.error('Error playing audio:', err));
      }
      
      // Update global state
      globalTrackIndex = currentTrackIndex;
    }
  }, [currentTrackIndex, isActivePage, isPlaying, volume]);

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

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    localStorage.setItem('musicVolume', newVolume.toString());
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg w-64 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </span>
            <span className="text-white font-medium">Music Player</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Player Controls */}
        <div className="px-4 py-3">
          <div className="flex justify-center gap-4 mb-4">
            <button className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="bg-amber-500 rounded-full p-2 text-white hover:bg-amber-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
              style={{
                backgroundImage: `linear-gradient(to right, #f59e0b ${volume}%, #374151 ${volume}%)`
              }}
            />
          </div>
        </div>

        {/* Playlist */}
        <div className="px-4 py-2 max-h-48 overflow-y-auto">
          <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-md mb-2">
            Traditional Go
          </div>
          <div className="text-gray-400 hover:text-white px-3 py-2 rounded-md hover:bg-gray-700 cursor-pointer transition-colors">
            Zen Music 1
          </div>
          <div className="text-gray-400 hover:text-white px-3 py-2 rounded-md hover:bg-gray-700 cursor-pointer transition-colors">
            Zen Music 2
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer; 