# Home Bridge Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Create a new HomeBridgeScene as the startup screen with 3 trapezoid buttons (TERMINAL, SQUAD, EDITOR) and entry animations, replacing ChapterSelectScene as the first screen.

**Architecture:** HomeBridgeScene draws a gradient background, animated title, and 3 custom trapezoid buttons with hover perspective effects. SquadScene gains a "menu" mode for the Squad Preset flow. BootScene redirects to the new scene. No new dependencies.

**Tech Stack:** Phaser 3, TypeScript, same patterns as existing scenes.

---

### Task 1: Wire BootScene → HomeBridgeScene

**Files:**
- Modify: `src/scenes/BootScene.ts` (full file)
- Modify: `src/main.ts` (scene list)

- [ ] **Step 1: Change BootScene to start HomeBridgeScene**

```typescript
import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    this.scene.start('HomeBridgeScene')
  }
}
```

- [ ] **Step 2: Add HomeBridgeScene to main.ts scene list and import**

```typescript
import { HomeBridgeScene } from './scenes/HomeBridgeScene'
```
Add to after `BootScene` import, and in scene array:
```typescript
scene: [BootScene, HomeBridgeScene, ChapterSelectScene, LevelSelectScene, SquadScene, PickerScene, EditorScene, GameScene, ResultScene, LevelPreviewScene],
```

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BootScene.ts src/main.ts
git commit -m "feat(home-bridge): wire BootScene to HomeBridgeScene"
```

---

### Task 2: Create HomeBridgeScene

**Files:**
- Create: `src/scenes/HomeBridgeScene.ts`

**Button configuration (W, leftH, rightH):**

| Button | W | leftH | rightH | Role | x | y |
|---|---|---|---|---|---|---|
| TERMINAL | 300 | 56 | 64 | primary | 960 | 270 |
| SQUAD | 260 | 48 | 56 | default | 1000 | 340 |
| EDITOR | 260 | 48 | 56 | default | 1000 | 402 |

Right edge offset = (rightH - leftH) / 2 = 4px for all.

Color refs from `Constants.ts` — `primary`: top `0x4a4a4a`, bottom `0x303030`, pressed top `0x383838`, pressed bottom `0x282828` | `default`: top `0xd5dbe3`, bottom `0xc0c4cc`, pressed top `0xc0c4cc`, pressed bottom `0xa8acb4`

- [ ] **Step 1: Write the full HomeBridgeScene**

Create `src/scenes/HomeBridgeScene.ts`:

```typescript
import Phaser from 'phaser'
import { COLORS } from '../ui/Constants'

interface RoleColors {
  top: number; bottom: number; pressedTop: number; pressedBottom: number
}

const ROLE_FILLS: Record<string, RoleColors> = {
  primary: {
    top: COLORS.nodeButton.primaryTop,
    bottom: COLORS.nodeButton.primaryBottom,
    pressedTop: COLORS.nodeButton.primaryTopPressed,
    pressedBottom: COLORS.nodeButton.primaryBottomPressed,
  },
  default: {
    top: COLORS.nodeButton.defaultTop,
    bottom: COLORS.nodeButton.defaultBottom,
    pressedTop: COLORS.nodeButton.defaultTopPressed,
    pressedBottom: COLORS.nodeButton.defaultBottomPressed,
  },
}

const ROLE_TEXT: Record<string, string> = {
  primary: '#ffffff',
  default: COLORS.text.primary,
}

const BTN_DEFS: {
  key: string; label: string; x: number; y: number; w: number; leftH: number; rightH: number; role: string; fontSize: string;
}[] = [
  { key: 'terminal', label: 'TERMINAL', x: 960, y: 270, w: 300, leftH: 56, rightH: 64, role: 'primary', fontSize: '16px' },
  { key: 'squad', label: 'SQUAD PRESET', x: 1000, y: 340, w: 260, leftH: 48, rightH: 56, role: 'primary', fontSize: '14px' },
  { key: 'editor', label: 'LEVEL EDITOR', x: 1000, y: 402, w: 260, leftH: 48, rightH: 56, role: 'primary', fontSize: '14px' },
]

function drawShadow(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const layers = [
    { off: 2, a: 0.08 }, { off: 4, a: 0.06 }, { off: 6, a: 0.04 },
    { off: 8, a: 0.03 }, { off: 10, a: 0.02 }, { off: 12, a: 0.01 },
  ]
  for (const l of layers) {
    g.fillStyle(0x000000, l.a)
    g.fillRect(l.off, l.off, w, h)
  }
}

function drawTrapezoid(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, leftH: number, rightH: number,
  top: number, bottom: number,
): void {
  const off = (rightH - leftH) / 2
  g.fillGradientStyle(top, top, bottom, bottom)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w, y + off)
  g.lineTo(x + w, y + leftH + off)
  g.lineTo(x, y + leftH)
  g.closePath()
  g.fillPath()
}

