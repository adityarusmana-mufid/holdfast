# Unit Death Animation

Date: 2026-06-24

## Problem
Units vanish with only a shrink+fade tween. Enemies already have particle burst death effects — units should match.

## Design
Add particle burst to `Unit.destroy()` identical to `Enemy.destroy()` pattern:
- 6 particles from existing `'particle'` texture (8×8 white rect)
- Tinted to `unit.config.color`
- `speed: 40–120`, `scale: 2→0`, `alpha: 1→0`, `lifespan: 350ms`
- Existing shrink+fade tween preserved (250ms)
- Particle texture safety check if no enemy has died yet

## Files
- `src/entities/Unit.ts` — add particle burst in `destroy()`

## Verification
- Visual: particle burst on unit death, color matches unit config
- No regressions: unit still removed from sprites, DP refunded, slot freed
