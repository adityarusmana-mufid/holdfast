# Scene Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current boot→squad→game flow with a proper chapter→level→squad→game→result pipeline, with hidden editor access via `?dev=true`.

**Architecture:** Three new scenes (ChapterSelect, LevelSelect, Result) bridge the existing SquadScene and GameScene into a coherent game loop. Chapters and levels are defined in a config file; levels are imported from JSON. Editor access is gated by URL parameter.

**Tech Stack:** Phaser 3, TypeScript, Vite (JSON import via default)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/config/chapters.ts` | Chapter/level definitions + LEVELS registry |
| `src/scenes/ChapterSelectScene.ts` | Chapter list with hidden editor gate |
| `src/scenes/LevelSelectScene.ts` | Level grid within a chapter |
| `src/scenes/ResultScene.ts` | Victory/defeat overlay with stars, retry, next |

### Modified Files
| File | Change |
|------|--------|
| `src/scenes/BootScene.ts` | Start `ChapterSelect` instead of `SquadScene` |
| `src/scenes/SquadScene.ts` | Accept level data from scene init, remove editor button, back to LevelSelect |
| `src/scenes/GameScene.ts` | Defeat detection, calculate stars, transition to Result |
| `src/main.ts` | Register 3 new scenes |

---

### Task 1: Create chapter/level config

**Files:**
- Create: `src/config/chapters.ts`

- [ ] **Create chapter config**

```typescript
import { LevelData } from '../types/index'
import level01 from '../../levels/level-01.json'

export interface ChapterDef {
  id: string
  title: string
  subtitle: string
  levels: string[]
}

export interface LevelDef {
  id: string
  name: string
  chapterId: string
  data: LevelData
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'chapter-1',
    title: 'Chapter 1',
    subtitle: 'Signal Intercept',
    levels: ['1-1', '1-2', '1-3'],
  },
]

const LEVEL_MAP: Record<string, LevelData> = {
  '1-1': level01 as LevelData,
  '1-2': level01 as LevelData,
  '1-3': level01 as LevelData,
}

export function getLevelData(levelId: string): LevelData | undefined {
  return LEVEL_MAP[levelId]
}

export function getLevelIdsForChapter(chapterId: string): string[] {
  const ch = CHAPTERS.find(c => c.id === chapterId)
  return ch ? ch.levels : []
}

export function getLevelDef(levelId: string): { id: string; name: string; chapterId: string } | undefined {
  for (const ch of CHAPTERS) {
    if (ch.levels.includes(levelId)) {
      const data = LEVEL_MAP[levelId]
      return { id: levelId, name: data?.name ?? levelId, chapterId: ch.id }
    }
  }
  return undefined
}

export function getNextLevelId(levelId: string): string | undefined {
  for (const ch of CHAPTERS) {
    const idx = ch.levels.indexOf(levelId)
    if (idx !== -1 && idx < ch.levels.length - 1) {
      return ch.levels[idx + 1]
    }
  }
  return undefined
}
```

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Commit**

```bash
git add src/config/chapters.ts
git commit -m "feat: add chapter/level config with level registry"
```

---

### Task 2: Register new scenes + update BootScene

**Files:**
- Modify: `src/main.ts`
- Modify: `src/scenes/BootScene.ts`

- [ ] **Register new scenes in main.ts**

```typescript
import { ChapterSelectScene } from './scenes/ChapterSelectScene'
import { LevelSelectScene } from './scenes/LevelSelectScene'
import { ResultScene } from './scenes/ResultScene'

// Inside scene array, add after BootScene:
scene: [BootScene, ChapterSelectScene, LevelSelectScene, SquadScene, EditorScene, GameScene, ResultScene],
```

- [ ] **Update BootScene to go to ChapterSelect**

```typescript
// src/scenes/BootScene.ts — replace entire file
import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    this.scene.start('ChapterSelectScene')
  }
}
```

Run: `npx tsc --noEmit` — expect no errors. Build will fail because scenes don't exist yet — ignore for now.

- [ ] **Commit**

```bash
git add src/main.ts src/scenes/BootScene.ts
git commit -m "feat: register new scenes, point BootScene to ChapterSelect"
```

---

### Task 3: Create ChapterSelectScene

**Files:**
- Create: `src/scenes/ChapterSelectScene.ts`

- [ ] **Create ChapterSelectScene**

```typescript
import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { CHAPTERS } from '../config/chapters'

