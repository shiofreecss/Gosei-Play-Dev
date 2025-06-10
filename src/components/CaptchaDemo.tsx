import React, { useState } from 'react';
import { generateCaptcha, verifyCaptcha, CaptchaChallenge } from '../utils/captcha';

const CaptchaDemo: React.FC = () => {
  const [captcha, setCaptcha] = useState<CaptchaChallenge>(generateCaptcha('math'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha('random'));
    setSelectedAnswer(null);
    setResult('');
  };

  const handleAnswer = async (answer: number) => {
    setSelectedAnswer(answer);
    setAttempts(prev => prev + 1);
    
    const validation = await verifyCaptcha(captcha, answer, 'demo_user');
    
    if (validation.isValid) {
      setResult('✅ Correct! Captcha verified successfully.');
    } else {
      setResult(`❌ ${validation.error}`);
      // Auto-refresh after wrong answer
      setTimeout(refreshCaptcha, 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Captcha Demo</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Solve this problem:</p>
        <div className="text-xl font-mono bg-gray-100 p-3 rounded text-center">
          {captcha.question}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        {captcha.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option)}
            className={`p-2 rounded border font-medium transition-colors ${
              selectedAnswer === option
                ? result.includes('✅')
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : 'bg-red-100 border-red-500 text-red-700'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      
      {result && (
        <div className={`p-3 rounded mb-4 ${
          result.includes('✅') 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {result}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <button
          onClick={refreshCaptcha}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          New Challenge
        </button>
        <span className="text-sm text-gray-500">
          Attempts: {attempts}
        </span>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <strong>Demo Info:</strong> This demonstrates the captcha system with rate limiting. 
        Try answering incorrectly multiple times to see rate limiting in action.
      </div>
    </div>
  );
};

export default CaptchaDemo; 