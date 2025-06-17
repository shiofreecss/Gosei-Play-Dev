# Board Sizes and Specifications

This document details the supported board sizes, their star points (hoshi), and recommended time settings in Gosei Play.

## Board Size Overview

| Board Size | Difficulty Level | Recommended Time | Star Points | Common Usage | Estimated Duration |
|------------|-----------------|------------------|-------------|--------------|-------------------|
| 9×9        | Beginner       | 10+ minutes      | 5 points    | Quick games, learning basics | 20-30 minutes |
| 13×13      | Intermediate   | 20+ minutes      | 5 points    | Medium-length games | 45-60 minutes |
| 15×15      | Intermediate+  | 30+ minutes      | 5 points    | Traditional Korean size | 60-90 minutes |
| 19×19      | Advanced       | 45+ minutes      | 9 points    | Standard tournament size | 90-120 minutes |
| 21×21      | Expert         | 60+ minutes      | 9 points    | Extended gameplay | 120-150 minutes |

## Flexible Time Control System ✅

**Current Implementation (v0.0.8)**: Users have complete flexibility in setting time controls. The system provides intelligent recommendations but does not enforce minimum requirements.

### Time Setting Options
- **Any Main Time**: Set from 0+ minutes (no restrictions)
- **Bullet Games**: 1-5 minutes for quick practice
- **Blitz Games**: 5-15 minutes for fast-paced play
- **Standard Games**: 15-60 minutes for regular play
- **Teaching Games**: 60+ minutes for learning and discussion
- **Demonstration Games**: 0 minutes for position analysis

### Recommended Time Settings
The following are suggestions based on board complexity, but users can choose any time they prefer:

- **9×9 Board**: 10 minutes main time per player (recommended)
- **13×13 Board**: 20 minutes main time per player (recommended)
- **15×15 Board**: 30 minutes main time per player (recommended)
- **19×19 Board**: 45 minutes main time per player (recommended)
- **21×21 Board**: 60 minutes main time per player (recommended)

### Advanced Time Controls
- **Byo-yomi Periods**: 3, 5, or 7 periods with customizable time (30s, 40s, 60s)
- **Fischer Increment**: Time added after each move (5s, 10s, 15s)
- **Per-Move Timing**: Maximum time per move for Blitz games
- **Intelligent Defaults**: Automatic time control setup based on game type

*Note: Time recommendations are based on typical game complexity and strategic depth. Players are encouraged to experiment with different time controls to find their preferred pace.*

## Board Size Implementation ✅

### Visual Features
- **Board Size Preview**: Interactive visual preview with grid and star points
- **Collapsible Sections**: Standard sizes prominently displayed, custom sizes in expandable section
- **Size Descriptions**: Clear explanations of each board size with difficulty level and usage
- **Responsive Design**: Optimal display on all screen sizes
- **Custom Badge**: Visual indicator for non-standard board sizes (15×15, 21×21)

### Technical Features
- **Dynamic Grid Generation**: Automatic grid scaling for all board sizes
- **Star Point Calculation**: Accurate hoshi placement for each size
- **Preference Storage**: Board size preferences saved in localStorage
- **Theme Compatibility**: Consistent styling with all board themes
- **Performance Optimized**: Efficient rendering for all supported sizes

## Star Point (Hoshi) Positions

### 9×9 Board
- **5 star points** at positions:
  - Corner points: (2,2), (2,6), (6,2), (6,6)
  - Center point: (4,4)

### 13×13 Board
- **5 star points** at positions:
  - Corner points: (3,3), (3,9), (9,3), (9,9)
  - Center point: (6,6)

### 15×15 Board (Korean Traditional)
- **5 star points** at positions:
  - Corner points: (3,3), (3,11), (11,3), (11,11)
  - Center point: (7,7)

### 19×19 Board (Tournament Standard)
- **9 star points** at positions:
  - Corner points: (3,3), (3,15), (15,3), (15,15)
  - Side points: (3,9), (9,3), (9,15), (15,9)
  - Center point: (9,9)

### 21×21 Board (Extended)
- **9 star points** at positions:
  - Corner points: (3,3), (3,17), (17,3), (17,17)
  - Side points: (3,10), (10,3), (10,17), (17,10)
  - Center point: (10,10)

