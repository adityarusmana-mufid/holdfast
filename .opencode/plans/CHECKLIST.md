# Holdfast — Implementation Checklist

Last updated: 2026-06-22

## Phase Status

| Phase | Status | Branch | Merged |
|-------|--------|--------|--------|
| Scene flow + Combat depth | ✅ Done | `main` | ✅ |
| Flat elevation visuals | ✅ Done | `feat/flat-elevation-visual` | ✅ |
| Perspective grid rendering | ✅ Done | `feat/perspective-tiles` | ✅ |
| Gameplay systems doc'd | ✅ Done | `main` | ✅ |
| Bottom card bar + auto-start | ✅ Done | `main` | ✅ |
| Vitest test suite (62 tests) | ✅ Done | `main` | ✅ |
| Visual philosophy doc | ✅ Done | `main` | ✅ |

## Next Steps (Implementation — Phase 14+)
- [ ] **Death animation for units** — explosion/dissolve effect instead of instant vanish. Low effort, high polish.
- [ ] **Deploy click UX** (`dist < 12` bug) — PENDING user decision: does clicking center cancel or confirm facing?
- [ ] **Research Ursus faction** — design new enemy types for Chapter 2+ (Wraith ignores block, Defense Crusher shreds DEF, etc.)
- [ ] **Plan 2.5D axonometric scene** — coordinate mapping, depth sorting, tile sprites. Big visual overhaul.
- [ ] **Level content for Chapter 2** — new levels, new enemies, escalating difficulty.

## Fixed Bugs

### ✅ 1. Elevation tile color connectivity (Visual)
- **Fixed in:** `src/entities/Grid.ts` — `render()` method
- **Fix:** Elevated tiles (Ranged, Wall) now check if the tile directly below (r+1, c) is also elevated. If so, they adopt the fill color of the tile below, creating continuous color across elevated platforms.

### ✅ 2. Restart simulation shifts grid left (Visual/Logic)
- **Fixed in:** `src/scenes/GameScene.ts`
- **Fix:** Extracted `computeGridOffsetX(cols)` method that calculates the centered offset. Both `create()` and `loadLevel()` use it, ensuring consistent grid positioning.

### ✅ 3. Range preview ignores perspective (Visual)
- **Fixed in:** `src/entities/Grid.ts` + `src/scenes/GameScene.ts`
- **Fix:** Added `Grid.getTileCorners(row, col)` public method returning trapezoid corner points. `showRangePreview()` and hover indicator now draw trapezoid outlines using `fillPoints` + `strokePath` instead of flat rects.

### ✅ 4. Spawn/Goal as 3D wireframe cubes (Visual)
- **Fixed in:** `src/entities/Grid.ts` — `render()` method
- **Fix:** Replaced X-corner-lines + triangle/exclamation with a perspective-aware wireframe cube. Top face is a smaller trapezoid offset 18px upward with 6px inset. Vertical edges connect bottom (tile) corners to top face corners. Includes subtle fill for depth.

## Known Bugs (Remaining)

### 5. Deployment click `dist < 12` cancels instead of confirming (UX)
- **File:** `src/scenes/GameScene.ts` (line ~287)
- **What:** During facing confirmation, clicking near the tile center (< 12px) cancels deployment instead of confirming.
- **Expected:** TBD — user decision needed.

### 6. (Fixed) No enemies spawn — missing `routeIndex` in level JSONs
- All waves were missing `routeIndex`. `startNextWave()` looked up `routes[undefined]`, got `undefined`, errored, and skipped through all waves with zero spawns. Old completion code (`enemies.length === 0`) masked this. Fixed by adding `routeIndex: 0` to all waves + fallback in `jsonToLevelData()`.

## Completed (recent)
- ✅ Phase 13 (Bottom card bar): Full-width grid, bottom card bar (96x128, 48px icons), auto-start with 2s grace, cancel by tapping selected card, pause overlay with dev actions, horizontal drag scroll. Removed START button, left palette, cancelFacingBtn.
- ✅ Phase 12f (UX features): Pause button + overlay + deploy-on-unpause flow. Wave preview dotted line during prelude countdown. Enemy intro toasts (icon + name + description, 5s auto-dismiss, stacking).
- ✅ Phase 12e (5 levels): Chapter 1 expanded to 5 levels (1-1 through 1-5), all validated.
- ✅ Phase 12d (routeIndex fix): Added `routeIndex: 0` to all waves + fallback in `jsonToLevelData()`.
- ✅ Phase 12c (level expansion): level-04, level-05 created. Enemy rebalance + Caster enemy added.
- ✅ Phase 12b (level validation): `validateLevelData()` runtime checker. level-02 and level-03 created.
- ✅ Phase 12a (completion model): Pre-count total enemies, track dealt-with counter, `isAllWavesComplete()` checks `enemiesDealtWith >= totalEnemyCount`.
- ✅ Enemy rebalance (2026-06-18): All enemies rebalanced against Arknights Reunion reference data. Added Caster (thermal damage) enemy. Wave 3 pressure with casters.
