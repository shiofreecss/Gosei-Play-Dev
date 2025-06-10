export interface CaptchaChallenge {
  question: string;
  answer: number;
  options: number[];
  id: string;
}

export interface MultiCaptchaChallenge {
  problems: CaptchaChallenge[];
  id: string;
  totalProblems: number;
}

export interface CaptchaValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Generates a simple math captcha challenge
 * @returns CaptchaChallenge object with question, answer, and multiple choice options
 */
export const generateMathCaptcha = (): CaptchaChallenge => {
  const operations = ['+', '-', '×', '÷'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1: number, num2: number, answer: number;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 30) + 10;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
      break;
    case '×':
      num1 = Math.floor(Math.random() * 9) + 2;
      num2 = Math.floor(Math.random() * 9) + 2;
      answer = num1 * num2;
      break;
    case '÷':
      // Generate division that results in whole numbers
      answer = Math.floor(Math.random() * 12) + 2; // 2-13
      num2 = Math.floor(Math.random() * 8) + 2; // 2-9
      num1 = answer * num2; // Ensure whole number result
      break;
    default:
      num1 = 5;
      num2 = 3;
      answer = 8;
  }
  
  const question = `${num1} ${operation} ${num2} = ?`;
  
  // Generate 3 wrong options and 1 correct option
  const wrongOptions: number[] = [];
  for (let i = 0; i < 3; i++) {
    let wrongAnswer: number;
    do {
      wrongAnswer = answer + Math.floor(Math.random() * 20) - 10;
    } while (wrongAnswer === answer || wrongAnswer < 0 || wrongOptions.includes(wrongAnswer));
    wrongOptions.push(wrongAnswer);
  }
  
  // Shuffle options
  const options = [answer, ...wrongOptions].sort(() => Math.random() - 0.5);
  
  return {
    question,
    answer,
    options,
    id: `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

/**
 * Generates multiple math captcha challenges
 * @param count Number of problems to generate (default: 4)
 * @returns MultiCaptchaChallenge object with multiple problems
 */
export const generateMultiMathCaptcha = (count: number = 4): MultiCaptchaChallenge => {
  const problems: CaptchaChallenge[] = [];
  
  for (let i = 0; i < count; i++) {
    // Add a small delay to ensure unique IDs
    setTimeout(() => {}, i);
    problems.push(generateMathCaptcha());
  }
  
  return {
    problems,
    id: `multi_captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    totalProblems: count
  };
};

/**
 * Generates a simple text-based captcha challenge
 * @returns CaptchaChallenge object with a text recognition challenge
 */
