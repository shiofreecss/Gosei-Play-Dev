import React, { useState, useEffect } from 'react';
import { getStoneSoundEnabled, toggleStoneSound } from '../utils/soundUtils';

const SoundSettings: React.FC = () => {
  const [stoneSoundEnabled, setStoneSoundEnabled] = useState(getStoneSoundEnabled());

  const handleToggleStoneSound = () => {
    const newState = toggleStoneSound();
    setStoneSoundEnabled(newState);
  };

  return (
    <button
      onClick={handleToggleStoneSound}
      className={`px-2 py-1 rounded text-xs ${
        stoneSoundEnabled 
          ? 'bg-green-600 text-white' 
          : 'bg-gray-600 text-gray-300'
      }`}
    >
      {stoneSoundEnabled ? 'ON' : 'OFF'}
    </button>
  );
};

export default SoundSettings; 