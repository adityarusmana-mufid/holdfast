---
name: phaser-patterns
description: Use when creating, editing, or reviewing Phaser 3 scenes in Holdfast. Its PRIMARY function is STRUCTURED SCENE LAYOUT — computing world-space bounding boxes to detect overlapping/squished components, verifying visual hierarchy between nearby elements, enforcing minimum gaps and touch targets, and ensuring depth ordering doesn't conflict. Do NOT use for non-Phaser code or level JSON editing.
---

# Phaser 3 Development Patterns

## Core Purpose: Scene Layout Awareness

Every scene is a set of rectangles in world space. Before writing or reviewing any scene code, compute the **world-space bounding box** of every component and verify:
1. **No hit-area overlap** between distinct interactive elements
2. **Minimum gap** between adjacent interactive elements (≥ 8px hit-area edge to hit-area edge)
3. **Visual hierarchy** — nearby elements differ in size, color saturation, or depth to signal their relationship
4. **Decorative overhang** doesn't eat into the gap (shadows, glows, hexagons that extend beyond the interactive area)

## 1. How to Detect Overlaps & Squished Layouts

### Compute World-Space Bounding Boxes

Phaser elements have **local coordinates** that nest through parent containers. The world-space rectangle of any element is:

```
worldX = parentContainer.x + element.x
worldY = parentContainer.y + element.y
worldW = element width (from hit area, not visual overflow)
worldH = element height
```

For elements inside scroll containers, worldX shifts by scrollContainer.x at runtime.

### The Overlap Check (agent procedure)

For every pair of interactive elements in a scene:

```text
GIVEN two interactive elements A and B:
  LET A_box  = (A_worldX, A_worldY, A_worldX + A_w, A_worldY + A_h)
  LET B_box  = (B_worldX, B_worldY, B_worldX + B_w, B_worldY + B_h)
  LET gap_x  = max(0, A_box.x1 - B_box.x2, B_box.x1 - A_box.x2)
  LET gap_y  = max(0, A_box.y1 - B_box.y2, B_box.y1 - A_box.y2)
  LET gap    = gap_x + gap_y  // Manhattan gap (0 if overlapping)

  FAIL if gap < 8px                          // too squished
  WARN if gap < 12px and both are touchable  // tight on mobile
  FAIL if gap_x < 0 AND gap_y < 0            // actual overlap
```

**The hit area includes the 4px padding from `makeNodeButton`.** When checking gap, use the padded bounds `(-4, -4, W+8, H+8)`, not the visual bg `(0, 0, W, H)`.

### Common Overlap Patterns in This Codebase

| Pattern | Where it happens | How to catch it |
|---------|-----------------|-----------------|
| Side-by-side buttons with < 8px gap | Speed/pause (GameScene), INTEL/ENTER (LevelSelectScene info panel) | Check gap between adjacent button padded bounds |
| Bottom edge overflow | "Back to Levels" near screen bottom (ResultScene) | Check y + H_effective ≤ screen height |
| Filter buttons too close to card grid | PickerScene filter strip vs first card column | Check FILTER_W + 6 offset from right edge |
| Scroll container items clipping into mask edge | Any scroll container at scrollMin/scrollMax | Ensure last item edge ≤ mask edge at rest |
| Overlay covering interactive panel | Info panel overlay (LevelSelectScene) | Check overlay hit area width = panelX, not W |

## 2. Minimum Spacing & Sizing Rules

### Gap Rules

| Context | Minimum gap between hit area edges | Example |
|---------|-----------------------------------|---------|
| Side-by-side buttons | 8px | Speed/pause, INTEL/ENTER |
| Button to screen edge | 8px | Back buttons at bottom-left |
| Button to non-interactive label | 4px | Labels near buttons |
| Filter button to next filter | 4px (with 44×44 button, gap leaves 48px pitch) | PickerScene filter strip |
| Bottom of last element to screen bottom | 8px | ResultScene Back to Levels |

### Size Rules

