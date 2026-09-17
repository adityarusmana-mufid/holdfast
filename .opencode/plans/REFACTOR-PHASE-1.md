# Refactor Phase 1 — Safety Net + GridRenderer Extraction

Based on Gemini architecture review (`explore/2026-06-20-gemini-roadmap-analysis.md`), scaled down for solo-dev reality.

## Principle
Do not refactor what isn't broken. Solo dev = God Objects are tolerable. Focus on the bottlenecks that actually hurt: rendering sprawl in GameScene and no safety net for regressions.

---

## Step 1: Safety Net (Tooling)

### 1a — Formalize tsc --noEmit
Already works. Just needs a documented script.
- Add `"typecheck": "tsc --noEmit"` to package.json
- Verify it passes (it does as of last build)
- **Effort**: 2 minutes

### 1b — Install Biome
Replace manual linting with Biome (faster than ESLint + Prettier for Vite projects).
- `npm i -D @biomejs/biome && npx biome init`
- Add `"lint": "biome check src/"` and `"lint:fix": "biome check --write src/"` to package.json
- Run `npm run lint` and fix initial issues
- **Effort**: 15 minutes

### 1c — Vitest for Pure Functions
Only test pure functions — grid math and deployment cost logic. Not scenes (Phaser DOM dependency).
- Install `vitest` and `happy-dom`: `npm i -D vitest happy-dom`
- Create `vitest.config.ts` with `happy-dom` environment
- Write tests for `src/shared/gridmath.ts` (range pattern rotation) and `src/systems/DeploymentSystem.ts` (cost calculation, cooldowns)
- **Effort**: 1 session
- **Why**: Protects range rotation and cost multipliers during refactors. These are the most regression-prone pure functions.

---

## Step 2: Extract Grid Rendering from GameScene

### Problem
GameScene has ~3600 lines. The single biggest chunk is **grid visual rendering**: range previews, hover indicators, facing arrows, cancel indicators, tile highlighting. These are rendering-only, mixed with game logic.

### Solution: GridRenderer class
Extract into `src/systems/GridRenderer.ts` (or `src/entities/GridRenderer.ts`).

**What moves out:**
- `showRangePreview()` — draws range pattern tiles
- `showFacingArrow()` — draws facing direction arrow
- `showCancelIndicator()` — draws X on cancel
- `clearRangePreview()` — clears all of the above
- `hoverIndicator` — tile hover highlight
- `rangePreview` graphics object
- `facingArrow` graphics object
- `cancelDeployIndicator` graphics object
- `drawBgGradient()` — background gradient
- `drawGridOverlay()` — grid lines

**What stays in GameScene:**
- All game logic (deploy, combat, input coordination, state management)
- All HUD (card bar, stats panel, DP/lives/wave text)
- All event wiring (pointerdown, pointermove, etc.)
- `buildCardBar()`, `rebuildCardBar()`, `updateCardVisuals()` — UI, not grid
- `buildPauseButton()`, `togglePause()`
- `buildStatsPanel()`, `updateStatsPanel()`
- `updateHUD()`

**GridRenderer API:**
```ts
class GridRenderer {
  constructor(scene: Phaser.Scene, grid: Grid)

  showRangePreview(pos: Position, pattern: RangePattern, facing: Direction): void
  showFacingArrow(pos: Position, facing: Direction): void
  showCancelIndicator(cx: number, cy: number): void
  clearPreviews(): void
  showHover(pos: Position, valid: boolean): void
  hideHover(): void
  drawBackground(): void
  drawGridLines(): void
}
```

**Call sites in GameScene change from:**
```ts
this.showRangePreview(selected, pos, this.pendingFacing)
```
to:
```ts
this.gridRenderer.showRangePreview(pos, selected.rangePattern, this.pendingFacing)
```

Boundary: GameScene owns WHAT to render (the data), GridRenderer owns HOW (the Phaser Graphics calls).

**Effort**: 1-2 sessions
**Lines removed from GameScene**: ~350-500
**Risk**: Low — pure extraction, no logic changes. Tests on grid rotation (Step 1c) verify correctness.

---

## Step 3: NOT Doing (Deferred Indefinitely)

These are good ideas from Gemini that we skip because they don't pay for themselves at this scale:

- **InputCoordinatorSystem**: The 3-step deploy flow is 50 lines total. A coordinator system adds more abstraction than code.
- **LevelStateSystem**: Victory/loss/DP is tightly coupled to scene lifecycle. Forcing it out adds complexity, not clarity.
- **Full Biome lint rules**: Start with defaults. Don't spend time configuring custom rules until they catch actual bugs.
- **Kenney sprite integration**: Already tried, hit frame mapping issues. Needs a separate deliberate phase with proper planning and a test level to validate.

---

## Timeline

| Step | Est. Time | Output |
|------|-----------|--------|
| 1a. tsc script | 2 min | `npm run typecheck` |
| 1b. Biome install + first pass | 15 min | `npm run lint` passes |
| 1c. Vitest + grid math tests | 1 session | Tests for rotation + cost logic |
| 2. GridRenderer extraction | 1-2 sessions | GameScene cut by ~400 lines |

Total: ~2-3 sessions to get safety net + meaningful deconstruction.

---

## Verification Gate (after each step)
- `npm run build` must pass (tsc + vite)
- `npm run lint` must pass (biome)
- `npm run test` must pass (vitest) — after step 1c
- Play through one level to verify visuals didn't break
