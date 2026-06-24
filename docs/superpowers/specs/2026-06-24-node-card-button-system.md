# Holdfast — Node-Card Button System

**Date:** 2026-06-24
**Status:** Design + Implementation
**Scope:** Replace `makeMetalButton` with `makeNodeButton`, migrate all clickable UIs to sharp-rect + gradient + multi-pass shadow

---

## 1. Motivation

The current `makeMetalButton` uses a parallelogram (skewed) shape with a single shadow layer and a metallic gradient. This conflicts with the established node-card design language (sharp rectangles, multi-pass soft shadow, monochromatic gradient). All buttons and clickable containers should use a unified visual system.

---

## 2. `makeNodeButton` — New Button Factory

Replaces `makeMetalButton` entirely. Located in `src/ui/Components.ts`.

### Visual properties

| Property | Value |
|----------|-------|
| Shape | Sharp rectangle (no `roundRect`, no `skew`, no border) |
| Shadow | 6-pass offset (2→12px, alpha 0.08→0.01) — identical to node cards |
| Press state | Colors darken, shadow offset reduces from 6 to 2 layers visible |
| Hover state | Fill lightens slightly, rectangle expands +2px each side |

### Color roles

All gradients use `fillGradientStyle` (top → bottom).

| Role | Top | Bottom | Press Top | Press Bottom | Text | Usage |
|------|-----|--------|-----------|--------------|------|-------|
| Default | `#d5dbe3` | `#c0c4cc` | `#c0c4cc` | `#a8acb4` | `#1a1a2e` | Back, Retry, Intel, Auto Fill, filter, tool buttons |
| Primary | `#4a4a4a` | `#303030` | `#383838` | `#282828` | `#ffffff` | ENTER, Start Mission, Confirm, Play, Export |
| Danger | `#d5dbe3` | `#c0c4cc` | `#c0c4cc` | `#a8acb4` | `#d32f2f` | Retreat, Erase, Delete |
| Disabled | `#e0e2e5` (alpha 0.8) | same | same | same | `#b0b8c4` | Locked/unavailable |

### API

```typescript
makeNodeButton(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  callback: () => void,
  style?: {
    w?: number          // default 140
    h?: number          // default 44
    role?: 'default' | 'primary' | 'danger' | 'disabled'
    textSize?: string   // default FONT_SIZE.sm (16px)
    textColor?: string  // overrides role default
  }
): Phaser.GameObjects.Container
```

Returns a Container with children `[shadow, bg, text]` — same pattern as `makeMetalButton` for backward compatibility (`btn.getAt(2)` for text).

---

## 3. Per-Element Migration

### 3.1 Clickable Buttons (35 sites → `makeNodeButton`)

| Scene | Current button | New role | Notes |
|-------|---------------|----------|-------|
| LevelSelectScene | `< Back` | default | Info panel: INTEL (default), ENTER (primary) |
| ChapterSelectScene | `Editor` | default | Chapter cards → see §3.2 |
| SquadScene | `< Back` | default | |
| SquadScene | `Start Mission` | primary | |
| SquadScene | `Auto Fill` | default | |
| PickerScene | `< Back` | default | |
| PickerScene | `Confirm` | primary | |
| LevelPreviewScene | `< Back` | default | |
| LevelPreviewScene | `ENTER` | primary | |
| LevelPreviewScene | `MAP` / `ENEMY INTEL` | default | Toggle-style, active gets primary |
| GameScene | `x1`/`x2` speed | default | Small (w:48, h:28), no hover expand |
| GameScene | `[ II ]` pause | default | Same small size |
| GameScene | Pause menu buttons | default | |
| GameScene | Retreat button | danger | Thin (w:220, h:20) |
| GameScene | Close / Cancel | default | Same thin size |
| GameScene | `Restart Simulation` | default | |
| GameScene | `Back to Editor` | default | |
| ResultScene | `Retry` | default | |
| ResultScene | `Next Level` | primary | |
| ResultScene | `Back to Levels` | default | |
| EditorScene | Clear Grid, Export, Import | default | |
| EditorScene | Waypoints toggle | default | Active = primary |
| EditorScene | Clear Waypoints | danger | |
| EditorScene | Erase toggle | danger | Active = darker |
| EditorScene | ▶ Play | primary | |
| EditorScene | Test Combat | danger | |
| EditorScene | Size buttons | default | Small (w:68) |

