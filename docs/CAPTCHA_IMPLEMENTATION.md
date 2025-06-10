# Captcha Implementation for Gosei Play

This document describes the anti-scraping captcha system implemented for game creation in Gosei Play.

## Overview

The captcha system provides protection against automated bot attacks and scraping attempts while maintaining a good user experience. It includes both client-side and server-side validation with rate limiting.

## Features

### 1. Multiple Captcha Types
- **Math Captcha**: Simple arithmetic problems (addition, subtraction, multiplication)
- **Text Captcha**: Basic knowledge questions (colors, numbers, common facts)
- **Random Selection**: Automatically chooses between types (70% math, 30% text)

### 2. Rate Limiting
- **Client-side**: 5 failed attempts per 5-minute window
- **Server-side**: 10 failed attempts per 5-minute window
- **IP-based tracking**: Prevents abuse from single sources
- **Automatic cleanup**: Old records are cleaned up periodically

### 3. User Experience
- **Visual feedback**: Clear success/error states
- **Auto-refresh**: New captcha after wrong answers
- **Accessibility**: Simple, readable challenges
- **Mobile-friendly**: Touch-optimized interface

## Implementation

### Client-Side Components

#### 1. Captcha Utilities (`src/utils/captcha.ts`)
```typescript
// Generate a new captcha challenge
const captcha = generateCaptcha('math'); // or 'text' or 'random'

// Verify user's answer with rate limiting
const validation = await verifyCaptcha(captcha, userAnswer, 'user_id');
```

#### 2. CreateGameForm Component (`src/components/CreateGameForm.tsx`)
- Integrated captcha verification in game creation flow
- Real-time validation feedback
- Prevents submission until captcha is solved

#### 3. Demo Component (`src/components/CaptchaDemo.tsx`)
- Standalone demo for testing captcha functionality
- Shows rate limiting behavior
- Useful for development and testing

### Server-Side Validation

#### 1. Captcha Utilities (`server/utils/captcha.js`)
```javascript
// Validate game creation with captcha
const validation = validateGameCreation({
  playerName: 'Player Name',
  captcha: captchaChallenge,
  captchaAnswer: userAnswer
}, clientIP);
```

#### 2. Socket Event Handler
- Validates captcha before creating games
- Implements IP-based rate limiting
- Returns detailed error messages

## Usage

### Basic Integration

1. **Import the utilities**:
```typescript
import { generateCaptcha, verifyCaptcha } from '../utils/captcha';
```

2. **Generate a challenge**:
```typescript
const [captcha, setCaptcha] = useState(generateCaptcha('math'));
```

3. **Verify the answer**:
```typescript
const validation = await verifyCaptcha(captcha, userAnswer);
if (validation.isValid) {
  // Proceed with action
} else {
  // Show error message
}
```

### Game Creation Flow

1. User enters their name
2. User solves the captcha challenge
3. Client validates the captcha locally
4. Form submission includes captcha data
5. Server validates captcha and rate limits
6. Game is created if validation passes

## Configuration

### Rate Limiting Settings

**Client-side** (`src/utils/captcha.ts`):
```typescript
private readonly maxAttempts = 5;
private readonly windowMs = 5 * 60 * 1000; // 5 minutes
```

**Server-side** (`server/utils/captcha.js`):
```javascript
const maxAttempts = 10; // Allow more attempts on server side
const windowMs = 5 * 60 * 1000; // 5 minutes
```

### Captcha Difficulty

**Math Captcha**:
- Addition: 1-20 + 1-20
- Subtraction: 10-30 - 1-29
- Multiplication: 2-9 × 2-9

**Text Captcha**:
- Simple knowledge questions
- Single-word answers
- Case-insensitive matching

## Security Considerations

### 1. Rate Limiting
- Prevents brute force attacks
- IP-based tracking
- Exponential backoff could be added

### 2. Validation
- Both client and server validation
- Server has final authority
- Captcha challenges are not reusable

### 3. Data Protection
- No sensitive data in captcha challenges
- Minimal data collection
- Automatic cleanup of old records

## Testing

### Manual Testing
1. Use the CaptchaDemo component
2. Test correct and incorrect answers
3. Verify rate limiting behavior
4. Test different captcha types

### Automated Testing
```typescript
// Test captcha generation
const captcha = generateCaptcha('math');
expect(captcha.question).toContain('=');
expect(captcha.options).toHaveLength(4);

// Test validation
const validation = validateCaptcha(captcha, captcha.answer);
expect(validation.isValid).toBe(true);
```

## Future Enhancements

### 1. Additional Captcha Types
- Image-based challenges
- Audio captchas for accessibility
- Drag-and-drop puzzles

### 2. Advanced Rate Limiting
- Progressive delays
- IP reputation scoring
- Geographic restrictions

### 3. Analytics
- Success/failure rates
- Performance metrics
- Bot detection patterns

### 4. Accessibility
- Screen reader support
- High contrast mode
- Keyboard navigation

## Troubleshooting

### Common Issues

1. **Captcha not loading**
   - Check console for JavaScript errors
   - Verify captcha utility imports

2. **Rate limiting too aggressive**
   - Adjust maxAttempts in configuration
   - Check IP detection logic

3. **Server validation failing**
   - Verify captcha data is sent correctly
   - Check server logs for validation errors

### Debug Mode

Enable debug logging:
```typescript
// Client-side
localStorage.setItem('captcha-debug', 'true');

// Server-side
const DEBUG_CAPTCHA = process.env.DEBUG_CAPTCHA === 'true';
```

## Performance

### Client-Side
- Minimal bundle size impact (~5KB)
- No external dependencies
- Efficient rate limiting storage

### Server-Side
- In-memory rate limiting (suitable for single instance)
- For production clusters, consider Redis
- Automatic cleanup prevents memory leaks

## Compliance

### GDPR/Privacy
- No personal data collection
- IP addresses used only for rate limiting
- Data automatically expires

### Accessibility
- Simple, clear challenges
- No complex visual elements
- Keyboard accessible

## Conclusion

This captcha implementation provides effective anti-scraping protection while maintaining excellent user experience. The dual-layer validation (client + server) ensures security while the rate limiting prevents abuse. The system is designed to be maintainable, testable, and easily extensible for future requirements. 