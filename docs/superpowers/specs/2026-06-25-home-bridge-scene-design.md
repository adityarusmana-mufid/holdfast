# Home Bridge Scene Design

Date: 2026-06-25
Status: Draft
Replaces: ChapterSelectScene as the startup scene

## Overview

A new `HomeBridgeScene` that serves as the first screen on startup, replacing `ChapterSelectScene`. It provides navigation to the three main game modes: Terminal (chapter select / gameplay), Squad Preset (squad management), and Level Editor (community content creation).

## Layout (1280×720)

### Background

Linear gradient from top to bottom: `#ffffff` → `#f0f2f5` → `#e8ecf0`. Clean, light, modern aesthetic.

### Left Side — Title

- **Text**: "HOLDFAST" at position (60, 60)
- **Font**: `{ fontSize: '36px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold', color: '#1a1a2e' }`
- Below the title: a thin horizontal accent line (1px, `#cfd8dc`), width 280px, starting at x=60, y=105

### Right Side — Navigation Buttons

Three trapezoid-shaped buttons right-aligned, stacked vertically and centered as a group on the right side of the screen.

**Button geometry** (all buttons):
- Trapezoid shape: left edge is the reference height, right edge is taller by 8px (perspective tilt, right side feels closer)
- Corner positions relative to container origin (0,0):
  - Top-left: (0, 0)
  - Top-right: (W, offset) where offset = (rightH - leftH) / 2
  - Bottom-right: (W, leftH + offset)
  - Bottom-left: (0, leftH)
- Border: 1px semi-transparent darker shade of the fill color
- Corner radius: none (sharp trapezoid edges)

**Mobile-friendly sizing**: Button stack is sized to cover ≥60% of landscape viewport height on common mobile devices. Stack total = 176px (2 rows now), covering 41% of 430px to 49% of 360px.

| Button | Width | Height (left) | Right edge extra | Gap below |
|--------|-------|--------------|-----------------|-----------|
| TERMINAL | 450px | 86px | +8px (94px total right) | 16px |
| SQUAD PRESET | 218px | 74px | +8px (82px total right) | — (same row as EDITOR) |
| LEVEL EDITOR | 218px | 74px | +8px (82px total right) | — |

**Button styling** — follows existing `makeNodeButton` aesthetic (gradient fills, multi-layer shadow, pressed state):

| Button | Role | Top gradient | Bottom gradient | Text color |
|--------|------|-------------|----------------|------------|
| TERMINAL | `primary` | `#4a4a4a` | `#303030` | `#ffffff` |
| SQUAD PRESET | `primary` | `#4a4a4a` | `#303030` | `#ffffff` |
| LEVEL EDITOR | `primary` | `#4a4a4a` | `#303030` | `#ffffff` |

**Pressed state**: On pointerdown, switch to pressed gradient colors (`primaryTopPressed`/`primaryBottomPressed` or `defaultTopPressed`/`defaultBottomPressed`), shift container +2px/+2px, reduce shadow layers. Matches `makeNodeButton` behavior exactly.

**Shadow**: 6-layer shadow matching `drawShadow()` in Components.ts — black rectangles with decreasing opacity (0.08 → 0.01) offset 2–12px.

**Border**: 1px `#a0a4ac` (TERMINAL uses darker border `#383838`) drawn as trapezoid outline.

**Text styling** (all buttons):
- `fontSize: '20px'` (TERMINAL), `'18px'` (others)
- `fontFamily: '"Share Tech Mono", "Roboto Mono", monospace'`
- `fontStyle: 'bold'`
- Centered in the button bounding box

**Alignment**: TERMINAL is right-aligned with 20px margin (x = 1280 - 20 - 450 = 810). SQUAD and EDITOR sit side-by-side in a second row, spanning the same 450px width as TERMINAL for visual balance.

**Vertical centering**: 2-row layout centered vertically:
- Total stack height: 86 + 16 + 74 = 176px
- Stack top: (720 - 176) / 2 = 272
- TERMINAL y: 272
- SQUAD PRESET y: 272 + 86 + 16 = 374
- LEVEL EDITOR y: 374 (same row as SQUAD)

### Perspective Foreshortening (1-Point Perspective)

