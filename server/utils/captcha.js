/**
 * Server-side captcha validation utilities
 * Provides anti-bot protection for game creation and other sensitive operations
 */

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map();

/**
 * Simple math captcha validation
 * @param {string} question - The captcha question (e.g., "5 + 3 = ?")
 * @param {number} answer - The user's answer
 * @returns {boolean} - Whether the answer is correct
 */
function validateMathCaptcha(question, answer) {
  try {
    // Extract the math expression from the question
    const expression = question.replace(' = ?', '').trim();
    
    // Replace mathematical symbols with JavaScript operators
    const jsExpression = expression
      .replace(/×/g, '*')       // Replace × with *
      .replace(/÷/g, '/');      // Replace ÷ with /
    
    // Safely evaluate the expression (allow basic math including division)
    if (!/^[\d\s+\-*/()]+$/.test(jsExpression)) {
      return false; // Invalid characters
    }
    
    const correctAnswer = eval(jsExpression);
    return correctAnswer === answer;
  } catch (error) {
    console.error('Error validating math captcha:', error);
    return false;
  }
}

/**
 * Text-based captcha validation
 * @param {string} question - The captcha question
 * @param {string} answer - The user's answer
 * @returns {boolean} - Whether the answer is correct
 */
function validateTextCaptcha(question, answer) {
  const textChallenges = {
    "What color is the sky on a clear day?": "blue",
    "How many days are in a week?": "7",
    "What is the first letter of the alphabet?": "A",
    "What do you use to write on paper?": "pen",
    "What animal says 'meow'?": "cat"
  };
  
  const correctAnswer = textChallenges[question];
  if (!correctAnswer) {
    return false; // Unknown question
  }
  
  return correctAnswer.toLowerCase() === answer.toString().toLowerCase();
}

/**
 * Validate a captcha response
 * @param {Object} captchaData - The captcha challenge and response
 * @param {string} captchaData.question - The captcha question
 * @param {number|string} captchaData.answer - The user's answer
 * @param {string} captchaData.id - The captcha challenge ID
 * @param {number|string} userAnswer - The user's submitted answer
 * @returns {Object} - Validation result
 */
function validateCaptcha(captchaData, userAnswer) {
  if (!captchaData || !captchaData.question) {
    return {
      valid: false,
      error: 'Invalid captcha data'
    };
  }
  
  if (userAnswer === null || userAnswer === undefined) {
    return {
      valid: false,
      error: 'No answer provided'
    };
  }
  
  let isValid = false;
  
  // Determine captcha type and validate accordingly
  if (captchaData.question.includes('=')) {
    // Math captcha
    isValid = validateMathCaptcha(captchaData.question, Number(userAnswer));
  } else {
    // Text captcha
    isValid = validateTextCaptcha(captchaData.question, userAnswer);
  }
  
  return {
    valid: isValid,
    error: isValid ? null : 'Incorrect answer'
  };
}

/**
 * Validate multiple captcha responses
 * @param {Object} multiCaptchaData - The multi-captcha challenge
 * @param {Array} userAnswers - Array of user's answers
 * @returns {Object} - Validation result
 */
function validateMultiCaptcha(multiCaptchaData, userAnswers) {
  if (!multiCaptchaData || !multiCaptchaData.problems || !Array.isArray(multiCaptchaData.problems)) {
    return {
      valid: false,
      error: 'Invalid multi-captcha data'
    };
  }
  
  if (!userAnswers || !Array.isArray(userAnswers) || userAnswers.length !== multiCaptchaData.totalProblems) {
    return {
      valid: false,
      error: `Please solve all ${multiCaptchaData.totalProblems} problems`
    };
  }
  
  // Check if any answers are missing
  const missingAnswers = userAnswers.some(answer => answer === null || answer === undefined);
  if (missingAnswers) {
    return {
      valid: false,
      error: 'Please answer all math problems'
    };
  }
  
  // Validate each answer
  let correctCount = 0;
  for (let i = 0; i < multiCaptchaData.problems.length; i++) {
    const problem = multiCaptchaData.problems[i];
    const userAnswer = userAnswers[i];
    
    // Validate this individual problem
    const validation = validateCaptcha(problem, userAnswer);
    if (validation.valid) {
      correctCount++;
    }
  }
  
  const allCorrect = correctCount === multiCaptchaData.totalProblems;
  
  return {
    valid: allCorrect,
    error: allCorrect ? null : `${correctCount}/${multiCaptchaData.totalProblems} correct. Please solve all problems correctly.`
  };
}

/**
 * Rate limiting for captcha attempts
 * @param {string} identifier - Unique identifier (IP, user ID, etc.)
 * @param {boolean} success - Whether the attempt was successful
 * @returns {Object} - Rate limit status
 */
