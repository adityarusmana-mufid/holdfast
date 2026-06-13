# Next Steps — Holdfast

**Generated:** 2026-06-12
**State:** All core gameplay implemented and compiling clean. Uncommitted work: DOM editor panels, Animus visual overhaul, full game loop.

---

## Uncommitted Work (commit before anything else)

The following files have changes not yet committed:

| File | What changed |
|------|-------------|
| `src/main.ts` | DOM support flag enabled |
| `src/scenes/EditorScene.ts` | ConfigPanel + WavePanel rewritten as DOM elements |
| `src/scenes/GameScene.ts` | Animus terminology, flash messages, result screens |
| `src/types/index.ts` | Type additions for new features |
| `.opencode/plans/CHECKLIST.md` | Phase tracking updates |

**Recommended:** Create a topic branch and commit these before starting new work:

```bash
git checkout -b feat/dom-editor-panels
git add src/main.ts src/scenes/EditorScene.ts src/scenes/GameScene.ts src/types/index.ts .opencode/plans/CHECKLIST.md
git commit -m "feat(editor): replace prompt() with DOM-based config/wave panels

- ConfigPanel and WavePanel rewritten using Phaser DOM elements
- Real HTML <input> fields with CSS styling and data-attribute delegation
- Click-to-edit numeric values with blur/enter/escape handlers
- Wave add/delete/cycle controls with inline editing
- Animus visual overhaul: light palette, gradients, new terminology"
```

Then run verification gate:
```bash
npx tsc --noEmit
npx vite build --minify false
```

---

## Recommended Priority Order

### P1 — Commit existing work (30 min)
Create topic branch, commit, verify build passes, merge to main.

### P2 — Keyboard shortcuts (1-2 hr)
Add to `EditorScene.create()`:
- `E` → toggle Erase mode
- `S` → trigger JSON save
- `1`-`7` → select palette tile by index
- Show active mode in status bar

Relevant file: `src/scenes/EditorScene.ts` (look for `this.input.keyboard?.on('keydown-...')` patterns, ~line 150–195 where existing editor init happens)

### P3 — Scrollable wave panel (1-2 hr)
The WavePanel DOM element currently overflows the screen when there are many waves. Fix:
- Add `overflow-y: auto; max-height: 300px;` to the `.editor-panel` inner container for the wave panel
- Or split into a fixed header + scrollable body

Relevant file: `src/scenes/EditorScene.ts` — `injectEditorStyles()` for CSS, `WavePanel.draw()` for the container div

### P4 — Balance tuning (2-3 hr)
- Load `levels/level-01.json`, start a simulation
- Deploy units: do costs feel right? Do enemies die at a satisfying pace?
- Tune in `src/config/units.ts` and `src/config/enemies.ts`
- Adjust `src/scenes/GameScene.ts` DP regen/starting DP if pacing is off

### P5 — Polish effects (3-4 hr)
- **Floating code fragments**: particle emitter on grid edges during simulation (Phaser particles, small `#00a2ff` rectangles drifting upward)
- **Geometric dissolve death**: on enemy death, spawn small squares that scatter outward and fade (Phaser tweens on `this.add.rectangle()` children)
- **Screen flash**: already partially done (`cameras.main.flash`) — extend to transition effects between scenes

### P6 — Chapter progression (future)
- Chapter select screen
- Level unlock tracking
- 3 chapters × 3-5 levels each

---

## Architecture Notes

### Keyboard shortcuts pattern
```typescript
// In EditorScene.create():
this.input.keyboard?.on('keydown-E', () => {
  this.editMode = EditMode.Erase
  this.setStatus('Erase mode')
})
this.input.keyboard?.on('keydown-One', () => {
  this.selectedType = PALETTE_ITEMS[0].type
  // ... update palette visuals
})
```

### Particle system for effects
Phaser 3 has built-in particle support:
```typescript
const particles = this.add.particles(x, y, 'key', {
  speed: { min: 50, max: 200 },
  lifespan: 800,
  quantity: 5,
})
```
For v1 with only geometric shapes, generate particle textures via Graphics → `generateTexture()`.

### DOM panel scrolling
The WavePanel right now destroys and recreates the entire DOM element on each draw. For scroll support, wrap the wave list content in a `<div>` with a fixed max-height:
```css
.wave-scroll { overflow-y: auto; max-height: 300px; }
```
Apply only to the wave panel's list div, not to the ConfigPanel.

---

## Current Stats
- **Total source files:** 18 TypeScript files
- **Checklist items:** 20 across 5 phases (core phases 1-3 done, 4-5 implemented but unchecked)
- **Build:** `tsc --noEmit` passes clean
- **Canvas:** 1024×768, 12×8 grid, 64px tiles