| Context | Minimum size (effective, with padding) | Notes |
|---------|---------------------------------------|-------|
| Player-facing button height | 44px | Apple HIG minimum touch target |
| Player-facing button width | 56px | Default is 140 — rarely too small |
| Filter button (square) | 44×44 | PickerScene |
| Icon button (speed, pause) | 44px effective height | 36px bg + 8px pad |
| Info panel button | 38px effective height | LevelSelectScene INTEL/ENTER |
| Back button | 44px effective height | All Back buttons |
| Editor-only button height | 26px minimum | EditorScene toolbar (dev tool) |
| Card hit area | 44px minimum in the tap dimension | SquadScene slots (130×162) |

### When to Break These Rules

- **Editor/development-only scenes**: Can use smaller sizes (EditorScene uses h:24-26)
- **Non-interactive decorations**: No minimum size or gap (purely visual)
- **Screen-edge overflow buttons**: Reduce bottom margin rather than shrinking button

## 3. Visual Hierarchy Between Nearby Elements

When two elements are within 40px of each other, they must signal their relationship through visual hierarchy. Agents must check for these signals when reviewing or building.

### Hierarchy Signals (ranked by strength)

| Signal | Strong | Weak | None |
|--------|--------|------|------|
| Size difference | One is ≥ 1.5× the other | 1.2–1.5× | Same size |
| Depth separation | Different depth tier (see §4) | 1-2 depth apart | Same depth |
| Color saturation | One uses role color, other is dim | Both role-colored | Same color |
| Background separation | One has panel bg, other is on page | Different bg opacities | No background |

### Hierarchy Checks

```text
For every pair of interactive elements within 40px of each other:
  FAIL if they have IDENTICAL size, color, and depth
  WARN if they differ in only 1 signal
  PASS if they differ in 2+ signals
```

### Examples from the codebase

| Nearby elements | Hierarchy signals | Verdict |
|-----------------|-------------------|---------|
| Speed button + Pause button | Same size, same depth, same color (dim text) | **WARN** — identical in every signal. They're visually merged. Acceptable because they're a logical pair (speed control module). |
| INTEL button + ENTER button (info panel) | Different roles (default vs primary → different color), same size, same depth | PASS — role color differentiates them |
| Level node + Stage track line | Huge size difference, different depth, track is non-interactive | PASS — entirely different visual weight |
| Filter buttons (PickerScene) | Same size, same depth, active has different fill color | PASS — active state provides hierarchy |
| Pause overlay + Pause text | Vast size/hierarchy, overlay is full-screen dim, text is centered | PASS |

### Mobile-Specific Hierarchy Check

On mobile, hit areas are the ONLY way users interact. Two buttons with overlapping or tangent hit areas that have different functions must have:
- Different colors (role: primary vs default)
- OR a ≥ 12px gap between their EFFECTIVE hit areas (including padding)
- OR clear label text distinguishing them

## 4. Depth Tiers & Layering

Depth prevents overlapping elements from conflicting. Every scene should map its elements to these depth tiers:

| Depth range | Content | Example |
|-------------|---------|---------|
| 0–6 | Game world, grid, tiles | Grid, units, enemies, projectiles |
| 7–10 | Selection & preview overlays | Range previews (8), selection diamond (7), unit preview (8) |
| 15 | Hover/active indicators | Card hover highlight (15) |
| 19 | Overlay backdrops (dim behind panel) | Info panel overlay (19) |
| 20 | Panels, sidebars, floating cards | Info panel (20) |
| 35–39 | Modal backgrounds | Pause overlay dim (40) |
| 40–44 | Modal text, toasts | Pause text (45), enemy intros (45) |
| 50 | Modal buttons, confirm dialogs | Pause menu buttons (50), restart (50) |

**Rule**: Two elements at the same depth that overlap must differ in at least one hierarchy signal (size, color, or role).

## 5. Interactive Hit Areas

### Coordinate System

