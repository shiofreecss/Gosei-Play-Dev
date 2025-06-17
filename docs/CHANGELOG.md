# Changelog

All notable changes to Gosei Play will be documented in this file.

## 🌐 **Live Production: [https://play.gosei.xyz](https://play.gosei.xyz)**

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-01-08

### Added
- **Unlimited Time Display Enhancement**: Professional display for unlimited time games
  - **Infinity Symbol (∞)**: Shows ∞ instead of confusing "0:00" when main time is 0
  - **Improved UX**: Clear visual indication for unlimited time games
  - **Consistent Display**: TimeControl component now shows for all time control configurations

### Changed
- **Time Display Logic**: Enhanced `getTimeDisplay` function in TimeControl component
- **Game Info Display**: Updated condition to show timer for unlimited time games (main time ≥ 0)

### Fixed
- **Unlimited Time Confusion**: Eliminated misleading "0" display for unlimited time games
- **Timer Visibility**: Fixed issue where timer component wasn't shown for unlimited time

### Technical
- Enhanced `src/components/TimeControl.tsx` with infinity symbol display logic
- Updated `src/components/go-board/GameInfo.tsx` timer display condition
- Added comprehensive test coverage for all time display scenarios

## [0.1.1] - 2024-12-15

### Added
- **Tablet Stone Placement Enhancement**: Mobile-style touch interface extended to tablet devices
  - **Touch-to-Preview System**: Tablets now use mobile's proven stone placement workflow
  - **Mobile Stone Controls**: Component enabled for tablet devices (768px-1024px breakpoint)
  - **Position Indicators**: Clear Go coordinate display (e.g., "D4") for preview positions
  - **Confirmation Workflow**: "Place" button prevents accidental stone placement on tablets
  - **Enhanced Touch Targets**: 32px minimum touch areas for comfortable tablet interaction

### Changed
- **Device Detection**: Updated `useDeviceDetect` hook integration to include tablet support
- **Event Handling**: Unified touch/click event handling across mobile and tablet devices
- **CSS Optimization**: Added tablet-specific media queries with optimized touch targets
- **Grid Rendering**: Thinner grid lines (60% width) for better visibility on touch devices

### Fixed
- **Touch Interaction**: Tablets now receive proper touch event handling instead of mouse events
- **Stone Placement**: Eliminated accidental stone placement through confirmation workflow
- **Visual Feedback**: Enhanced stone preview rendering for tablet screens

### Technical
- Enhanced `src/components/go-board/MobileStoneControls.tsx` with tablet device support
- Updated `src/components/go-board/GoBoard.tsx` touch/click handlers for tablet inclusion
- Added tablet-specific CSS media queries in `src/App.css` with enhanced touch styling
- Updated documentation in `docs/MOBILE_RESPONSIVENESS.md` with tablet features

## [0.1.0] - 2025-06-04

### Added
- **Play Again Feature**: Complete seamless game continuation system
  - One-click play again requests from game completion modal
  - Accept/decline system for opponent responses
  - Automatic preservation of all game settings (time controls, board size, handicap, scoring rules)
  - Smooth automatic navigation to new game when opponent accepts
  - Real-time socket-based communication for instant feedback
  - Professional loading states with animations and status messages
  - Comprehensive error handling and recovery mechanisms

### Changed
- **Game ID System**: Replaced timestamp-based IDs with proper UUID generation using `uuidv4()`
- **State Management**: Enhanced game state synchronization across clients
- **localStorage Handling**: Improved data persistence with proper cleanup of old game data

### Fixed
- **Game State Synchronization**: Removed duplicate `gameState` event listeners that caused conflicts
- **Navigation Timing**: Fixed loading state hang during new game creation
- **localStorage Conflicts**: Resolved issues with old game data persisting across sessions
- **Handicap Game Support**: Complete handicap stone placement for all board sizes (9×9 to 21×21)