export class ChapterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChapterSelectScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.add.text(W / 2, 30, 'HOLDFAST', {
      ...FONTS.h1, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 72, 'Select a Chapter', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    const startY = 140
    const gap = 100

    CHAPTERS.forEach((ch, i) => {
      const py = startY + i * gap

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(W / 2 - 200, py, 400, 70, 8)
      bg.lineStyle(1, 0xcfd8dc, 0.8)
      bg.strokeRoundedRect(W / 2 - 200, py, 400, 70, 8)
      bg.setInteractive(new Phaser.Geom.Rectangle(W / 2 - 200, py, 400, 70), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'

      this.add.text(W / 2, py + 18, ch.title, {
        ...FONTS.h3, color: COLORS.text.primary,
      }).setOrigin(0.5, 0)

      this.add.text(W / 2, py + 44, ch.subtitle, {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(0.5, 0)

      bg.on('pointerdown', () => {
        this.scene.start('LevelSelectScene', { chapterId: ch.id })
      })
    })

    // Editor gate — only visible when ?dev=true in URL
    const isDev = new URLSearchParams(window.location.search).has('dev')
    if (isDev) {
      makeButton(this, 20, H - 48, 'Editor', () => {
        this.scene.start('EditorScene')
      }, { w: 100, h: 30 })
    }
  }
}
```

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Commit**

```bash
git add src/scenes/ChapterSelectScene.ts
git commit -m "feat: add chapter selection screen with hidden editor gate"
```

---

### Task 4: Create LevelSelectScene

**Files:**
- Create: `src/scenes/LevelSelectScene.ts`

- [ ] **Create LevelSelectScene**

```typescript
import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { getLevelIdsForChapter, getLevelData, CHAPTERS } from '../config/chapters'

export class LevelSelectScene extends Phaser.Scene {
  private chapterId!: string

  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  init(data: { chapterId: string }): void {
    this.chapterId = data.chapterId
  }

  create(): void {
    const W = 1280
    const H = 720
    const ch = CHAPTERS.find(c => c.id === this.chapterId)

    this.add.text(W / 2, 30, ch?.title ?? 'Levels', {
      ...FONTS.h2, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 66, ch?.subtitle ?? '', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    const levelIds = getLevelIdsForChapter(this.chapterId)
    const startY = 130
    const gap = 80

    levelIds.forEach((levelId, i) => {
      const py = startY + i * gap
      const data = getLevelData(levelId)

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(W / 2 - 200, py, 400, 58, 8)
      bg.lineStyle(1, 0xcfd8dc, 0.8)
      bg.strokeRoundedRect(W / 2 - 200, py, 400, 58, 8)
      bg.setInteractive(new Phaser.Geom.Rectangle(W / 2 - 200, py, 400, 58), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'

      this.add.text(W / 2, py + 12, data?.name ?? levelId, {
        ...FONTS.h3, color: COLORS.text.primary,
      }).setOrigin(0.5, 0)

      this.add.text(W / 2, py + 36, `${data?.cols ?? 0}×${data?.rows ?? 0} grid  ·  DP start: ${data?.startingDP ?? 0}  ·  Limit: ${data?.deploymentLimit ?? 0}`, {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(0.5, 0)

      bg.on('pointerdown', () => {
        this.scene.start('SquadScene', { levelId, levelData: data })
      })
    })

    makeButton(this, 20, H - 48, 'Back', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 100, h: 30 })
  }
}
```

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Commit**

```bash
git add src/scenes/LevelSelectScene.ts
git commit -m "feat: add level selection screen"
```

---

### Task 5: Update SquadScene to accept level data

**Files:**
- Modify: `src/scenes/SquadScene.ts`

- [ ] **Add `init` method to SquadScene**

The scene needs to receive `levelId` and `levelData` from LevelSelect:

```typescript
// Add after line 56 (after constructor)
private levelId!: string
private levelData!: LevelData

init(data: { levelId: string; levelData: LevelData }): void {
  this.levelId = data.levelId
  this.levelData = data.levelData
}
```

Add the import for `LevelData` if not already present:
```typescript
import { UnitConfig, UnitTrait, LevelData } from '../types/index'
```

- [ ] **Update Start Mission button**

Replace the current Start Mission handler (lines 108-112):

```typescript
makeButton(this, W - 160, H - 48, 'Start Mission', () => {
  const squad = this.slots.filter((s): s is UnitConfig => s !== null)
  if (squad.length === 0) return
  this.scene.start('GameScene', { level: this.levelData, squad })
}, { w: 140, h: 30 })
```

- [ ] **Remove Editor button**

Delete lines 104-106 (the Editor button `makeButton` call).

- [ ] **Update Back button destination**

Replace the Editor button area or add a back button:

```typescript
makeButton(this, 20, H - 48, '< Back', () => {
  this.scene.start('LevelSelectScene', { chapterId: this.levelData ? 'chapter-1' : undefined })
}, { w: 100, h: 30 })
```

Note: we need the chapterId. Since SquadScene receives `levelId`, we can derive chapterId from it. Better approach — store `chapterId` in `init()` too.

Actually, let's revise the `init` to receive chapterId:

```typescript
init(data: { levelId: string; chapterId: string; levelData: LevelData }): void {
  this.levelId = data.levelId
  this.chapterId = data.chapterId
  this.levelData = data.levelData
}
```

And update LevelSelectScene to pass `chapterId`:

```typescript
this.scene.start('SquadScene', { levelId, chapterId: this.chapterId, levelData: data })
```

And the back button:

```typescript
makeButton(this, 20, H - 48, '< Back', () => {
  this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
}, { w: 100, h: 30 })
```

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Commit**

```bash
git add src/scenes/SquadScene.ts
git commit -m "feat: SquadScene accepts level/chapter data, removes editor button"
```

---

### Task 6: Add defeat detection + star calculation to GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Track starting lives**

```typescript
// Add property at class level (around line 20-40):
private startingLives: number = 0

// In init() or loadLevel(), after setting levelData:
this.startingLives = this.levelData.lives
```

Check where `loadLevel` or init sets up lives and add this there.

- [ ] **Add defeat detection**

The current win condition is `this.enemyManager.isAllWavesComplete()`. Add defeat when `this.lives <= 0`:

```typescript
// In update() or checkEndCondition(), around line 835:
if (this.lives <= 0 && !this.battleEnded) {
  this.battleEnded = true
  this.battleActive = false
  this.showResult('SYNC FAILED — All signal lost', 0xd32f2f)
  return
}
```

Find where `isAllWavesComplete` is checked and add the lives check before it.

- [ ] **Calculate stars**

```typescript
// Helper method:
private calculateStars(): number {
  const ratio = this.startingLives > 0 ? this.lives / this.startingLives : 0
  if (this.lives === this.startingLives) return 3
  if (ratio >= 0.5) return 2
  return 1
}
```

- [ ] **Add subtle ghost grid overlay**

Add import at top of GameScene.ts:
```typescript
import { Grid, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../entities/Grid'
```

Then in `loadLevel()` or `create()`, after background setup:
```typescript
// Subtle grid overlay — ghost blueprint lines
const gridOverlay = this.add.graphics()
gridOverlay.setDepth(-5)
gridOverlay.lineStyle(1, 0xf0f0f0, 0.3)

const rows = this.grid.rows
const cols = this.grid.cols

// Vertical lines
for (let c = 0; c <= cols; c++) {
  const x = GRID_OFFSET_X + c * TILE_SIZE
  gridOverlay.moveTo(x, GRID_OFFSET_Y)
  gridOverlay.lineTo(x, GRID_OFFSET_Y + rows * TILE_SIZE)
  gridOverlay.strokePath()
}

// Horizontal lines
for (let r = 0; r <= rows; r++) {
  const y = GRID_OFFSET_Y + r * TILE_SIZE
  gridOverlay.moveTo(GRID_OFFSET_X, y)
  gridOverlay.lineTo(GRID_OFFSET_X + cols * TILE_SIZE, y)
  gridOverlay.strokePath()
}
```

- [ ] **Track enemies defeated**

Add property:
```typescript
private enemiesDefeated: number = 0
```

Find where enemy death is handled (likely in the combat update loop or enemy manager callback) and add `this.enemiesDefeated++`.

- [ ] **Track chapterId and levelId in GameScene init**

The init currently receives `{ level?, squad? }`. Extend to `{ level?, squad?, chapterId?, levelId? }`:

```typescript
// Around line 320, in init():
private chapterId: string = ''
private levelId: string = ''

init(data: { level?: LevelData; squad?: UnitConfig[]; chapterId?: string; levelId?: string }): void {
  if (data?.level) this.levelData = data.level
  if (data?.chapterId) this.chapterId = data.chapterId
  if (data?.levelId) this.levelId = data.levelId
  if (data?.squad) {
    this.unitConfigs = data.squad
    this.fromSquad = true
  } else {
    this.unitConfigs = UNIT_CONFIGS
    this.fromSquad = false
  }
}
```

- [ ] **Update showResult — two paths**

Keep the old behavior for editor mode (`fromSquad = false`), transition to ResultScene for squad mode:

```typescript
private showResult(label: string, color: number): void {
  if (!this.fromSquad) {
    // Editor mode — keep old behavior (text + restart + back buttons)
    // (existing code stays as-is)
    return
  }

  // Squad mode — transition to ResultScene
  const outcome = label.includes('FAIL') ? 'defeat' : 'victory'
  const stars = outcome === 'defeat' ? 0 : this.calculateStars()

  this.time.delayedCall(1500, () => {
    this.scene.start('ResultScene', {
      chapterId: this.chapterId,
      levelId: this.levelId,
      squad: this.unitConfigs,
      outcome,
      stars,
      livesRemaining: this.lives,
      enemiesDefeated: this.enemiesDefeated,
    })
  })
}
```

The existing old `showResult` code (lines 856-887) handles the text display, restart button, and back button for editor mode. Keep it in the `if (!this.fromSquad)` branch.

- [ ] **Forward chapterId/levelId from SquadScene**

In Task 5, the SquadScene Start Mission handler already passes `{ level: this.levelData, squad }`. Update to also pass chapterId and levelId:

```typescript
this.scene.start('GameScene', {
  level: this.levelData,
  squad,
  chapterId: this.chapterId,
  levelId: this.levelId,
})
```

Run: `npx tsc --noEmit` — verify no errors.

- [ ] **Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: defeat detection, star calculation, transition to ResultScene"
```

---

### Task 7: Create ResultScene

**Files:**
- Create: `src/scenes/ResultScene.ts`

- [ ] **Create ResultScene**

```typescript
import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { getLevelDef, getNextLevelId, getLevelData } from '../config/chapters'
import { UnitConfig } from '../types/index'

export class ResultScene extends Phaser.Scene {
  private chapterId!: string
  private levelId!: string
  private squad!: UnitConfig[]
  private outcome!: 'victory' | 'defeat'
  private stars!: number
  private livesRemaining!: number
  private enemiesDefeated!: number

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: {
    chapterId: string
    levelId: string
    squad: UnitConfig[]
    outcome: 'victory' | 'defeat'
    stars: number
    livesRemaining: number
    enemiesDefeated: number
  }): void {
    this.chapterId = data.chapterId
    this.levelId = data.levelId
    this.squad = data.squad
    this.outcome = data.outcome
    this.stars = data.stars
    this.livesRemaining = data.livesRemaining
    this.enemiesDefeated = data.enemiesDefeated
  }

  create(): void {
    const W = 1280
    const H = 720
    const isVictory = this.outcome === 'victory'
    const levelDef = getLevelDef(this.levelId)

    // Background flash
    this.cameras.main.flash(isVictory ? 300 : 600, isVictory ? 0 : 200, isVictory ? 200 : 0, isVictory ? 83 : 50)

    // Title
    this.add.text(W / 2, 100, isVictory ? 'SYNC COMPLETE' : 'SYNC FAILED', {
      ...FONTS.h1,
      color: isVictory ? '#00c853' : '#d32f2f',
    }).setOrigin(0.5, 0)

    // Level name
    this.add.text(W / 2, 160, levelDef?.name ?? this.levelId, {
      ...FONTS.h3, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    // Stars (only on victory)
    if (isVictory) {
      const starStr = '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars)
      this.add.text(W / 2, 210, starStr, {
        fontSize: '36px', color: '#ffc107',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5, 0)
    }

    // Stats
    const statsY = isVictory ? 270 : 220
    const statsLines = [
      `Lives remaining: ${this.livesRemaining}`,
      `Enemies defeated: ${this.enemiesDefeated}`,
    ]
    statsLines.forEach((line, i) => {
      this.add.text(W / 2, statsY + i * 26, line, {
        ...FONTS.body, color: COLORS.text.secondary,
      }).setOrigin(0.5, 0)
    })

    // Buttons
    const btnY = H - 80
    const btnGap = 20

    // Retry (always available)
    makeButton(this, W / 2 - 160, btnY, 'Retry', () => {
      this.scene.start('GameScene', {
        level: getLevelData(this.levelId),
        squad: this.squad,
        chapterId: this.chapterId,
        levelId: this.levelId,
      })
    }, { w: 140, h: 34 })

    // Next Level (victory only)
    if (isVictory) {
      const nextLevelId = getNextLevelId(this.levelId)
      if (nextLevelId && getLevelData(nextLevelId)) {
        makeButton(this, W / 2 + 20, btnY, 'Next Level', () => {
          this.scene.start('SquadScene', {
            levelId: nextLevelId,
            chapterId: this.chapterId,
            levelData: getLevelData(nextLevelId),
          })
        }, { w: 140, h: 34 })
      } else {
        // Last level — show "All Clear" message
        this.add.text(W / 2, btnY + 40, '— Chapter Complete —', {
          ...FONTS.h3, color: '#00c853',
        }).setOrigin(0.5, 0)
      }
    }

    // Back to Levels
    makeButton(this, W / 2 - 70, btnY + 60, 'Back to Levels', () => {
      this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
    }, { w: 140, h: 30 })
  }
}
```

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Commit**

```bash
git add src/scenes/ResultScene.ts
git commit -m "feat: add result screen with stars, retry, next level"
```

---

### Task 8: Update LevelSelectScene to pass chapterId to SquadScene

**Files:**
- Modify: `src/scenes/LevelSelectScene.ts`

- [ ] **Pass chapterId in scene transition**

Find the line in LevelSelectScene that starts SquadScene and extend it:

```typescript
// Change from:
this.scene.start('SquadScene', { levelId, levelData: data })

// To:
this.scene.start('SquadScene', { levelId, chapterId: this.chapterId, levelData: data })
```

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Commit**

```bash
git add src/scenes/LevelSelectScene.ts
git commit -m "fix: pass chapterId to SquadScene from LevelSelectScene"
```

---

### Task 9: Verify complete flow

- [ ] **Run typecheck**

```bash
npx tsc --noEmit
```

Expected: clean output (no errors).

- [ ] **Run build**

```bash
npx vite build --minify false
```

Expected: builds successfully.

- [ ] **Test the game flow manually**

1. `npm run dev` (start dev server)
2. Normal visit: should see ChapterSelect (no editor button)
3. Visit `?dev=true`: should see editor button
4. Click chapter → see levels → click level → SquadScene
5. Auto-fill, Start Mission → GameScene plays
6. Win (enemies die) → ResultScene shows stars, retry, next level
7. Lose (lives = 0) → ResultScene shows defeat

- [ ] **Commit final verification**

```bash
git add -A
git commit -m "chore: finalize scene flow implementation"
```