Every hit area uses **local coordinates** relative to its own origin (or its container's origin). Phaser's input system transforms through parent containers automatically.

### The Standard Button Factory

Always `makeNodeButton` from `src/ui/Components.ts`. Hit area: `(-4, -4, W+8, H+8)` — 4px pad on all sides compensating for the 12px shadow drawn at bottom-right.

```ts
makeNodeButton(this, x, y, 'Label', onClick, { w: 140, h: 48 })
```

### Custom Interactive Zones

```ts
const bg = this.add.graphics()
bg.fillRect(fx, by, w, h)
bg.setInteractive(new Phaser.Geom.Rectangle(fx, by, w, h), Phaser.Geom.Rectangle.Contains)
if (bg.input) bg.input.cursor = 'pointer'
```

Add 4px padding if visual has shadows.

### Overlay Dismiss Zones

Must be scoped to area OUTSIDE the panel:

```ts
// Correct
overlay.fillRect(0, 0, panelX, H)
overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, panelX, H), ...)
```

Resize dynamically without rebinding:
```ts
(overlay.input!.hitArea as Phaser.Geom.Rectangle).width = newWidth
```

## 6. Scroll / Drag Input

### Standard Three-Handler Pattern

```ts
let dragAnchor = 0

this.input.on('pointerdown', () => { dragAnchor = scrollX })

this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
  if (!p.isDown) return
  scrollX = Phaser.Math.Clamp(dragAnchor - (p.x - p.downX), scrollMin, scrollMax)
  container.x = pad - scrollX
})

this.input.on('wheel', (_p, _gos, _dx, dy) => {
  scrollX = Phaser.Math.Clamp(scrollX - dy * 0.8, scrollMin, scrollMax)
  container.x = pad - scrollX
})
```

Key rules:
- `p.isDown` guard — only processes while finger is pressed
- `p.downX` — delta stays relative to touch origin
- `dragAnchor` saves scrollX at press moment
- Both handlers share `scrollX` state
- No `pointerup` needed
- Children inside scroll containers use LOCAL coords for hit areas — do NOT manually subtract scroll position

## 7. Visual Overflow

### Shadow Overflow (makeNodeButton)

`drawShadow` offsets 2–12px right/bottom. Hit area padded 4px. Shadow still extends 8px beyond hit area on bottom-right. Acceptable because shadow is low-opacity (0.08–0.01).

### Decorative Overflow

Elements like hexagons on level nodes, unit glows must either:
- Be non-interactive (no `setInteractive`)
- Have hit area covering full visual extent

### Visual Overflow Adjacency Check

When overflow (shadow, glow, hexagon) from element A reaches within 4px of element B's hit area, it creates **perceptual squish** — the elements look too close even if their hit areas are correctly spaced.

**Check**: `perceptual_gap = (gap between A's VISUAL extent and B's hit area)`. If < 4px, the layout feels cramped even if technically correct.

## 8. Design-to-Canvas Layout Bridge

This is a **build-time methodology** for translating a flat, high-contrast, no-rounded-corners design language into Phaser canvas code. Layouts are computed once in `create()` and only recalculated on explicit events (`refreshLayout()`).

### 8.1 Layout Constants Module

Every scene imports these shared constants:

```typescript
// src/shared/Layout.ts
export const TW = 4  // base spacing unit (logical px)
// Never multiply by devicePixelRatio — Phaser's game.resolution handles Retina.

export const HAIRLINE = window.devicePixelRatio  // 1 physical px for borders

// Design system palette — Naked City Films inspired
export const DESIGN = {
  canvas: 0x05001A,    // deep navy background
  canvasLight: 0x000000,
  surface: 0xFFFFFF,   // card/panel backgrounds
  primary: 0x0004EB,   // electric blue accent, interactive elements
  secondary: 0xE5E7EB, // borders, low-priority framing
  textPrimary: '#FFFFFF',
  textOnSurface: '#000000',
  muted: '#6B7280',
  error: 0xD92D20,
}
```

`DESIGN` properties that are hex integers (canvas, surface, primary, secondary, error) go into `fillStyle()` / `lineStyle()`. String properties (textPrimary, textOnSurface, muted) go into `setColor()` or `color: '...'` in Text style objects.

### 8.2 The Accumulator Pattern (flex-col)

For vertical lists (deploy cards, inspect panel rows, menu items):

```typescript
let currentY = padding
const itemSpacing = 4 * TW  // gap between items

children.forEach(child => {
  child.setPosition(padding, currentY)
  currentY += child.displayHeight + itemSpacing
})
```

Store `currentY` as a class field for dynamic containers. Wrap in a `refreshLayout()` method called on events (deploy, damage, wave change), never from `update()`.

### 8.3 Origin Rules

| Component type | Origin |
|---|---|
| Panels, list items, text blocks, backgrounds | `(0, 0)` top-left |
| Buttons, screen titles, animated elements | `(0.5, 0.5)` center |

Center origin enables clean hover-scale tweens and centered alignment without manual offset math.

### 8.4 Font Rendering

- **Static labels** (titles, section headers, button labels): `scene.add.text()` with fontSize and color.
- **Dynamic text** (HP numbers, DP counters, wave numbers): `scene.add.text()` for now. Bitmap fonts are a future optimization — revisit only if frame rate drops below 30fps on target device.
- Always use exact font sizes. Do not use Phaser's scale property on text — it rasterizes at original size and stretches.

### 8.5 Shape & Border Translation (No Rounded Corners)

This project uses a sharp, zero-radius aesthetic (Infisical-inspired). All corners are 0px.

```typescript
// Panel background + border
const bg = scene.add.graphics()
bg.fillStyle(DESIGN.canvas, 1)
bg.fillRect(x, y, w, h)
bg.lineStyle(HAIRLINE, DESIGN.secondary, 0.4)
bg.strokeRect(x, y, w, h)
```

- No `fillRoundedRect` — use `fillRect` everywhere
- No `strokeRoundedRect` — use `strokeRect` everywhere
- Draw `lineStyle` / `strokeRect` AFTER `fillRect` so the border renders on top of the fill

### 8.6 Depth on Container Children

Children inherit their parent Container's `setDepth()`. Only call `setDepth` on individual children when they must break out of their container's stacking order (e.g., a tooltip that needs to float above a scroll-cropped panel).

## 9. Scene Structure Conventions

### Lifecycle

```ts
init(data):    // Reset state, receive params
create():      // 1. Background → 2. Decorations → 3. Interactive elements → 4. Overlays → 5. Navigation
```

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Container | `camelCaseContainer` | `scrollContainer` |
| Button | `camelCaseBtn` | `pauseButton` |
| Overlay graphics | `camelCaseOverlay` | `infoPanelOverlay` |
| Text | `camelCaseText` | `pauseText` |
| Scene flag | `camelCase` | `battleActive` |

### Cursor

Every interactive element: `if (obj.input) obj.input.cursor = 'pointer'`

## 10. Scene Review Checklist

When reviewing a scene for layout issues:

- [ ] Compute world-space bounds of every interactive element
- [ ] Gap between every adjacent interactive pair ≥ 8px (hit-area edge to hit-area edge)
- [ ] No actual overlap between any two hit areas
- [ ] Every interactive element effective size ≥ 44px (touch) or 32px (desktop)
- [ ] Nearby elements (< 40px apart) differ in 2+ hierarchy signals (size, depth, color, role)
- [ ] Depth assigned per tier table, not relying on creation order
- [ ] MakeNodeButton used for buttons (not inline Graphics with ad-hoc hit areas)
- [ ] Scroll child hit areas use local coords (no manual coordinate subtraction)
- [ ] Overlay dismiss zone width scoped to outside-panel area, not full screen
- [ ] Visual overflow (shadows, decorations) doesn't eat into the perceptual gap between adjacent interactive elements
- [ ] Elements at the same depth that overlap differ in size or color
- [ ] Layout calculated in create(), not update() — dynamic containers have refreshLayout() called on events
- [ ] No rounded corners anywhere — all fillRect/strokeRect, no fillRoundedRect/strokeRoundedRect
- [ ] Layout constants (TW, HAIRLINE, DESIGN) imported from Layout.ts, not hardcoded
- [ ] Origin follows component type rules: top-left for panels/list items, center for buttons/titles
- [ ] HAIRLINE borders drawn AFTER fills (lineStyle before strokeRect, not after)
- [ ] No multiplied TW by devicePixelRatio — Phaser handles Retina internally