function checkRateLimit(identifier, success = null) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxAttempts = 10; // Allow more attempts on server side
  
  let record = rateLimitStore.get(identifier);
  
  if (!record) {
    record = { count: 0, lastAttempt: now, firstAttempt: now };
  }
  
  // Reset if window has passed
  if (now - record.firstAttempt > windowMs) {
    record = { count: 0, lastAttempt: now, firstAttempt: now };
  }
  
  // If this is just a check (success is null), return current status
  if (success === null) {
    const isLimited = record.count >= maxAttempts;
    return {
      isLimited,
      remaining: Math.max(0, maxAttempts - record.count),
      resetTime: record.firstAttempt + windowMs
    };
  }
  
  // Record the attempt
  if (!success) {
    record.count++;
  } else {
    // Reset on successful attempt
    record.count = 0;
    record.firstAttempt = now;
  }
  
  record.lastAttempt = now;
  rateLimitStore.set(identifier, record);
  
  const isLimited = record.count >= maxAttempts;
  return {
    isLimited,
    remaining: Math.max(0, maxAttempts - record.count),
    resetTime: record.firstAttempt + windowMs
  };
}

/**
 * Clean up old rate limit records (call periodically)
 */
function cleanupRateLimit() {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  
  for (const [identifier, record] of rateLimitStore.entries()) {
    if (now - record.firstAttempt > windowMs) {
      rateLimitStore.delete(identifier);
    }
  }
}

/**
 * Middleware for captcha validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function captchaMiddleware(req, res, next) {
  const { captcha, captchaAnswer } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check rate limiting first
  const rateLimitStatus = checkRateLimit(clientIP);
  if (rateLimitStatus.isLimited) {
    return res.status(429).json({
      error: 'Too many failed attempts. Please wait before trying again.',
      resetTime: rateLimitStatus.resetTime
    });
  }
  
  // Validate captcha
  const validation = validateCaptcha(captcha, captchaAnswer);
  
  // Record the attempt
  checkRateLimit(clientIP, validation.valid);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error || 'Captcha validation failed',
      remaining: rateLimitStatus.remaining - 1
    });
  }
  
  // Captcha is valid, proceed
  next();
}

/**
 * Enhanced game creation validation with captcha
 * @param {Object} gameData - Game creation data
 * @param {string} clientIP - Client IP address
 * @returns {Object} - Validation result
 */
function validateGameCreation(gameData, clientIP) {
  const errors = [];
  
  // Check rate limiting
  const rateLimitStatus = checkRateLimit(clientIP);
  if (rateLimitStatus.isLimited) {
    return {
      valid: false,
      error: 'Too many game creation attempts. Please wait before trying again.',
      resetTime: rateLimitStatus.resetTime
    };
  }
  
  // Validate required fields
  if (!gameData.playerName || gameData.playerName.trim().length < 4) {
    errors.push('Player name must be at least 4 characters long');
  }
  
  // Check for multi-captcha or single captcha
  const hasMultiCaptcha = gameData.multiCaptcha && gameData.captchaAnswers;
  const hasSingleCaptcha = gameData.captcha && gameData.captchaAnswer;
  
  if (!hasMultiCaptcha && !hasSingleCaptcha) {
    errors.push('Captcha verification is required');
  }
  
  // Validate multi-captcha if provided
  if (hasMultiCaptcha) {
    const captchaValidation = validateMultiCaptcha(gameData.multiCaptcha, gameData.captchaAnswers);
    if (!captchaValidation.valid) {
      errors.push(captchaValidation.error || 'Multi-captcha verification failed');
      // Record failed attempt
      checkRateLimit(clientIP, false);
    } else {
      // Record successful attempt
      checkRateLimit(clientIP, true);
    }
  }
  // Validate single captcha if provided (backward compatibility)
  else if (hasSingleCaptcha) {
    const captchaValidation = validateCaptcha(gameData.captcha, gameData.captchaAnswer);
    if (!captchaValidation.valid) {
      errors.push(captchaValidation.error || 'Captcha verification failed');
      // Record failed attempt
      checkRateLimit(clientIP, false);
    } else {
      // Record successful attempt
      checkRateLimit(clientIP, true);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    error: errors.length > 0 ? errors[0] : null
  };
}

// Clean up rate limit records every 10 minutes
setInterval(cleanupRateLimit, 10 * 60 * 1000);

module.exports = {
  validateCaptcha,
  validateMultiCaptcha,
  validateMathCaptcha,
  validateTextCaptcha,
  checkRateLimit,
  captchaMiddleware,
  validateGameCreation,
  cleanupRateLimit
}; 