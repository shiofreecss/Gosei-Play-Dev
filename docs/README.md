# Gosei Play

A modern, real-time Go (Weiqi/Baduk) game platform built with React and Node.js. Play Go online with friends around the world with advanced time controls, multiple board sizes, and intelligent game type management.

## Current Version: v1.0.8 🎯

**Latest Update**: Proper Byo-Yomi Reset System - Authentic Japanese time control implementation with competitive-level accuracy.

**Status**: Production Ready ✅ | **Last Updated**: May 26, 2025

## Features

### 🎮 Game Modes
- **Even Game**: Traditional Go with equal starting positions
- **Handicap Game**: Balanced play with handicap stones for skill differences (2-9 stones)
- **Teaching Game**: Educational mode for learning and instruction
- **Blitz Game**: Fast-paced games with per-move time limits
- **Rengo (Pair Go)**: Team-based gameplay (basic implementation)

### ⏱️ Advanced Time Controls
- **Main Time**: Traditional time allocation per player (flexible 0+ minutes)
- **Byo-yomi**: Japanese-style overtime periods with authentic reset behavior
- **Fischer Increment**: Time added after each move
- **Per-Move Timing**: Maximum time allowed per move (Blitz mode)
- **Intelligent Defaults**: Automatic time control setup based on game type
- **Move-Based Time Tracking**: Accurate time deduction only when moves are made

### 🏁 Board Sizes
- **9×9**: Perfect for beginners (~20-30 min games)
- **13×13**: Intermediate play (~45-60 min games)
- **19×19**: Standard tournament size (~90-120 min games)
- **15×15**: Traditional Korean size (~60-90 min games)
- **21×21**: Extended board for unique gameplay (~120-150 min games)

### 🎯 Scoring Systems
- **Japanese**: Territory + captures (default komi: 6.5)
- **Chinese**: Territory + stones on board (default komi: 7.5)
- **Korean**: Similar to Japanese rules (default komi: 6.5)
- **AGA**: American Go Association rules (default komi: 7.5)
- **Ing**: Ing rules with unique features (default komi: 8.0)

### 🎨 User Experience
- **Real-time Multiplayer**: Instant synchronization between players
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Auto-save**: Automatic game state preservation
- **Board Themes**: Multiple visual themes for the board
- **Sound Effects**: Audio feedback for stone placement
- **Game Sharing**: Easy game link sharing
- **Ko Rule Enforcement**: Complete implementation preventing infinite loops

## Recent Updates (v1.0.8)

### Authentic Byo-Yomi Reset System ✅
- **Traditional Japanese Rules**: Moves within byo-yomi time reset the period to full time
- **Period Consumption**: Moves exceeding byo-yomi time consume a period and reset to full time
- **Proper Timeout Handling**: Players timeout with W+T or B+T when final period is exceeded
- **Move-Based Time Tracking**: Time deducted only when actual moves/passes are made

### Time Control Intelligence
- **Automatic Game Type Detection**: Time per Move automatically switches between Even Game (0s) and Blitz Game (5s+)
- **Smart Byo-yomi Defaults**: Selecting any Byo-yomi period automatically sets time to 30 seconds
- **Blitz Game Restrictions**: Byo-yomi controls are disabled in Blitz games to prevent timing conflicts
- **Context-Aware Help**: Dynamic help text that explains current settings and restrictions

### Enhanced Game Types
- **Even/Handicap/Teaching Games**: Automatically disable per-move timing, Fischer increment, and Byo-yomi for traditional play
- **Blitz Games**: Automatically disable Byo-yomi and set main time to 0 for pure per-move timing
- **Visual Feedback**: Clear indication when controls are disabled with explanatory help text

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gosei-play.git
   cd gosei-play
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Start the backend server** (in a separate terminal)
   ```bash
   cd server
   npm install
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
npm run build
```

## How to Play

