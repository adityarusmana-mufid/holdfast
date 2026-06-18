# Perspective Grid Rendering System

**Date:** 2026-06-18
**Status:** Implemented (v1)
**Branch:** `feat/perspective-tiles` (merged to main)
**Files:** `src/entities/Grid.ts`, `src/scenes/GameScene.ts`, `src/shared/utils/GridMath.ts`

---

## Purpose

Create the illusion of a 3D perspective plane using a 2D canvas, making the level grid feel like a flat surface receding into the distance. This bridges the gap between the current flat 2D rendering and a future full 2.5D axonometric scene.

---

## Core Concept: Whole-Grid Perspective Foreshortening

Instead of applying a trapezoid transform to each tile independently (which creates visible gaps/seams), the **entire grid is treated as a single perspective plane**. Horizontal lines stay straight. Vertical lines converge toward the top. Each tile is a proper trapezoid that tiles seamlessly with its neighbors.

### Visual Effect

```
Without perspective:           With perspective:
┌──────────────────────┐       ╱────────────────────╲
│                      │      ╱                      ╲
│   Flat rectangle     │     │   Trapezoid plane      │
│   grid               │     │   (top narrower)       │
│                      │      ╲                      ╱
└──────────────────────┘       ╲────────────────────╱
```

### Key Properties

| Property | Value |
|----------|-------|
| Horizontal lines | Straight, parallel (same y spacing) |
| Vertical lines | Diagonal, converge toward top |
| Tile shape | Trapezoid (wider at bottom, narrower at top) |
| Tiling | Seamless — adjacent edges match exactly |
| Grid boundary | Overall trapezoid shape |
| Interaction areas | Rectangle-based (see below) |

---

## Design Decisions

### Decision 1: Row-Based Inset (consistent angle)

**Problem:** Using a percentage of total width (e.g., `PERSPECTIVE_FACTOR = 0.08`) means different grid sizes have different side-edge steepness. A 12×3 grid is steeper than a 12×8 grid because the same total inset is distributed over fewer rows.

**Solution:** Define perspective as a **fixed pixel inset per row** (`ROW_INSET = 6`). Each row is `ROW_INSET` pixels narrower on each side than the row below.

```
topInset = ROW_INSET × rows
```

This keeps the side-edge angle constant across all grid sizes:

| Grid | Rows | Top inset | Side angle |
|------|------|-----------|------------|
| 12×3 | 3    | 18px      | atan(6/64) ≈ 5.4° |
| 12×8 | 8    | 48px      | atan(6/64) ≈ 5.4° |
| 16×10| 10   | 60px      | atan(6/64) ≈ 5.4° |

**Tuning:** Change `ROW_INSET` at `src/entities/Grid.ts:8`. Higher values = more dramatic perspective. Start at 6, try 4-12 range.

### Decision 2: Per-Tile Trapezoid → Whole-Grid Trapezoid

**First attempt:** Each tile independently drawn as a trapezoid (top edge inset 6px relative to its cell). This creates triangular gaps at the top corners of each tile — tiles don't tile seamlessly.

**Final approach:** Whole-grid perspective. The grid's left and right edges are straight diagonal lines from top to bottom. Each tile's four corners are where the horizontal row boundaries intersect the vertical column lines.

```
Vertical line for column c connects:
  Top:    (offsetX + c×TILE_SIZE + ROW_INSET×(rows - 0), offsetY)
  Bottom: (offsetX + c×TILE_SIZE, offsetY + rows×TILE_SIZE)

Horizontal line for row r connects:
  Left:  (offsetX + ROW_INSET×(rows - r), offsetY + r×TILE_SIZE)
  Right: (offsetX + cols×TILE_SIZE - ROW_INSET×(rows - r), offsetY + r×TILE_SIZE)
```

### Decision 3: Visual vs Interaction Separation

The perspective transform is **visual only**. Click detection uses a simplified reverse-transform:

```
pixelToTile(x, y):
  1. Determine row from y: row = floor((y - offsetY) / TILE_SIZE)
  2. Determine row's left/right x bounds (perspective-aware)
  3. Determine column from x: col = floor((x - rowLeft) / (rowWidth / cols))
```

This means:
- **Visual:** Tiles are trapezoids, grid lines diagonal
- **Interaction:** Click areas are perspective-correct trapezoids
- **Units/Enemies:** `tileToPixel()` returns trapezoid center, placing sprites correctly within the perspective grid
- **Overlays:** Hover indicator, range preview remain as rectangles (UI layer, not world)

---

## Coordinate System

All coordinates are in Phaser's screen pixel space. The grid does NOT use isometric or transformed coordinates.

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `tileToPixel(row, col)` | Grid row/col | Screen `{x, y}` (center of tile) | Placing unit/enemy sprites |
| `pixelToTile(x, y)` | Screen position | `{row, col}` or null | Click detection |
| `getTileCenter(row, col)` | Grid row/col | Screen `{x, y}` | Internal helper |

The tile center is computed as the centroid of the trapezoid (average of top-center and bottom-center):

```
topX = (tileLeft(r, c) + tileRight(r, c)) / 2
bottomX = (tileLeft(r+1, c) + tileRight(r+1, c)) / 2
centerX = (topX + bottomX) / 2
centerY = offsetY + row × TILE_SIZE + TILE_SIZE / 2
```

## Grid Offset Centering

