# API URL Configuration Fix

## Issue Description
The DirectAISelector and EnhancedAISelector components were failing to load AI networks due to incorrect API URLs. The components were using relative URLs (`/api/...`) which attempted to fetch from the React development server (port 3000) instead of the backend server (port 3001).

## Root Cause
- React development server runs on port 3000
- Backend API server runs on port 3001
- Components were using relative URLs without proper configuration
- No proxy was configured to forward API requests

## Solution
Fixed by using the existing `API_BASE_URL` configuration from `src/config.ts` which properly handles development vs production environments.

### Changes Made

#### 1. DirectAISelector.tsx
```typescript
// Added import
import { API_BASE_URL } from '../config';

// Fixed fetch URL
const response = await fetch(`${API_BASE_URL}/ai/all-networks`);
```

#### 2. EnhancedAISelector.tsx
```typescript
// Added import
import { API_BASE_URL } from '../config';

// Fixed fetch URL
const response = await fetch(`${API_BASE_URL}/ai/opponents/${rank}`);
```

## Configuration Details
The `API_BASE_URL` from `src/config.ts` provides:
- **Development**: `http://localhost:3001/api` (or LAN IP when applicable)
- **Production**: `/.netlify/functions/api`

## Verification
Both API endpoints now work correctly:

### All Networks Endpoint
```bash
curl http://localhost:3001/api/ai/all-networks
```
Returns 12 networks from beginner (1071.5 Elo) to professional (3050.2 Elo).

### Rank-based Opponents Endpoint
```bash
curl http://localhost:3001/api/ai/opponents/5k
```
Returns easy/equal/hard opponents for specified rank.

## Result
- DirectAISelector now loads all available networks correctly
- EnhancedAISelector continues to work with rank-based selection
- Both components use proper environment-aware API configuration
- No more "Failed to load AI networks" errors

## Files Modified
- `src/components/DirectAISelector.tsx` - Added API_BASE_URL import and usage
- `src/components/EnhancedAISelector.tsx` - Added API_BASE_URL import and usage

## Related Configuration
- `src/config.ts` - Contains the API_BASE_URL configuration used by both components 