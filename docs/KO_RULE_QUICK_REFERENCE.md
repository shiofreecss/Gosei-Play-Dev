# KO Rule Quick Reference

## Basic Usage

### Check if a move violates KO rule

```typescript
import { checkKoRule } from '../utils/goGameLogic';

const isViolation = checkKoRule(
  currentBoardState,           // string[][]
  { position: {x: 2, y: 2}, color: 'black' },  // proposed move
  previousBoardState           // string[][] | null
);

if (isViolation) {
  // Move is illegal - reject it
  return { valid: false, error: 'Ko rule violation' };
}
```

### Board Format

```javascript
// Board representation: 2D string array
[
  ['.', '.', '.', '.', '.'],    // Row 0
  ['.', 'B', 'W', '.', '.'],    // Row 1: B=Black, W=White, .=Empty  
  ['.', 'W', '.', 'W', '.'],    // Row 2
  ['.', 'B', 'W', '.', '.'],    // Row 3
  ['.', '.', '.', '.', '.']     // Row 4
]
//  0   1   2   3   4            // Columns (x coordinates)
```

### Coordinate System
- `(0,0)` = top-left corner
- `x` = column (increases rightward) 
- `y` = row (increases downward)

## Integration Example

```typescript
// In your move validation function
export const validateMove = (position, color, gameState) => {
  // ... other validations ...
  
  // Check KO rule
  if (checkKoRule(gameState.board, { position, color }, gameState.previousBoard)) {
    return { valid: false, error: 'Ko rule violation' };
  }
  
  return { valid: true };
};
```

## Test Your Implementation

### Run Interactive Demo
```bash
node koDemo.js
```

### Run Tests  
```bash
node testKoRule.js
```

### Custom Testing
```bash
node customKoTest.js
```

## Supported Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Simple KO** | ✅ Full | Basic capture/recapture prevention |
| **Board Sizes** | ✅ All | 9×9, 13×13, 15×15, 19×19, 21×21 |
| **Edge Cases** | ✅ Full | Boundaries, invalid inputs, edge KO |
| **Performance** | ✅ Fast | <1ms response time |
| **Superko** | ❌ Future | Advanced rule for competitive play |

## Common Scenarios

### 1. Classic KO
```
Before: B captures W    After: W cannot recapture immediately
. B W .                 . B W .
W B W .        →        W . W .
. B W .                 . B W .
```

### 2. Legal Recapture (Multiple Stones)
```
Before: B captures 2W   After: W can recapture (different board state)
. B B B                 . B B B  
W W W .        →        . . . .
. B B B                 . B B B
```

### 3. Breaking KO
```
Player can break KO by playing elsewhere first:
Move 1: Play at different position
Move 2: Now recapture is legal
```

## Error Handling

### Return Values
- `true` = KO violation (move illegal)
- `false` = Legal move

### Edge Cases Handled
- `null` or `undefined` previous board = always legal
- Invalid coordinates = legal (handled elsewhere)
- Different board sizes = illegal
- Empty position check = handled in validation

## Performance Notes

- **Time Complexity**: O(n²) where n = board size
- **Space Complexity**: O(n²) for board copies
- **Typical Performance**: <1ms for 19×19 boards
- **Memory Usage**: Minimal - creates temporary copies only

## Best Practices

1. **Always validate inputs** before calling `checkKoRule`
2. **Store previous board state** in your game state
3. **Handle null/undefined** previous board gracefully  
4. **Test edge cases** thoroughly with your board sizes
5. **Use consistent coordinate system** throughout your app

## Troubleshooting

### Common Issues

**Q: KO rule not triggering when expected?**
- Check board state format (string arrays)
- Verify coordinate system (0-indexed)
- Ensure previous board state is correct

**Q: False KO violations?**  
- Verify board state comparison logic
- Check for extra characters in board strings
- Test with simple KO scenarios first

**Q: Performance issues?**
- Normal for first call (JIT optimization)
- Consider board state caching for frequent checks
- Profile with your specific board sizes

### Debug Tips

```javascript
// Add logging to see what's happening
console.log('Current board:', currentBoardState);
console.log('Previous board:', previousBoardState);
console.log('Proposed move:', proposedMove);
const result = checkKoRule(currentBoardState, proposedMove, previousBoardState);
console.log('KO violation:', result);
```

## Documentation Links

- **Full Documentation**: [KO_RULE.md](KO_RULE.md)
- **Implementation Planning**: [PLANNING.md](PLANNING.md)
- **Main Features**: [README.md](README.md)

---

Need help? Check the interactive demos or full documentation for detailed examples and explanations. 