### Technical
- Added `uuid` dependency for proper game ID generation
- Enhanced `GameCompleteModal.tsx` with play again UI and request handling
- Improved `GameContext.tsx` with better event handling and state management
- Updated `server.js` with UUID generation and enhanced game creation logic
- Complete technical documentation in `PLAY_AGAIN_FEATURE.md`

## [1.0.9] - 2025-03-06

### Added
- **Server-Authoritative Timer System**: Revolutionary timing system with tournament-grade accuracy
  - All timer calculations moved to server for perfect synchronization
  - 500ms real-time update interval for smooth display
  - Automatic byo-yomi entry and period management
  - Zero manual intervention required for timer operations

### Changed
- **Timer Architecture**: Complete overhaul from client-side to server-authoritative timing
- **Byo-Yomi System**: Authentic Japanese tournament behavior with automatic period consumption
- **Client Timer Display**: Changed to display-only system showing server-provided values

### Fixed
- **Timer Synchronization**: Eliminated timing discrepancies between players
- **Byo-Yomi Entry**: Fixed timer hang when first entering byo-yomi
- **Period Consumption**: Automatic period removal when expired
- **Reset Display**: Immediate timer reset display when moves made
- **Auto-Transition**: Eliminated manual intervention requirements

### Technical
- Enhanced `server/server.js` with automatic state transitions and event management
- Improved `client/src/components/TimeDisplay.js` with enhanced reset detection
- Comprehensive logging and monitoring system
- Complete elimination of race conditions and timing conflicts

## [1.0.8] - 2025-02-15

### Added
- **Authentic Byo-Yomi Reset System**: Traditional Japanese byo-yomi reset rules
  - Moves within byo-yomi time reset the period to full time
  - Period consumption for moves exceeding byo-yomi time
  - Proper timeout handling with W+T/B+T game results

### Changed
- **Time Logic**: Move-based reset system for byo-yomi periods
- **Timeout Handling**: Automatic game end when all byo-yomi periods exhausted

### Fixed
- **Byo-Yomi Behavior**: Consistent logic for both moves and passes
- **Real-Time Updates**: All clients receive immediate time state updates

## [1.0.7] - 2025-01-20

### Added
- **Move-Based Time Tracking System**: Complete time tracking redesign
  - Time deduction only when actual moves/passes are made
  - Precise timing calculation based on actual thinking time
  - Automatic main time to byo-yomi transitions

### Changed
- **Time System**: From continuous timer updates to move-based deduction
- **Performance**: Reduced server load with more efficient timing

### Fixed
- **Time Accuracy**: Time tracking now matches actual thinking time
- **Byo-Yomi Transitions**: Seamless transitions without reset issues

## [1.0.6] - 2024-12-10

### Added
- **Complete Scoring System**: All major Go scoring rules implemented
  - Japanese, Chinese, Korean, AGA, and Ing scoring systems
  - Territory calculation and display
  - Dead stone marking during scoring phase

### Fixed
- **Scoring Accuracy**: Proper territory and capture calculations
- **Dead Stone Detection**: Enhanced dead stone marking interface

## [1.0.5] - 2024-11-25

### Added
- **Ko Rule Implementation**: Complete Ko rule system
  - Full board state comparison for Ko detection
  - Support for all board sizes with optimized algorithms
  - Integration with move validation system

### Fixed
- **Infinite Loops**: Prevention of Ko-based infinite game loops
- **Move Validation**: Enhanced move validation with Ko rule enforcement

## [1.0.0] - 2024-10-01

### Added
- **Initial Release**: Complete Go game platform
  - Real-time multiplayer gameplay
  - Multiple board sizes (9×9, 13×13, 15×15, 19×19, 21×21)
  - Basic time controls and game types
  - Responsive web interface
  - Game sharing and joining system

### Features
- Stone placement and capture mechanics
- Turn-based gameplay with pass functionality
- Game completion and basic scoring
- Audio feedback system
- Mobile-responsive design 