export const generateTextCaptcha = (): CaptchaChallenge => {
  const challenges = [
    {
      question: "What color is the sky on a clear day?",
      answer: "blue",
      wrongAnswers: ["red", "green", "yellow"]
    },
    {
      question: "How many days are in a week?",
      answer: "7",
      wrongAnswers: ["5", "6", "8"]
    },
    {
      question: "What is the first letter of the alphabet?",
      answer: "A",
      wrongAnswers: ["B", "C", "Z"]
    },
    {
      question: "What do you use to write on paper?",
      answer: "pen",
      wrongAnswers: ["spoon", "hammer", "shoe"]
    },
    {
      question: "What animal says 'meow'?",
      answer: "cat",
      wrongAnswers: ["dog", "cow", "bird"]
    }
  ];
  
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  const options = [challenge.answer, ...challenge.wrongAnswers].sort(() => Math.random() - 0.5);
  
  return {
    question: challenge.question,
    answer: challenge.answer as any, // Will be compared as string
    options: options as any,
    id: `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

/**
 * Validates a captcha response
 * @param challenge The original captcha challenge
 * @param userAnswer The user's selected answer
 * @returns CaptchaValidation result
 */
export const validateCaptcha = (challenge: CaptchaChallenge, userAnswer: number | string): CaptchaValidation => {
  if (userAnswer === null || userAnswer === undefined) {
    return {
      isValid: false,
      error: 'Please select an answer'
    };
  }
  
  const isCorrect = userAnswer === challenge.answer;
  
  return {
    isValid: isCorrect,
    error: isCorrect ? undefined : 'Incorrect answer. Please try again.'
  };
};

/**
 * Validates multiple captcha responses
 * @param multiChallenge The original multi-captcha challenge
 * @param userAnswers Array of user's answers
 * @returns CaptchaValidation result
 */
export const validateMultiCaptcha = (multiChallenge: MultiCaptchaChallenge, userAnswers: (number | null)[]): CaptchaValidation => {
  if (!userAnswers || userAnswers.length !== multiChallenge.totalProblems) {
    return {
      isValid: false,
      error: `Please solve all ${multiChallenge.totalProblems} problems`
    };
  }
  
  // Check if any answers are missing
  const missingAnswers = userAnswers.some(answer => answer === null || answer === undefined);
  if (missingAnswers) {
    return {
      isValid: false,
      error: 'Please answer all math problems'
    };
  }
  
  // Validate each answer
  let correctCount = 0;
  for (let i = 0; i < multiChallenge.problems.length; i++) {
    const problem = multiChallenge.problems[i];
    const userAnswer = userAnswers[i];
    
    if (userAnswer === problem.answer) {
      correctCount++;
    }
  }
  
  const allCorrect = correctCount === multiChallenge.totalProblems;
  
  return {
    isValid: allCorrect,
    error: allCorrect ? undefined : `${correctCount}/${multiChallenge.totalProblems} correct. Please solve all problems correctly.`
  };
};

/**
 * Rate limiting for captcha attempts
 */
class CaptchaRateLimit {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Check if an IP/identifier is rate limited
   * @param identifier Unique identifier (IP address, user ID, etc.)
   * @returns boolean indicating if rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      return false;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.delete(identifier);
      return false;
    }
    
    return record.count >= this.maxAttempts;
  }
  
  /**
   * Record a captcha attempt
   * @param identifier Unique identifier
   * @param success Whether the attempt was successful
   */
  recordAttempt(identifier: string, success: boolean): void {
    const now = Date.now();
    const record = this.attempts.get(identifier) || { count: 0, lastAttempt: now };
    
    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      record.count = 0;
    }
    
    // Only increment on failed attempts
    if (!success) {
      record.count++;
    } else {
      // Reset on successful attempt
      record.count = 0;
    }
    
    record.lastAttempt = now;
    this.attempts.set(identifier, record);
  }
  
  /**
   * Get remaining attempts for an identifier
   * @param identifier Unique identifier
   * @returns number of remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) {
      return this.maxAttempts;
    }
    
    const now = Date.now();
    if (now - record.lastAttempt > this.windowMs) {
      return this.maxAttempts;
    }
    
    return Math.max(0, this.maxAttempts - record.count);
  }
}

// Export a singleton instance for client-side rate limiting
export const captchaRateLimit = new CaptchaRateLimit();

/**
 * Enhanced captcha generator that can switch between different types
 * @param type Type of captcha to generate ('math' | 'text' | 'random')
 * @returns CaptchaChallenge
 */
export const generateCaptcha = (type: 'math' | 'text' | 'random' = 'math'): CaptchaChallenge => {
  if (type === 'random') {
    type = Math.random() < 0.7 ? 'math' : 'text'; // Prefer math captchas
  }
  
  switch (type) {
    case 'text':
      return generateTextCaptcha();
    case 'math':
    default:
      return generateMathCaptcha();
  }
};

/**
 * Client-side captcha verification with rate limiting
 * @param challenge The captcha challenge
 * @param userAnswer User's answer
 * @param identifier Unique identifier for rate limiting (optional)
 * @returns Promise<CaptchaValidation>
 */
export const verifyCaptcha = async (
  challenge: CaptchaChallenge, 
  userAnswer: number | string,
  identifier: string = 'anonymous'
): Promise<CaptchaValidation> => {
  // Check rate limiting
  if (captchaRateLimit.isRateLimited(identifier)) {
    return {
      isValid: false,
      error: `Too many failed attempts. Please wait ${Math.ceil(5)} minutes before trying again.`
    };
  }
  
  // Validate the captcha
  const validation = validateCaptcha(challenge, userAnswer);
  
  // Record the attempt
  captchaRateLimit.recordAttempt(identifier, validation.isValid);
  
  // Add remaining attempts info for failed attempts
  if (!validation.isValid) {
    const remaining = captchaRateLimit.getRemainingAttempts(identifier);
    if (remaining <= 2 && remaining > 0) {
      validation.error += ` (${remaining} attempts remaining)`;
    }
  }
  
  return validation;
}; 