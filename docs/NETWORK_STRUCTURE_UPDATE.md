# Network Structure Update - Ubuntu Script Alignment

## Overview
Updated the Ubuntu network setup script (`u00-ubuntu-setup-all-networks.sh`) to match the Windows batch files (`w01-download-networks.bat` and `w02-extract-all-networks.bat`) for consistency across platforms.

## Key Changes Made

### 1. Directory Structure Change
**Changed**: `expert` → `pro`
- **Before**: `networks/expert/` 
- **After**: `networks/pro/`

This aligns with the Windows batch files and provides clearer naming for professional-level networks.

### 2. Network Count Reduction
**Changed**: 14 networks → 12 networks
- **Before**: 14 total networks across 4 categories
- **After**: 12 total networks across 4 categories

### 3. Category Reorganization by Elo Ranges

#### Before (14 networks):
- **Beginner (10k-8k)**: 2 networks
  - `kata1-b6c96-s1248000-d550347.txt.gz` (483.6 Elo)
  - `kata1-b6c96-s938496-d1208807.txt.gz` (800.8 Elo)
- **Intermediate Beginner (8k-5k)**: 2 networks  
- **Normal (5k-1k)**: 3 networks
- **Dan (1d-4d)**: 4 networks
- **Expert (5d+)**: 3 networks

#### After (12 networks):
- **Beginner (1000-1500 Elo)**: 1 network
  - `kata1-b6c96-s1995008-d1329786.txt.gz` (1071.5 Elo - 8k-7k)
- **Normal (1500-1900 Elo)**: 4 networks
  - `kata1-b6c96-s4136960-d1510003.txt.gz` (1539.5 Elo - 6k-5k)
  - `kata1-b6c96-s5214720-d1690538.txt.gz` (1611.3 Elo - 5k-4k)
  - `kata1-b6c96-s6127360-d1754797.txt.gz` (1711.0 Elo - 4k-3k)
  - `kata1-b6c96-s8080640-d1961030.txt.gz` (1862.5 Elo - 2k-1k)
- **Dan (1941-2400 Elo)**: 4 networks
  - `kata1-b6c96-s8982784-d2082583.txt.gz` (1941.4 Elo - 1d)
  - `kata1-b6c96-s10014464-d2201128.txt.gz` (2113.0 Elo - 2d)
  - `kata1-b6c96-s10825472-d2300510.txt.gz` (2293.5 Elo - 3d)
  - `kata1-b6c96-s11888896-d2416753.txt.gz` (2398.4 Elo - 4d)
- **Pro (2545-3050 Elo)**: 3 networks
  - `kata1-b6c96-s12849664-d2510774.txt.gz` (2545.2 Elo - 5d)
  - `kata1-b6c96-s13733120-d2631546.txt.gz` (2849.0 Elo - 6d+)
  - `kata1-b6c96-s175395328-d26788732.txt.gz` (3050.2 Elo - Professional)

### 4. Removed Networks
The following weaker networks were removed to focus on more practical playing strengths:
- `kata1-b6c96-s1248000-d550347.txt.gz` (483.6 Elo)
- `kata1-b6c96-s938496-d1208807.txt.gz` (800.8 Elo)

## Files Updated

### 1. Ubuntu Setup Script
**File**: `server/katago/u00-ubuntu-setup-all-networks.sh`
- Updated directory creation from `expert` to `pro`
- Reorganized network downloads by Elo ranges
- Updated network count from 13 to 12
- Updated disk space calculations
- Updated network organization descriptions

### 2. AI Game API
**File**: `server/api/ai-game-api.js`
- Changed `expert` to `pro` in network categories

### 3. Legacy AI Manager  
**File**: `server/managers/ai-game-manager.js`
- Updated settings key from `expert` to `pro` for consistency

## Benefits of This Update

### 1. **Platform Consistency**
- Ubuntu and Windows now use identical network structures
- Same directory names and organization across platforms
- Consistent Elo ranges and network selection

### 2. **Simplified Network Selection**
- Clearer Elo-based categories instead of mixed rank/level descriptions
- More focused network selection with practical playing strengths
- Removed very weak networks that weren't commonly used

### 3. **Better Organization**
- **Beginner**: Single strong network for new players (8k-7k level)
- **Normal**: Comprehensive range for intermediate players (6k-1k)
- **Dan**: Full dan-level coverage (1d-4d)
- **Pro**: Professional-level networks (5d+)

### 4. **Resource Optimization**
- Reduced total networks from 14 to 12
- Removed redundant very weak networks
- Maintained full coverage of practical playing strengths

## NetworkSelector Compatibility

The `NetworkSelector` class was already using the `pro` category, so no changes were needed there. The Enhanced AI Manager was also already referencing `pro` networks correctly.

## Backward Compatibility

- Existing games using the Enhanced AI Manager continue to work
- Network selection by Elo ranges remains unchanged
- API endpoints continue to function with updated category names

## Testing

All network categories are properly organized and accessible:
- ✅ Beginner networks (1000-1500 Elo)
- ✅ Normal networks (1500-1900 Elo)  
- ✅ Dan networks (1941-2400 Elo)
- ✅ Pro networks (2545-3050 Elo)

The Ubuntu script now perfectly matches the Windows batch file structure and provides a consistent cross-platform KataGo network setup experience. 