## Handicap Stone Placement ✅

All board sizes support handicap games with **2-9 stones**. The handicap stones are placed on the star points in a specific order:

### Placement Order
1. **First two stones**: Opposite corners (diagonal placement)
2. **Next two stones**: Remaining corners
3. **Fifth stone**: Center point (if available)
4. **Remaining stones**: Side points (for 19×19 and 21×21 boards)

### Handicap Features
- **Color Preference**: Choose your preferred color in handicap games
- **Automatic Komi Adjustment**: Komi automatically adjusted for handicap games
- **Visual Feedback**: Clear indication of handicap stone positions
- **Standard Patterns**: Follows traditional Go handicap placement rules

## Game Type Integration ✅

### Board Size Recommendations by Game Type

#### Even Games
- **Any board size** suitable
- **Recommended**: 19×19 for serious play, 13×13 for quicker games
- **Time Control**: Main time only, no per-move limits

#### Handicap Games
- **Best on**: 13×13, 19×19 boards (adequate star points)
- **Handicap Range**: 2-9 stones depending on skill difference
- **Time Control**: Traditional timing with main time and optional byo-yomi

#### Teaching Games
- **Recommended**: 9×9 or 13×13 for beginners, 19×19 for advanced concepts
- **Extended Time**: Longer time controls for explanation and discussion
- **Flexible Timing**: Any time setting appropriate for learning pace

#### Blitz Games
- **Best on**: 9×9 or 13×13 for fast-paced action
- **Time Control**: Per-move timing (5+ seconds per move)
- **Quick Play**: Emphasis on reading and intuition

## Technical Implementation

### Core Components
- **`src/components/go-board/BoardSizePreview.tsx`** - Visual preview component with interactive grid
- **`src/components/go-board/GoBoard.tsx`** - Main game board component with dynamic sizing
- **`src/utils/handicapUtils.ts`** - Handicap stone positions and placement logic
- **`src/pages/HomePage.tsx`** - Board size selection and time control integration

### Performance Characteristics
- **Rendering Speed**: < 100ms for board initialization on all sizes
- **Memory Usage**: Optimized for concurrent games on multiple board sizes
- **Responsive Scaling**: Automatic adjustment for different screen sizes
- **Cross-Platform**: Consistent behavior on desktop, tablet, and mobile

## Usage Recommendations

### For New Players
1. **Start with 9×9**: Learn basic tactics and stone placement
2. **Progress to 13×13**: Develop strategic thinking
3. **Use Teaching Mode**: Extended time for learning
4. **Try Handicap Games**: Balanced matches against stronger players

### For Intermediate Players
1. **13×13 or 15×15**: Good balance of strategy and game length
2. **Experiment with Time Controls**: Find your preferred pace
3. **Practice Blitz**: Improve reading speed and intuition
4. **Explore Different Sizes**: Each size offers unique strategic challenges

### For Advanced Players
1. **19×19 Standard**: Tournament-level play
2. **21×21 Extended**: Explore advanced strategic concepts
3. **Flexible Time Controls**: Adapt to opponent and situation
4. **Teaching Others**: Use larger boards for demonstration

### For Competitive Play
1. **19×19 Primary**: Standard tournament size
2. **Appropriate Time Controls**: Match tournament standards
3. **Byo-yomi Periods**: Traditional Japanese time control
4. **Even Games**: Standard competitive format

## Mobile Considerations

### Screen Size Optimization
- **9×9 and 13×13**: Excellent on mobile devices
- **15×15 and 19×19**: Good on tablets and larger phones
- **21×21**: Best on desktop or large tablets
- **Responsive Design**: Automatic scaling for optimal viewing

### Touch Interface
- **Large Touch Targets**: Easy stone placement on all sizes
- **Zoom Support**: Pinch-to-zoom for detailed viewing
- **Gesture Controls**: Intuitive navigation and interaction
- **Performance**: Smooth rendering on mobile hardware

## Notes

- **Time Flexibility**: Complete freedom in time control settings
- **Board Size Persistence**: Preferences automatically saved
- **Handicap Integration**: Seamless integration with all board sizes
- **Theme Compatibility**: All sizes work with available board themes
- **Future Expansion**: Architecture supports additional board sizes if needed
- **Accessibility**: Keyboard navigation and screen reader support planned 