### 3.2 Clickable Containers (cards, slots, panels)

| Scene | Element | Treatment |
|-------|---------|-----------|
| ChapterSelectScene | Chapter cards | Sharp rect, `#ffffff` → `#f0f0f0` gradient, 6-pass shadow, no border. Hover: expand +2px. Click → navigate. |
| PickerScene | Unit selection cards | Node-card base (default gradient) + colored unit icon + labels. Selection: cyan inner border or accent. |
| PickerScene | Filter buttons | Small node buttons (default role), active = primary role |
| SquadScene | Squad slots | Node-card base (default gradient) + colored unit icon. Empty: lighter grey variant. |
| GameScene | Unit cards | Node-card base + colored icon. Selected: accent state. Cooldown: dark overlay. |
| GameScene | Guide overlay | Sharp rect panel, white gradient fill, 6-pass shadow. Cyan diamond icon. |
| GameScene | Enemy toast | Sharp rect, dark grey gradient (`#4a4a4a`→`#303030`), shadow. Colored enemy circle. |
| LevelPreviewScene | Enemy intel cards | Sharp rect, white gradient fill, shadow. Colored enemy circle. |
| EditorScene | Palette buttons | Colored rect inside node-card frame (thin dark grey border + shadow) |

### 3.3 Static Panels (no interaction, just frames)

| Scene | Element | Treatment |
|-------|---------|-----------|
| PickerScene | Sidebar | `#d5dbe3`→`#c0c4cc` gradient fill, shadow on right edge |
| GameScene | Card bar | Subtle grey gradient background strip at bottom |
| GameScene | Stats panel | Small gradient panel behind stats text |
| LevelSelectScene | Info panel | White gradient fill, shadow on left edge (already close, just align gradients) |

### 3.4 Editor DOM Panels

The route editor and wave editor use DOM elements with CSS. These keep their existing styling. Only the Phaser toolbar buttons (left side of EditorScene) get node-card treatment.

---

## 4. Color Palette Additions

Add to `Constants.ts`:

```typescript
nodeButton: {
  defaultTop: 0xd5dbe3,
  defaultBottom: 0xc0c4cc,
  defaultTopPressed: 0xc0c4cc,
  defaultBottomPressed: 0xa8acb4,
  primaryTop: 0x4a4a4a,
  primaryBottom: 0x303030,
  primaryTopPressed: 0x383838,
  primaryBottomPressed: 0x282828,
}
```

Shadow uses existing `0x000000` with alpha steps (same as nodes).

---

## 5. Implementation Order

1. `src/ui/Components.ts` — Write `makeNodeButton`, keep `makeMetalButton` as deprecated wrapper during migration
2. `src/ui/Constants.ts` — Add nodeButton color constants
3. Migrate per scene (lowest risk first):
   - ResultScene (3 buttons, isolated)
   - LevelSelectScene (3 buttons + info panel)
   - ChapterSelectScene (chapter cards + 1 button)
   - LevelPreviewScene (tab + 2 buttons + intel cards)
   - SquadScene (12 slots + 3 buttons)
   - PickerScene (20+ cards + 8 filters + sidebar + 2 buttons)
   - GameScene (unit cards + all buttons + guide + toast)
   - EditorScene (toolbar buttons + palette)
4. Remove `makeMetalButton` from Components.ts
5. Verification: build, test, screenshot compare

---

## 6. Out of Scope

- Editor DOM panels (CSS-styled route/wave editors)
- Scene background gradients and grid lines
- HUD floating text without containers (DP, lives, wave counter)
- BootScene (no UI)