### Creating a Game
1. Enter your username
2. Click "Create New Game"
3. Configure game settings:
   - Choose board size (9×9 to 21×21)
   - Select game type (Even, Handicap, Teaching, Blitz)
   - Set time controls (main time, byo-yomi, Fischer increment)
   - Configure scoring rules (Japanese, Chinese, Korean, AGA, Ing)
   - Set handicap stones (2-9 for handicap games)
4. Click "Let's Play" to create the game
5. Share the game link with your opponent

### Joining a Game
1. Enter your username
2. Paste the game link or enter the game ID
3. Click "Join Game"

### Game Controls
- **Place Stone**: Click on board intersections
- **Pass**: Skip your turn
- **Undo**: Request to undo the last move
- **Resign**: Forfeit the game
- **Leave Game**: Exit the game (opponent will be notified)

### Time Control Behavior
- **Even Games**: Use main time only, no per-move limits
- **Blitz Games**: Use per-move timing, main time set to 0
- **Byo-yomi**: Extra time periods after main time expires with authentic reset behavior
- **Fischer**: Time added after each move

## Technical Architecture

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Socket.io Client** for real-time communication
- **React Router** for navigation

### Backend
- **Node.js** with Express
- **Socket.io** for real-time multiplayer
- **In-memory game state** management
- **RESTful API** for game operations

### Key Components
- `GameContext`: Global game state management
- `GoBoard`: Interactive game board component
- `GameInfo`: Player information and controls
- `TimeControl`: Advanced timing system with byo-yomi support
- `ConfirmationModal`: User action confirmations

## Game Logic Features

### Ko Rule Implementation ✅
- **Complete Board State Comparison**: Prevents infinite capture loops
- **Multi-Board Size Support**: Works with all board sizes (9×9 to 21×21)
- **Capture Simulation**: Accurate move validation with liberty checking
- **Production Ready**: Comprehensive testing and documentation

### Handicap System
- **Standard Handicap Placement**: Proper stone placement patterns for 2-9 stones
- **Automatic Komi Adjustment**: Komi adjustment for handicap games
- **Color Preference**: Choose your preferred color in handicap games

### Scoring System
- **Territory Calculation**: Accurate territory and capture counting
- **Dead Stone Marking**: Interactive dead stone selection
- **Multiple Rule Sets**: Support for all major Go scoring systems
- **Real-time Score Updates**: Live score calculation during gameplay

### Time Control System ✅
- **Move-Based Time Tracking**: Accurate time deduction only when moves are made
- **Authentic Byo-Yomi**: Traditional Japanese time control with proper reset behavior
- **Flexible Time Settings**: Any main time from 0+ minutes
- **Intelligent Automation**: Smart defaults based on game type

## Configuration

### Environment Variables
- `REACT_APP_SERVER_URL`: Backend server URL
- `PORT`: Development server port

### Game Settings
All game preferences are automatically saved to localStorage:
- Board size preferences
- Time control settings
- Scoring rule preferences
- Game type preferences
- Audio settings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

### Game Features
- [Game Type Time Control Behavior](GAME_TYPE_TIME_CONTROL_BEHAVIOR.md)
- [Time per Move Automatic Behavior](TIME_PER_MOVE_BEHAVIOR.md)
- [Byo-yomi Automatic Behavior](BYO_YOMI_AUTO_BEHAVIOR.md)
- [Blitz Game Byo-yomi Restrictions](BLITZ_GAME_BYO_YOMI_BEHAVIOR.md)

### Technical Implementation
- [Ko Rule Implementation](KO_RULE_IMPLEMENTATION.md)
- [Time Tracking System](TIME_TRACKING_SYSTEM.md)
- [Byo-yomi Implementation Summary](BYO_YOMI_IMPLEMENTATION_SUMMARY.md)
- [Version History](VERSION.md)

### Deployment
- [VPS Deployment Guide](VPS_DEPLOYMENT.md)
- [Heroku Setup](HEROKU_SETUP.md)
- [Netlify Setup](NETLIFY_SETUP.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies for optimal performance
- Implements authentic Go rules and time controls
- Designed for competitive and casual play
- Powered by [Beaver Foundation](https://beaver.foundation) - [ShioDev](https://hello.shiodev.com) 