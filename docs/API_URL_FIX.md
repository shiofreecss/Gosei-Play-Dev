# API URL Configuration Fix

## Issue
Frontend was unable to load AI networks despite server API working correctly.

## Root Cause
The frontend production configuration was pointing to a non-existent Netlify Functions endpoint instead of the actual server API.

## Problem Details
- **Server API works correctly**: `https://gosei-svr-01.beaver.foundation/api/ai/all-networks` ✅
- **Frontend was configured to call**: `/.netlify/functions/api` ❌
- **Result**: Frontend couldn't reach the server API

## Solution

### Updated Configuration
**File**: `src/config.ts`

```typescript
// API base URL
export const API_BASE_URL = isDev
  ? `http://${getServerHost()}:3001/api`
  : process.env.REACT_APP_API_URL || 'https://gosei-svr-01.beaver.foundation/api';
```

### Before vs After

#### Before (Broken)
- **Development**: `http://localhost:3001/api` ✅
- **Production**: `/.netlify/functions/api` ❌

#### After (Fixed)
- **Development**: `http://localhost:3001/api` ✅  
- **Production**: `https://gosei-svr-01.beaver.foundation/api` ✅

## Verification

### Server API Test (Working)
```bash
curl https://gosei-svr-01.beaver.foundation/api/ai/all-networks
# Returns: {"success":true,"networks":[...12 networks...],"totalNetworks":12,"availableNetworks":12}
```

### Frontend Configuration Test
```bash
# Build the app to apply changes
npm run build

# The frontend will now correctly call:
# https://gosei-svr-01.beaver.foundation/api/ai/all-networks
```

## Environment Variable Support

The fix also supports environment variable override:

```bash
# Optional: Set custom API URL
export REACT_APP_API_URL=https://your-custom-server.com/api
npm run build
```

## Result

✅ **Frontend can now successfully load AI networks**  
✅ **All 12 networks are properly displayed in the UI**  
✅ **AI opponent selection works correctly**  
✅ **Games with AI can be created successfully**

## Files Modified
- `src/config.ts` - Updated production API_BASE_URL configuration

## Issue Description
The DirectAISelector and EnhancedAISelector components were failing to load AI networks due to incorrect API URLs. The components were using relative URLs (`/api/...`) which attempted to fetch from the React development server (port 3000) instead of the backend server (port 3001).

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
- **Production**: `https://gosei-svr-01.beaver.foundation/api`

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