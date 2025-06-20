# Enhanced AI UI Integration

## Overview

This document describes the Enhanced AI UI integration that allows users to create games with specific AI model selection based on their playing strength.

## New Components

### 1. Enhanced AI Selector (`src/components/EnhancedAISelector.tsx`)

A sophisticated UI component that:
- Allows users to select their playing rank (15k to 6d)
- Dynamically loads appropriate AI opponents from the server
- Shows three difficulty levels: Easy, Equal, Hard
- Displays network information (Elo rating, playing strength)
- Provides performance warnings for different board sizes
- Handles loading states and error fallbacks

### 2. Updated Game Creation Flow

- Integrated into HomePage game creation settings
- Replaces the old simple AI difficulty selector
- Connects to the enhanced AI manager on the server
- Stores selections in localStorage for persistence

## API Endpoints

### `/api/ai/opponents/:rank`
Returns available AI opponents for a given human player rank.

**Example Response:**
```json
[
  {
    "strength": "easy",
    "network": {
      "file": "kata1-b6c96-s1995008-d1329786.txt",
      "elo": 1071.5,
      "level": "Beginner",
      "rank": "8k-7k"
    },
    "description": "Weaker opponent (Beginner)",
    "available": true
  },
  {
    "strength": "equal",
    "network": {
      "file": "kata1-b6c96-s5214720-d1690538.txt",
      "elo": 1611.3,
      "level": "Mid Normal",
      "rank": "5k-4k"
    },
    "description": "Equal strength (Mid Normal)",
    "available": true
  },
  {
    "strength": "hard",
    "network": {
      "file": "kata1-b6c96-s8080640-d1961030.txt",
      "elo": 1862.5,
      "level": "Very Strong Normal",
      "rank": "2k-1k"
    },
    "description": "Stronger opponent (Very Strong Normal)",
    "available": true
  }
]
```

### Other AI Endpoints
- `/api/ai/networks` - List all available networks
- `/api/ai/test-selection/:rank/:strength` - Test network selection
- `/api/ai/create-game` - Create AI game with specific network

## Enhanced Features

### 1. Intelligent Network Selection
- **Easy**: Selects networks 2-3 steps weaker than player rank
- **Equal**: Selects networks matching player rank  
- **Hard**: Selects networks 2-3 steps stronger than player rank

### 2. Elo-Based Organization
Networks are organized by Elo rating ranges:
- **Beginner**: 1000-1500 Elo
- **Normal**: 1500-1900 Elo  
- **Dan**: 1941-2400 Elo
- **Pro**: 2545-3050 Elo

### 3. Board Size Performance Optimization
- **9x9**: Optimal performance
- **13x13**: Good performance (3-15 seconds per move)
- **19x19**: Slower but playable (10-30 seconds per move)
- **>19x19**: AI not supported

### 4. Fallback System
If server connection fails, the component generates client-side fallback opponents to ensure functionality.

### 5. Dark Mode Support
- **Adaptive Styling**: All components support both light and dark themes
- **Selected State Colors**: 
  - Easy: Green borders/backgrounds with proper contrast
  - Equal: Blue borders/backgrounds with proper contrast  
  - Hard: Red borders/backgrounds with proper contrast
- **Hover States**: Subtle hover effects that work in both themes
- **Text Contrast**: Proper text colors for accessibility in all modes

## Storage Keys

New localStorage keys added:
- `