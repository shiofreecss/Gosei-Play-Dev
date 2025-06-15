import React, { useState } from 'react';
import { 
  generateMultiMathCaptcha, 
  validateMultiCaptcha, 
  MultiCaptchaChallenge 
} from '../utils/captcha';
import { useAppTheme } from '../context/AppThemeContext';

const MultiCaptchaDemo: React.FC = () => {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [multiCaptcha, setMultiCaptcha] = useState<MultiCaptchaChallenge>(() => generateMultiMathCaptcha(2));
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(2).fill(null));
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);

  // Fun validation messages
  const validationMessages = {
    success: [
      "🎉 Phenomenal! You've conquered all challenges like a true Go grandmaster!",
      "⭐ Spectacular! Your mathematical prowess is unmatched!",
      "🏆 Victory! You've proven your strategic superiority!",
      "🔥 Flawless execution! Your mind is sharper than any blade!",
      "💎 Perfection achieved! You're ready to dominate the board!",
      "🚀 Mind-blowing! Your intellect reaches new heights!"
    ],
    partial: [
      "🤔 Close, but not quite there yet! Keep pushing your limits!",
      "💪 Good effort! A true strategist learns from every attempt!",
      "🎯 Almost there! Your potential is showing!",
      "⚡ Nice try! Even masters need practice!",
      "🧠 Getting warmer! Your brain is heating up!"
    ]
  };

  const handleAnswerSelect = (problemIndex: number, answer: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[problemIndex] = answer;
    setSelectedAnswers(newAnswers);
    
    // Clear previous validation
    setValidationResult(null);
    setIsVerified(false);

    // Auto-advance to next problem if not the last one
    if (problemIndex < multiCaptcha.totalProblems - 1) {
      setTimeout(() => {
        setCurrentProblemIndex(problemIndex + 1);
      }, 500); // Small delay to show the selection
    }
  };

  const handleValidate = () => {
    const validation = validateMultiCaptcha(multiCaptcha, selectedAnswers);
    
    if (validation.isValid) {
      const randomSuccess = validationMessages.success[Math.floor(Math.random() * validationMessages.success.length)];
      setValidationResult(randomSuccess);
      setIsVerified(true);
    } else {
      const randomPartial = validationMessages.partial[Math.floor(Math.random() * validationMessages.partial.length)];
      setValidationResult(`${randomPartial} ${validation.error}`);
      setIsVerified(false);
    }
  };

  const handleRefresh = () => {
    setMultiCaptcha(generateMultiMathCaptcha(2));
    setSelectedAnswers(new Array(2).fill(null));
    setValidationResult(null);
    setIsVerified(false);
    setCurrentProblemIndex(0);
  };

  const answeredCount = selectedAnswers.filter(ans => ans !== null).length;
  const progressPercentage = (answeredCount / 2) * 100;

  return (
    <div className={`max-w-4xl mx-auto p-6 rounded-lg shadow-lg ${
      isDarkMode 
        ? 'bg-neutral-800 text-neutral-100' 
        : 'bg-white text-neutral-900'
    }`}>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${
              isDarkMode ? 'text-neutral-100' : 'text-neutral-900'
            }`}>🧠 Strategic Mind Arena</h2>
            <p className={`${
              isDarkMode ? 'text-neutral-300' : 'text-gray-600'
            }`}>
              🎯 Ready to prove your mental prowess? Solve these 4 math challenges to demonstrate you're a worthy Go player! 
              This demo shows our enhanced captcha system that separates true strategists from automated opponents.
            </p>
          </div>
          
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode
                ? 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-neutral-200' : 'text-neutral-700'
          }`}>Progress</span>
          <span className={`text-sm ${
            isDarkMode ? 'text-neutral-400' : 'text-gray-500'
          }`}>{answeredCount}/4 solved</span>
        </div>
        <div className={`w-full rounded-full h-3 ${
          isDarkMode ? 'bg-neutral-700' : 'bg-gray-200'
        }`}>
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isVerified ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Current Problem Display */}
      <div className="mb-6">
        {multiCaptcha.problems.length > 0 && (
          <div 
            className={`p-6 rounded-lg border-2 transition-all ${
              selectedAnswers[currentProblemIndex] !== null
                ? isVerified
                  ? isDarkMode
                    ? 'border-green-500 bg-green-900/30'
                    : 'border-green-300 bg-green-50'
                  : isDarkMode
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-blue-300 bg-blue-50'
                : isDarkMode
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-blue-300 bg-blue-50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-lg font-medium ${
                isDarkMode ? 'text-neutral-300' : 'text-gray-600'
              }`}>
                Problem {currentProblemIndex + 1} of {multiCaptcha.totalProblems}
              </span>
              {selectedAnswers[currentProblemIndex] !== null && (
                <div className={`text-sm px-3 py-1 rounded ${
                  isVerified 
                    ? isDarkMode 
                      ? 'bg-green-800 text-green-200' 
                      : 'bg-green-100 text-green-700'
                    : isDarkMode
                      ? 'bg-blue-800 text-blue-200'
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {isVerified ? '✓ Correct' : 'Answered'}
                </div>
              )}
            </div>
            
            <div className={`text-3xl font-mono text-center mb-6 p-6 rounded border ${
              isDarkMode 
                ? 'bg-neutral-800 text-neutral-200 border-neutral-600' 
                : 'bg-white text-neutral-800 border-neutral-300'
            }`}>
              {multiCaptcha.problems[currentProblemIndex].question}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {multiCaptcha.problems[currentProblemIndex].options.map((option, optionIndex) => (
                <button
                  key={optionIndex}
                  onClick={() => handleAnswerSelect(currentProblemIndex, option)}
                  disabled={selectedAnswers[currentProblemIndex] !== null}
                  className={`p-4 rounded border text-center font-medium transition-colors text-xl ${
                    selectedAnswers[currentProblemIndex] === option
                      ? isVerified
                        ? isDarkMode
                          ? 'bg-green-800 border-green-500 text-green-200'
                          : 'bg-green-100 border-green-500 text-green-700'
                        : isDarkMode
                          ? 'bg-blue-800 border-blue-500 text-blue-200'
                          : 'bg-blue-100 border-blue-500 text-blue-700'
                      : selectedAnswers[currentProblemIndex] !== null
                        ? isDarkMode
                          ? 'bg-neutral-700 border-neutral-600 text-neutral-500 cursor-not-allowed'
                          : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                        : isDarkMode
                          ? 'bg-neutral-800 border-neutral-600 hover:bg-neutral-700 text-neutral-200'
                          : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
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
      {!isVerified && (
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
            disabled={currentProblemIndex === 0}
            className={`px-6 py-3 rounded border font-medium transition-colors ${
              currentProblemIndex === 0
                ? isDarkMode
                  ? 'bg-neutral-700 border-neutral-600 text-neutral-500 cursor-not-allowed'
                  : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ← Previous
          </button>

          <div className={`text-lg font-medium ${
            isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
          }`}>
            {answeredCount} of {multiCaptcha.totalProblems} completed
          </div>

          <button
            onClick={() => setCurrentProblemIndex(Math.min(multiCaptcha.totalProblems - 1, currentProblemIndex + 1))}
            disabled={currentProblemIndex === multiCaptcha.totalProblems - 1}
            className={`px-6 py-3 rounded border font-medium transition-colors ${
              currentProblemIndex === multiCaptcha.totalProblems - 1
                ? isDarkMode
                  ? 'bg-neutral-700 border-neutral-600 text-neutral-500 cursor-not-allowed'
                  : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Validation Result */}
      {validationResult && (
        <div className={`mb-4 p-4 rounded-lg border ${
          isVerified 
            ? isDarkMode
              ? 'bg-green-900/30 border-green-500 text-green-300'
              : 'bg-green-100 border-green-200 text-green-700'
            : isDarkMode
              ? 'bg-red-900/30 border-red-500 text-red-300'
              : 'bg-red-100 border-red-200 text-red-700'
        }`}>
          {validationResult}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={handleValidate}
          disabled={answeredCount < 4}
          className={`px-6 py-3 font-medium rounded-lg transition-colors text-white ${
            answeredCount < 4
              ? isDarkMode
                ? 'bg-neutral-600 cursor-not-allowed'
                : 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Validate Answers
        </button>
        
        <button
          onClick={handleRefresh}
          className={`px-6 py-3 font-medium rounded-lg transition-colors text-white ${
            isDarkMode 
              ? 'bg-neutral-600 hover:bg-neutral-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          New Problems
        </button>
      </div>

      {/* Debug Info */}
      <div className={`mt-8 p-4 rounded-lg ${
        isDarkMode ? 'bg-neutral-700' : 'bg-gray-100'
      }`}>
        <h3 className={`font-bold mb-2 ${
          isDarkMode ? 'text-neutral-200' : 'text-neutral-800'
        }`}>Debug Information:</h3>
        <div className={`text-sm space-y-1 ${
          isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
        }`}>
          <div><strong>Captcha ID:</strong> {multiCaptcha.id}</div>
          <div><strong>Total Problems:</strong> {multiCaptcha.totalProblems}</div>
          <div><strong>Current Problem:</strong> {currentProblemIndex + 1}</div>
          <div><strong>Selected Answers:</strong> [{selectedAnswers.map(ans => ans ?? 'null').join(', ')}]</div>
          <div><strong>Correct Answers:</strong> [{multiCaptcha.problems.map(p => p.answer).join(', ')}]</div>
          <div><strong>Progress:</strong> {answeredCount}/{multiCaptcha.totalProblems} ({progressPercentage.toFixed(1)}%)</div>
        </div>
      </div>
    </div>
  );
};

export default MultiCaptchaDemo; 