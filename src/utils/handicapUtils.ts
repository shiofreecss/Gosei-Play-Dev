import { Position, Stone, ScoringRule } from '../types/go';

// Standard handicap stone positions for different board sizes
const HANDICAP_POSITIONS: Record<number, Position[]> = {
  21: [
    { x: 3, y: 3 },     // bottom left
    { x: 17, y: 17 },   // top right
    { x: 17, y: 3 },    // bottom right
    { x: 3, y: 17 },    // top left
    { x: 10, y: 10 },   // center
    { x: 10, y: 3 },    // bottom center
    { x: 10, y: 17 },   // top center
    { x: 3, y: 10 },    // left center
    { x: 17, y: 10 },   // right center
  ],
  19: [
    { x: 3, y: 3 },    // bottom left
    { x: 15, y: 15 },  // top right
    { x: 15, y: 3 },   // bottom right
    { x: 3, y: 15 },   // top left
    { x: 9, y: 9 },    // center
    { x: 9, y: 3 },    // bottom center
    { x: 9, y: 15 },   // top center
    { x: 3, y: 9 },    // left center
    { x: 15, y: 9 },   // right center
  ],
  15: [
    { x: 3, y: 3 },     // bottom left
    { x: 11, y: 11 },   // top right
    { x: 11, y: 3 },    // bottom right
    { x: 3, y: 11 },    // top left
    { x: 7, y: 7 },     // center
    { x: 7, y: 3 },     // bottom center
    { x: 7, y: 11 },    // top center
    { x: 3, y: 7 },     // left center
    { x: 11, y: 7 },    // right center
  ],
  13: [
    { x: 3, y: 3 },    // bottom left
    { x: 9, y: 9 },    // top right
    { x: 9, y: 3 },    // bottom right
    { x: 3, y: 9 },    // top left
    { x: 6, y: 6 },    // center
    { x: 6, y: 3 },    // bottom center
    { x: 6, y: 9 },    // top center
    { x: 3, y: 6 },    // left center
    { x: 9, y: 6 },    // right center
  ],
  9: [
    { x: 2, y: 2 },    // bottom left
    { x: 6, y: 6 },    // top right
    { x: 6, y: 2 },    // bottom right
    { x: 2, y: 6 },    // top left
    { x: 4, y: 4 },    // center
    { x: 4, y: 2 },    // bottom center
    { x: 4, y: 6 },    // top center
    { x: 2, y: 4 },    // left center
    { x: 6, y: 4 },    // right center
  ],
};

/**
 * Get handicap stone positions for a given board size and handicap count
 */
export const getHandicapStones = (boardSize: number, handicap: number): Stone[] => {
  if (handicap < 2 || handicap > 9) return [];
  
  const positions = HANDICAP_POSITIONS[boardSize];
  if (!positions) return [];
  
  // Get the handicap positions (limit to requested handicap)
  const handicapPositions = positions.slice(0, handicap);
  
  // Create stones for each position
  return handicapPositions.map(position => ({
    position,
    color: 'black'
  }));
};

/**
 * Calculate adjusted komi based on handicap stones and scoring rules
 */
export const getAdjustedKomi = (handicap: number, scoringRule: ScoringRule): number => {
  // Base komi values for different rulesets
  const baseKomi: Record<ScoringRule, number> = {
    japanese: 6.5,
    chinese: 7.5,
    korean: 6.5,
    aga: 7.5,
    ing: 8.0
  };

  // For handicap games, traditionally komi is 0.5 to avoid draws
  if (handicap > 0) {
    return 0.5;
  }

  return baseKomi[scoringRule];
};

/**
 * Get the starting player color based on handicap
 * In handicap games, White always plays first after Black's handicap stones
 */
export const getStartingColor = (handicap: number): 'black' | 'white' => {
  return handicap > 0 ? 'white' : 'black';
};

/**
 * Check if a position is a valid handicap point for the given board size
 */
export const isHandicapPoint = (position: Position, boardSize: number): boolean => {
  return HANDICAP_POSITIONS[boardSize]?.some(
    p => p.x === position.x && p.y === position.y
  ) || false;
}; 