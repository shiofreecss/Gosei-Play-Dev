// Sound utility functions

let stoneSoundEnabled = true;

// Get the stored sound preference or default to true
export const initializeSoundPreferences = (): void => {
  const storedPreference = localStorage.getItem('stoneSoundEnabled');
  if (storedPreference !== null) {
    stoneSoundEnabled = storedPreference === 'true';
  }
};

// Toggle stone sound preference
export const toggleStoneSound = (): boolean => {
  stoneSoundEnabled = !stoneSoundEnabled;
  localStorage.setItem('stoneSoundEnabled', stoneSoundEnabled.toString());
  return stoneSoundEnabled;
};

// Get current stone sound preference
export const getStoneSoundEnabled = (): boolean => {
  return stoneSoundEnabled;
};

// Play stone placement sound
export const playStoneSound = (): void => {
  if (!stoneSoundEnabled) return;
  
  try {
    const audio = new Audio('/sounds/stone-sound.mp3');
    audio.volume = 0.7; // Set volume to 70%
    audio.play().catch(error => {
      console.error('Error playing stone sound:', error);
    });
  } catch (error) {
    console.error('Failed to create audio object:', error);
  }
}; 