export class HomeBridgeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeBridgeScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.cameras.main.fadeIn(300, 255, 255, 255)

    // gradient background
    const bg = this.add.graphics()
    bg.fillGradientStyle(0xffffff, 0xffffff, 0xf0f2f5, 0xe8ecf0)
    bg.fillRect(0, 0, W, H)

    // title: fades in from left
    const title = this.add.text(40, 60, 'HOLDFAST', {
      fontSize: '36px',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
      color: '#1a1a2e',
    })
    title.setAlpha(0)
    this.tweens.add({
      targets: title,
      x: 60,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeOut',
    })

    // accent line
    const accent = this.add.graphics()
    accent.lineStyle(1, 0xcfd8dc, 1)
    accent.lineBetween(60, 105, 340, 105)

    // buttons
    for (const def of BTN_DEFS) {
      const colors = ROLE_FILLS[def.role]
      const textColor = ROLE_TEXT[def.role]

      const c = this.add.container(def.x, def.y)
      const shadow = this.add.graphics()
      const gfx = this.add.graphics()
      const bdr = this.add.graphics()
      c.add([shadow, gfx, bdr])

      const txt = this.add.text(0, 0, def.label, {
        fontSize: def.fontSize,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
        color: textColor,
      }).setOrigin(0.5, 0.5)

      let isPressed = false
      let currentLeftH = def.leftH
      let currentRightH = def.rightH

      function draw(pressed: boolean, leftH: number, rightH: number): void {
        shadow.clear()
        gfx.clear()
        bdr.clear()

        const bboxH = leftH + (rightH - leftH) / 2
        if (!pressed) {
          drawShadow(shadow, def.w, bboxH)
        } else {
          shadow.fillStyle(0x000000, 0.06)
          shadow.fillRect(2, 2, def.w, bboxH)
          shadow.fillStyle(0x000000, 0.03)
          shadow.fillRect(4, 4, def.w, bboxH)
        }

        const tc = pressed ? colors.pressedTop : colors.top
        const bc = pressed ? colors.pressedBottom : colors.bottom
        drawTrapezoid(gfx, 0, 0, def.w, leftH, rightH, tc, bc)

        const off = (rightH - leftH) / 2
        bdr.lineStyle(1, tc, 0.3)
        bdr.beginPath()
        bdr.moveTo(0, 0)
        bdr.lineTo(def.w, off)
        bdr.lineTo(def.w, leftH + off)
        bdr.lineTo(0, leftH)
        bdr.closePath()
        bdr.strokePath()

        txt.setPosition(def.w / 2, leftH / 2)
      }

      draw(false, def.leftH, def.rightH)
      c.add(txt)

      const bboxH = def.leftH + (def.rightH - def.leftH) / 2
      c.setSize(def.w, bboxH)
      c.setInteractive(new Phaser.Geom.Rectangle(0, 0, def.w, bboxH), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      c.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        const localX = pointer.x - c.x
        const halfW = def.w / 2
        let targetLeft = def.leftH
        let targetRight = def.rightH
        if (localX < halfW) {
          targetLeft = def.leftH - 5
        } else {
          targetRight = def.rightH - 5
        }
        if (targetLeft !== currentLeftH || targetRight !== currentRightH) {
          currentLeftH = targetLeft
          currentRightH = targetRight
          this.tweens.killTweensOf(this, '')
          this.tweens.add({
            targets: {},
            duration: 100,
            onUpdate: () => draw(isPressed, currentLeftH, currentRightH),
          })
        }
      })

      c.on('pointerout', () => {
        currentLeftH = def.leftH
        currentRightH = def.rightH
        this.tweens.killTweensOf(this, '')
        if (!isPressed) draw(false, def.leftH, def.rightH)
      })

      c.on('pointerdown', () => {
        isPressed = true
        draw(true, currentLeftH, currentRightH)
        c.setPosition(def.x + 2, def.y + 2)
      })

      c.on('pointerup', () => {
        if (!isPressed) return
        isPressed = false
        draw(false, currentLeftH, currentRightH)
        c.setPosition(def.x, def.y)
        switch (def.key) {
          case 'terminal': this.scene.start('ChapterSelectScene'); break
          case 'squad': this.scene.start('SquadScene', { levelId: 'menu', chapterId: 'menu', levelData: null }); break
          case 'editor': this.scene.start('EditorScene'); break
        }
      })

      c.on('pointerout', () => {
        if (!isPressed) return
        isPressed = false
        draw(false, currentLeftH, currentRightH)
        c.setPosition(def.x, def.y)
      })

      // entry animation: fade in from right
      const targetX = def.x
      c.x = targetX + 30
      c.setAlpha(0)
      const delay = def.key === 'terminal' ? 150 : def.key === 'squad' ? 250 : 350
      this.tweens.add({
        targets: c,
        x: targetX,
        alpha: 1,
        duration: 300,
        delay,
        ease: 'Sine.easeOut',
      })
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/HomeBridgeScene.ts
git commit -m "feat(home-bridge): create HomeBridgeScene with trapezoid buttons and animations"
```

---

### Task 3: Add SquadScene menu mode

**Files:**
- Modify: `src/scenes/SquadScene.ts`

When `this.levelId === 'menu'`:
- Save/load squad using key `'menu_squad'` instead of `this.levelId`
- Hide the "Start Mission" button (make green button)
- Show a "BACK" button that goes to `HomeBridgeScene`
- Show "SQUAD PRESET" title instead of "SQUAD SELECTION"
- Hide HOME button (since we're in menu mode, it'd be redundant)

- [ ] **Step 1: Modify SquadScene to handle menu mode**

In `init()`, after loading:
```typescript
// --- insert after: const savedSkills = loadPickedSkills(this.levelId) ---
const squadKey = this.levelId === 'menu' ? 'menu_squad' : this.levelId
```

In `create()`:
- Change subtitle text when menu mode
- Replace "Start Mission" button with BACK button
- Replace HOME button behavior or hide it

```typescript
// file: src/scenes/SquadScene.ts