Each button uses **1-point perspective foreshortening** to simulate depth — the right edge is taller than the left, as if the buttons sit on a plane receding toward a vanishing point off-screen left.

**Physics**: In perspective projection, apparent size is inversely proportional to distance. An object at distance `d` subtends an angle `θ ≈ h/d`. As the plane recedes to the left, the left side is farther (smaller), the right side is closer (larger). Both edges share a vertical midpoint, so the right edge extends equally above and below the left edge — this centers the perspective shift, making the button appear to tilt toward the viewer on the right side.

**Implementation** (`drawTrapezoid`):
- Left edge: `(x, y)` → `(x, y + leftH)` — reference edge
- Right edge: `(x + w, y + leftH/2 - rightH/2)` → `(x + w, y + leftH/2 + rightH/2)` — centered around same midpoint, actual height = `rightH`
- Shadow: offset by `bboxTop = leftH/2 - rightH/2` so the multi-layer shadow follows the bounding box

**Intensity**:
| Button | leftH | rightH | Increase |
|--------|-------|--------|----------|
| TERMINAL | 86px | 98px | +14% |
| SQUAD/EDITOR | 74px | 84px | +14% |

**Hover state** (inner edge manipulation): leftH animates toward rightH, reducing perspective (TERMINAL leftH→94, SQUAD/EDITOR leftH→80). The outer edge stays fixed — the effect comes from the inner edge "catching up" to the outer edge height, making the button feel like it's tilting toward the cursor.

**Hover interaction**: On pointerover, the inner edge (leftH) tweens toward the outer edge (rightH) — the button flattens, simulating it lifting toward the viewer. TERMINAL: leftH 86→94 (near rightH=98), SQUAD/EDITOR: leftH 74→80 (near rightH=84). 150ms ease. On pointerout, leftH tweens back to default.

**Cursor**: `pointer` cursor on all buttons.

## Scene Lifecycle

### Boot → HomeBridgeScene
`main.ts` scene order: `[BootScene, HomeBridgeScene, ChapterSelectScene, LevelSelectScene, SquadScene, PickerScene, EditorScene, GameScene, ResultScene, LevelPreviewScene]`

`BootScene` starts `HomeBridgeScene` on completion.

### Navigation from HomeBridgeScene
| Button | Scene transition | Data passed |
|--------|-----------------|-------------|
| TERMINAL | `this.scene.start('ChapterSelectScene')` | none |
| SQUAD PRESET | `this.scene.start('SquadScene')` | `{ levelId: 'menu', chapterId: 'menu', levelData: null }` |
| LEVEL EDITOR | `this.scene.start('EditorScene')` | none |

### SquadScene menu mode
When entered from Home Bridge (not from LevelSelectScene), SquadScene should operate in "menu mode":
- `levelId: 'menu'` → no level-specific data
- Squad is loaded/saved to a generic `'menu_squad'` key (replace `this.levelId` with `'menu_squad'` in all `saveSquad`/`loadSquad` calls when `levelId === 'menu'`)
- The "ENTER MISSION" button is hidden; a "BACK" button is shown instead
- Clicking BACK calls `this.scene.start('HomeBridgeScene')`
- The auto-fill button still works as normal
- Skill selection (PickerScene integration) works the same as in level mode

## Files
- **New**: `src/scenes/HomeBridgeScene.ts`
- **Modified**: `src/main.ts` — add HomeBridgeScene to scene list, update order
- **Modified**: `src/scenes/SquadScene.ts` — handle `menu` levelId mode (back button instead of start, generic save key)

## Non-Goals
- **Title entry**: "HOLDFAST" fades in from the left — starts at x=40, alpha=0, tweens to target x=60, alpha=1 over 350ms, ease `Sine.easeOut`
- **Button entry**: staggered fade-in from the right — each button starts at alpha=0, x = targetX + 30, slides left to targetX while fading in over 300ms, ease `Sine.easeOut`. TERMINAL at 150ms delay, SQUAD at 250ms, EDITOR at 350ms
- **Overall**: scene camera fadeIn(300, 255, 255, 255) starts the chain
- No background music or sound effects
- No account/cloud system (localStorage only, as with existing save system)
- No decorative particle effects (may be added post-launch)
