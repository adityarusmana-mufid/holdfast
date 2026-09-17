# Visual Direction — Blueprint Aesthetic

**Date:** 2026-06-18
**Source:** Plumber's Creed screenshot analysis (Gemini Vision)
**Context:** The visual reference that inspired Holdfast's look — a clean, blueprint-like aesthetic with high contrast and subtle gradients.

---

## Principle

Borrow the **visual language**, not the theme. Plumber's Creed is a pixel-art platformer; Holdfast is a mechanical/military tower defense. The shared DNA is:

> *A stark, desaturated canvas with subtle depth, a ghost-grid overlay, and high-contrast foreground elements that pop like technical illustrations.*

---

## Color & Background

| Property | Value | Notes |
|----------|-------|-------|
| Base fill | `#E6E6E6` | Light warm gray — the "canvas" |
| Gradient | Vertical vignette + center glow | Edges slightly darker (~`#C8C8C8`), center brighter |
| Purpose | Creates soft depth without 3D rendering | Keeps focus on gameplay elements |

**Implementation:** Phaser Graphics with `fillGradientStyle()` or `fillGradientStyle()` on a full-screen rectangle behind the grid.

---

## Grid Overlay

| Property | Value | Notes |
|----------|-------|-------|
| Color | `#F0F0F0` | Almost white — ghost-like |
| Thickness | 1px | |
| Opacity | Very low (~0.3) | Subtle; reinforces blueprint feel |
| Purpose | Structural reference without visual clutter | Must not compete with tiles |

**Implementation:** A separate Graphics layer drawn behind tiles (or on top of background, under tiles). Grid lines at TILE_SIZE intervals matching the grid.

---

## Foreground Elements (Tiles, Units, Enemies)

| Property | Value | Notes |
|----------|-------|-------|
| Principle | High contrast against light background | Darker, more saturated colors |
| Outlines | Strong, consistent | Black or very dark stroke on tiles/units |
| Shading | Flat with subtle depth | Blocky pixel-art style |

**Current state:** Tiles are `0x3a3a3a` (dark gray) with no stroke — inverted from the reference. Should be lighter with visible borders.

---

## UI

| Property | Value | Notes |
|----------|-------|-------|
| Text | Black (#000) or dark gray | High contrast on light background |
| Icons | Monochrome, outlined or filled | Consistent style |
| Density | Minimalist | Sparse corners, keep center clear |

**Current state:** Already mostly minimalist. Text color is a stylized blue-grey — could shift toward pure black for readability, but not critical.

---

## Secondary Reference: Arknights Fangame (Axonometric Perspective)

**Source:** `/tmp/opencode/fangame-reference.png` (Reddit — custom Arknights fan game stage)

### Perspective & Tile Details

| Aspect | Detail |
|--------|--------|
| View type | Angled top-down (axonometric/isometric 2.5D) |
| Ground tiles | Muted dark-grey / medium-grey checkerboard pattern |
| Elevated tiles | Bright white/light-grey top faces with yellow crosshairs |
| Top edges | Vibrant orange/yellow highlight (deployment zone marker) |
| Side faces | Darker grey (shadow simulation) |
| Grid lines | Thin, visible at tile boundaries |
| Units | Front-facing sprites (billboarding), readable at any grid position |

### Why It Works for Tower Defense

- **Instant readability** — elevation is visual, not text-based. Ground vs ranged tiles are immediately distinguishable by height alone.
- **No label clutter** — no "Ground" / "Ranged" text markers needed.
- **Tactical clarity** — pathing and placement zones readable at a glance.

### Phaser 2D Implementation Path

Full 2.5D is deferred, but the v1 approach would require:
1. Isometric coordinate mapping: `(row, col)` → angled screen coords
2. 2.5D tile sprites: pre-baked top + front + side faces in one graphic
3. Depth sorting (painter's algorithm): render back-to-front, top-left first
4. Front-facing unit sprites with depth offset

### v1 Flat Approximation (before 2.5D)

Until the 2.5D scene is built, we can approximate with:
- Checkerboard ground pattern (alternating grey shades)
- Lighter elevated tiles with darker "shadow" strip on one edge
- Orange/yellow border on deployable ranged tiles
- No text labels on tiles (remove "Ground" / "Ranged" text)

---

## Implementation Status

| Item | Status | Notes |
|------|--------|-------|
| Background gradient | ✅ Done | `drawBgGradient()` at `GameScene.ts:986` — interpolates `#f4f6f8` → `#f0f4f8` |
| Grid overlay | ✅ Done | Ghost lines at tile boundaries (`#f0f0f0`, 1px, 0.3 alpha) — `drawGridOverlay()` at depth -5 |
| Tile color/outline update | 🔲 Deferred | Depends on 2.5D scene design |
| Checkerboard ground | 🔲 Deferred | Part of 2.5D scene design |
| Remove tile text labels | 🔲 Deferred | Part of 2.5D scene design |
| UI color shift | 🔲 Low priority | Mostly fine as-is |
