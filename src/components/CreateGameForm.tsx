import React, { useState } from 'react';
import { GameOptions } from '../types/go';
import { 
  generateMultiMathCaptcha, 
  validateMultiCaptcha, 
  MultiCaptchaChallenge,
  captchaRateLimit 
} from '../utils/captcha';
import { useAppTheme } from '../context/AppThemeContext';

interface CreateGameFormProps {
  onCreateGame: (playerName: string, gameOptions: GameOptions, captcha?: MultiCaptchaChallenge, captchaAnswers?: number[]) => void;
  gameOptions: GameOptions;
  onUpdateGameOptions: (key: keyof GameOptions, value: any) => void;
  isCreating?: boolean;
  error?: string | null;
  initialPlayerName?: string;
}



const CreateGameForm: React.FC<CreateGameFormProps> = ({
  onCreateGame,
  gameOptions,
  onUpdateGameOptions,
  isCreating = false,
  error,
  initialPlayerName
}) => {
  const { isDarkMode } = useAppTheme();
  const [playerName] = useState(() => 
    initialPlayerName || localStorage.getItem('gosei-player-name') || ''
  );
  
  // Multi-captcha state
  const [multiCaptcha, setMultiCaptcha] = useState<MultiCaptchaChallenge>(() => generateMultiMathCaptcha(2));
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(2).fill(null));
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  // Rate limiting - use the exported instance
  const rateLimit = captchaRateLimit;

  // Fun captcha messages
  const captchaMessages = [
    "🧠 Prove your strategic mind! Solve these 2 math problems to show you're smarter than the bots:",
    "🎯 Ready to outsmart the machines? Complete these 2 math challenges to prove your worth:",
    "⚡ Time to flex those brain muscles! Solve 2 problems to show you're a true Go master:",
    "🏆 Think you can beat the bots? Prove it by solving these 2 mathematical challenges:",
    "🎲 Roll up your sleeves! Show your mental prowess with these 2 strategic calculations:",
    "🔥 Bring the heat! Demonstrate your superior intellect with these 2 math problems:"
  ];

  const [captchaMessage] = useState(() => 
    captchaMessages[Math.floor(Math.random() * captchaMessages.length)]
  );

  // Fun success messages
  const successMessages = [
    "🎉 Brilliant! Your strategic mind is ready for battle!",
    "⭐ Outstanding! You've proven your mental superiority!",
    "🏆 Excellent! You're clearly smarter than any bot!",
    "🔥 Perfect! Your intellect shines brighter than the stars!",
    "💎 Magnificent! You've earned your place among Go masters!",
    "🚀 Incredible! Your brain power is off the charts!"
  ];

  const [successMessage] = useState(() => 
    successMessages[Math.floor(Math.random() * successMessages.length)]
  );

  // Generate new multi-captcha
  const refreshCaptcha = () => {
    setMultiCaptcha(generateMultiMathCaptcha(2));
    setSelectedAnswers(new Array(2).fill(null));
    setCaptchaError(null);
    setCaptchaVerified(false);
    setCurrentProblemIndex(0);
    setAttemptCount(0);
  };



  // Handle captcha answer selection
  const handleCaptchaAnswer = async (problemIndex: number, answer: number) => {
    // Check rate limiting
    const identifier = `create_game_${Date.now()}`;
    if (rateLimit.isRateLimited(identifier)) {
      setCaptchaError('Too many attempts. Please wait before trying again.');
      return;
    }

    // Update selected answers
    const newAnswers = [...selectedAnswers];
    newAnswers[problemIndex] = answer;
    setSelectedAnswers(newAnswers);
    setCaptchaError(null);

    // Check if all problems are answered
    const allAnswered = newAnswers.every(ans => ans !== null);
    
    // Move to next problem if current one is answered
    if (newAnswers[problemIndex] !== null && problemIndex < multiCaptcha.totalProblems - 1) {
      setCurrentProblemIndex(problemIndex + 1);
    }

    // Check if all problems are answered
    if (allAnswered) {
      // Validate all answers
      const validation = validateMultiCaptcha(multiCaptcha, newAnswers);
      
      if (validation.isValid) {
        setCaptchaVerified(true);
        setCaptchaError(null);
        
        // Auto-create game when captcha is solved
        const playerNameToUse = initialPlayerName || playerName.trim();
        const validAnswers = newAnswers.filter(ans => ans !== null) as number[];
        onCreateGame(playerNameToUse, gameOptions, multiCaptcha, validAnswers);
      } else {
        setCaptchaVerified(false);
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        
        if (newAttemptCount >= 3) {
          setCaptchaError('Maximum attempts reached. Generating new problems...');
          // Auto-refresh captcha after 3 failed attempts
          setTimeout(refreshCaptcha, 2000);
        } else {
          setCaptchaError(`Some answers are incorrect. ${3 - newAttemptCount} attempts remaining.`);
          // Reset answers for retry
          setSelectedAnswers(new Array(2).fill(null));
          setCurrentProblemIndex(0);
        }
      }
    }
  };



  // Calculate progress
  const answeredCount = selectedAnswers.filter(ans => ans !== null).length;
  const progressPercentage = (answeredCount / multiCaptcha.totalProblems) * 100;

  return (
    <div className="create-game-form">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-6">

        {/* Anti-Bot Verification Section */}
        <div className={`p-4 rounded-lg border ${
          isDarkMode 
            ? 'border-neutral-600 bg-neutral-800' 
            : 'border-neutral-200 bg-white'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-medium flex items-center gap-2 ${
              isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              🤖 Strategic Mind Challenge
            </h3>
            <div className={`text-xs ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              {answeredCount}/{multiCaptcha.totalProblems} solved
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className={`w-full rounded-full h-2 ${
              isDarkMode ? 'bg-neutral-600' : 'bg-neutral-200'
            }`}>
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  captchaVerified ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <p className={`text-sm mb-4 ${
            isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
          }`}>
            {captchaMessage}
          </p>

          {/* Current Problem Display */}
          <div className="mb-4">
            {multiCaptcha.problems.length > 0 && (
              <div 
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedAnswers[currentProblemIndex] !== null
                    ? captchaVerified
                      ? isDarkMode 
                        ? 'border-green-500 bg-green-900/30' 
                        : 'border-green-300 bg-green-50'
                      : isDarkMode
                        ? 'border-red-500 bg-red-900/30'
                        : 'border-red-300 bg-red-50'
                    : isDarkMode
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    Problem {currentProblemIndex + 1} of {multiCaptcha.totalProblems}
                  </span>
                  {selectedAnswers[currentProblemIndex] !== null && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      captchaVerified 
                        ? isDarkMode
                          ? 'bg-green-800 text-green-200'
                          : 'bg-green-100 text-green-700'
                        : isDarkMode
                          ? 'bg-red-800 text-red-200'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {captchaVerified ? '✓ Correct' : 'Answered'}
                    </div>
                  )}
                </div>
                
                <div className={`text-2xl font-mono text-center mb-6 p-4 rounded ${
                  isDarkMode 
                    ? 'bg-neutral-700 text-neutral-100' 
                    : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {multiCaptcha.problems[currentProblemIndex].question}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {multiCaptcha.problems[currentProblemIndex].options.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      type="button"
                      onClick={() => handleCaptchaAnswer(currentProblemIndex, option)}
                      disabled={isCreating || selectedAnswers[currentProblemIndex] !== null}
                      className={`p-4 rounded border text-center font-medium transition-colors text-lg ${
                        selectedAnswers[currentProblemIndex] === option
                          ? captchaVerified
                            ? isDarkMode
                              ? 'bg-green-800 border-green-400 text-green-100'
                              : 'bg-green-100 border-green-500 text-green-700'
                            : isDarkMode
                              ? 'bg-red-800 border-red-400 text-red-100'
                            : 'bg-red-100 border-red-500 text-red-700'
                          : selectedAnswers[currentProblemIndex] !== null
                            ? isDarkMode
                              ? 'bg-neutral-700 border-neutral-600 text-neutral-400 cursor-not-allowed'
                              : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                            : isDarkMode
                              ? 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700'
                            : 'bg-white border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          {!captchaVerified && (
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
                disabled={currentProblemIndex === 0}
                className={`px-4 py-2 rounded border font-medium transition-colors ${
                  currentProblemIndex === 0
                    ? isDarkMode
                      ? 'bg-neutral-700 border-neutral-600 text-neutral-400 cursor-not-allowed'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                ← Prev
              </button>

              <div className={`text-sm text-center ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                {answeredCount} of {multiCaptcha.totalProblems} completed
              </div>

              <button
                type="button"
                onClick={() => setCurrentProblemIndex(Math.min(multiCaptcha.totalProblems - 1, currentProblemIndex + 1))}
                disabled={currentProblemIndex === multiCaptcha.totalProblems - 1}
                className={`px-4 py-2 rounded border font-medium transition-colors ${
                  currentProblemIndex === multiCaptcha.totalProblems - 1
                    ? isDarkMode
                      ? 'bg-neutral-700 border-neutral-600 text-neutral-400 cursor-not-allowed'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Next →
              </button>
            </div>
          )}
          
          {captchaVerified && (
            <div className={`flex items-center gap-2 text-sm mb-2 ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              {isCreating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating your game...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {successMessage}
                </>
              )}
            </div>
          )}
          
          {captchaError && (
            <div className="flex items-center justify-between">
              <p className={`text-sm ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>{captchaError}</p>
              <button
                type="button"
                onClick={refreshCaptcha}
                disabled={isCreating}
                className={`text-xs underline ${
                  isDarkMode 
                    ? 'text-neutral-400 hover:text-neutral-300' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                New Problems
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreateGameForm; 