Both EditorScene and GameScene center the grid horizontally between UI panels.

**EditorScene:**
```
leftMargin = paletteRightEdge + gap/2
paletteRightEdge = 10 + 140 + 10  (= 160)
editorOffsetX = 10 + 140 + 10 + floor((1074 - 160 - gridW) / 2)
```

**GameScene:**
```
leftArea = 160  (matches palette area)
availW = screenWidth - leftArea
gridOX = leftArea + floor((availW - gridW) / 2)
gridOY = GRID_OFFSET_Y  (= 128, constant)
```

The grid's `offsetX` and `offsetY` properties are public and used by `drawGridOverlay()` in GameScene.

---

## Rendering Pipeline (render() method)

For each tile `(r, c)`:

1. **Body fill** — trapezoid polygon, slightly inset (1px) to avoid overlap
   - `fillPoints([topLeft, topRight, bottomRight, bottomLeft], true)`
2. **Shadow strip** — if elevated (Ranged/Wall) and nothing elevated below
   - Full-width rectangle at tile's bottom edge, representing side face
   - Hidden when tile below is also elevated (continuous platform effect)
3. **Border** — trapezoid outline, exact tile corners (no inset)
   - Ranged tiles: 2px, 0.9 alpha, orange color
   - Other tiles: 1px, 0.6 alpha, type-specific color
4. **Special decorations** (depending on type):
   - Spawn/Goal: X lines connecting trapezoid corners + triangle with exclamation
   - RepairNode: green cross centered on tile
   - ArmorGrid: blue shield centered on tile

After all tiles, grid lines are drawn:
- Horizontal: straight at each row boundary
- Vertical: diagonal from top position to bottom position

---

## Tile Colors & Borders

Defined in `src/shared/utils/GridMath.ts`:

| Tile Type | Fill Color | Border Color | Width | Notes |
|-----------|-----------|-------------|-------|-------|
| Ground    | `#b0b8c4` | `#555555`   | 1     | Deployable (ground units) |
| Ranged    | `#d4d8dc` | `#ffa000`   | 2     | Deployable (ranged units), orange border |
| Floor     | `#5a5a5a` | `#7a7a7a`   | 1     | Non-deployable |
| Wall      | `#1a1a1a` | `#333333`   | 1     | Non-deployable, elevated |
| Spawn     | `#cc4444` | `#ff6666`   | 1     | Red X + triangle |
| Goal      | `#4444cc` | `#6666ff`   | 1     | Blue X + triangle |
| RepairNode| `#b0b8c4` | `#44cc55`   | 1     | Green cross icon |
| ArmorGrid | `#b0b8c4` | `#4488cc`   | 1     | Blue shield icon |

---

## Integration with Other Systems

### Units (UnitSprite)
- Positioned via `tileToPixel()` → gets perspective-adjusted center
- Rendered as flat shapes (rounded rect/triangle) centered on tile
- HP bar, label, facing indicator all relative to center

### Enemies (EnemySprite)
- Positioned via `tileToPixel()` for waypoint movement
- Interpolate between waypoints using tile center positions
- Visual position updated each frame

### Combat System
- Uses `tileToPixel()` to display damage/heal numbers
- Range preview overlay uses `tileToPixel()` for tile center positions
- Hover indicator uses `tileToPixel()` for tile center (draws rectangle overlay)

### Healing System
- Checks if unit's grid position matches Repair Node tile position
- No visual perspective dependency

---

## Tuning Guide

### Making perspective more visible
Increase `ROW_INSET` in `src/entities/Grid.ts`:
| Value | Side angle | Effect |
|-------|-----------|--------|
| 4     | ~3.6°     | Subtle |
| 6     | ~5.4°     | Current |
| 8     | ~7.1°     | Noticeable |
| 12    | ~10.6°    | Dramatic |

### Potential collisions
Higher `ROW_INSET` + many rows → grid top may overlap with UI at top of screen. If this happens:
- Reduce `ROW_INSET`
- Or increase `offsetY` (grid starting Y)
- Or reduce grid height (fewer rows displayed)

---

## Future: 2.5D Axonometric Transition

The perspective grid is designed as a stepping stone to full 2.5D:

| Aspect | Current (perspective) | Future (2.5D axonometric) |
|--------|----------------------|---------------------------|
| Coordinate system | Screen pixel, flat Y | Isometric `(row, col)` → `(screenX, screenY)` |
| Tile shape | Trapezoid (Phaser Graphics) | Sprite-based (pre-baked tile art) |
| Grid lines | Graphics polygon | Sprite edges or custom shader |
| Unit rendering | Flat shapes, centered | Sprites with depth offset |
| Depth sorting | None (all same plane) | Painter's algorithm (back-to-front) |
| Elevation | Shadow strip (2D hint) | Vertical side faces on sprites |

The perspective grid's coordinate separation (visual vs interaction) means the interaction layer (`pixelToTile`, `tileToPixel`) can remain unchanged while visual rendering is swapped out.

---

## History

| Date | Change | Reason |
|------|--------|--------|
| 2026-06-18 | Initial implementation (PERSPECTIVE_FACTOR = 0.08) | Whole-grid trapezoid approach |
| 2026-06-18 | Changed to ROW_INSET = 6 | Consistent side angle across grid sizes |
| 2026-06-18 | GameScene grid centering | Grid was colliding with left UI palette |