// In init(), after save loading:
// (no changes needed to init - levelId is stored, saveSquad/loadSquad will be patched)

// In create(), replace the navigation button section (lines 97-116):

if (this.levelId === 'menu') {
  // menu mode: back to HomeBridgeScene, no start mission
  makeNodeButton(this, 16, 16, '< BACK', () => {
    this.scene.start('HomeBridgeScene')
  }, { w: 72, h: 32, textSize: '11px' })
} else {
  makeNodeButton(this, 16, 16, '< BACK', () => {
    this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
  }, { w: 72, h: 32, textSize: '11px' })
  makeNodeButton(this, 94, 16, 'HOME', () => {
    this.scene.start('ChapterSelectScene')
  }, { w: 72, h: 32, textSize: '11px' })
  makeNodeButton(this, W - 160, H - 48, 'Start Mission', () => {
    const squad = this.slots.filter((s): s is UnitConfig => s !== null)
    if (squad.length === 0) return
    if (!this.levelData) return
    this.scene.start('GameScene', {
      level: this.levelData,
      squad,
      pickedSkills: this.pickedSkills,
      chapterId: this.chapterId,
      levelId: this.levelId,
      autoStart: true,
    })
  }, { w: 140, h: 38, role: 'primary' })
}
```

Also update the subtitle text:
```typescript
// line 58-63: subtitle text
const subtitle = this.levelId === 'menu'
  ? 'Build and save your squad preset. Used as default for new levels.'
  : 'Tap an empty slot to pick a unit. Pre-filled squad is ready to deploy.'
this.add.text(W / 2, 44, subtitle, {
  ...FONTS.small, color: COLORS.text.dim,
}).setOrigin(0.5, 0)
```

Also patch `persistSquad()` and `onSlotClick()` to use `'menu_squad'` key:
```typescript
private get squadKey(): string {
  return this.levelId === 'menu' ? 'menu_squad' : this.levelId
}
```

Then replace `this.levelId` with `this.squadKey` in `persistSquad()` and wherever `saveSquad`/`loadSquad`/`savePickedSkills`/`loadPickedSkills` are called.

Currently in `init()`:
```typescript
const saved = loadSquad(this.levelId)
const savedSkills = loadPickedSkills(this.levelId)
```

Change to:
```typescript
const squadKey = this.levelId === 'menu' ? 'menu_squad' : this.levelId
const saved = loadSquad(squadKey)
if (saved) { ... }
const savedSkills = loadPickedSkills(squadKey)
if (savedSkills) { ... }
```

And in `persistSquad()`:
```typescript
private persistSquad(): void {
  const key = this.levelId === 'menu' ? 'menu_squad' : this.levelId
  saveSquad(key, this.slots.map(s => s?.id ?? null))
  savePickedSkills(key, this.pickedSkills)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/SquadScene.ts
git commit -m "feat(home-bridge): add menu mode to SquadScene for Squad Preset"
```

---

### Task 4: Verify

- [ ] **Step 1: Build**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 2: Visual check**

Start dev server, verify:
- HomeBridgeScene loads on startup with gradient background
- Title fades in from left
- Buttons fade in staggered from right
- Terminal button → ChapterSelectScene
- Squad Preset button → SquadScene in menu mode (no start mission, BACK goes home)
- Level Editor button → EditorScene
- Hover on buttons shows perspective compression
