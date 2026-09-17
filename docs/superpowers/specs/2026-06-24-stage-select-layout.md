# Holdfast — Stage Select Scene Layout Rules

**Date:** 2026-06-24
**Status:** Draft — user to add Arknights-derived rules
**Reference:** Arknights Terminal / Stage Select (Main Theme)

---

## 1. Purpose

Define the layout rules for the Stage Select scene (LevelSelectScene). These rules govern node card geometry, hexagon proportions, scroll bounds, connecting lines, info panel, and visual styling. The goal is an Arknights-inspired node progression map rendered entirely in monochromatic geometric shapes.

---

## 2. Node Card

| Rule | Value | Rationale |
|------|-------|-----------|
| Shape | Sharp rectangle, no rounded corners | Monochromatic geometric constraint |
| Dimensions | `nodeW = 90px`, `nodeH = 26px` | Fixed, not dynamic |
| Shadow | 6-layer multi-pass offset shadow (2→12px, alpha 0.08→0.01) | Soft depth without blur/postFX |
| Border | None | Depth from shadow layers only |
| Unlocked (operation) | Fill gradient `#ffffff`→`#f0f0f0` | White-to-off-white |
| Unlocked (tutorial) | Fill gradient `#4a4a4a`→`#383838` | Dark grey to distinguish tutorials |
| Completed (operation) | Same as unlocked | Monochromatic respect |
| Completed (tutorial) | Fill gradient `#424242`→`#303030` | Slightly darker than unlocked tutorial |
| Locked | `#e0e2e5` at alpha 0.8 | Muted, low contrast |
| Text (operation) | `#1a1a2e`, 16px, bold | Level ID centered in card |
| Text (tutorial) | `#cfd8dc`, 14px, bold | Lighter on dark background |
| Text (locked) | `#b0b8c4` | Greyed out |
| Hover (unlocked) | Expand +2px each side, fill `#ffffff` | Clean white expand without border |

## 3. Tag / Label Bar

| Rule | Value | Rationale |
|------|-------|-----------|
| Position | Above node card, flush against node top | Arknights: label sits above stage card |
| Width | Full node width (`90px`) | Extends edge-to-edge of node |
| Height | `12px` | Compact single-line label |
| Fill | `#000000` (opaque black) | High contrast against node and background |
| Text | "OPERATION" or "TUTORIAL", 7px white bold, centered | Monospace, full words |
| Combined height (node + tag) | `38px` | Used as reference for hexagon sizing |

## 4. Hexagon

| Rule | Value | Rationale |
|------|-------|-----------|
| Orientation | Pointy side up | Arknights standard |
| Height | `7/8 × combinedHeight` ≈ `33px` | Slightly shorter than node+tag |
| Width | `√3/2 × hexH` (derived from height) | Regular hexagon geometry |
| Position (x) | Center at `-nodeW/2` (node's left edge) | Half the hexagon overlaps the node |
| Position (y) | Bottom vertex coincides with node bottom-left corner | Anchored to node corner |
| Overlap | ~50% of hexagon over node card | Matches Arknights overlap |
| Fill (operation) | `#ffffff`, alpha 1 | White |
| Fill (tutorial) | `#424242`, alpha 1 | Dark grey |
| Fill (locked) | `#b0b8c4`, alpha 0.5 | Muted |

## 5. Connecting Lines

| Rule | Value |
|------|-------|
| Width | `3px` solid |
| Color (completed) | `#90a4ae`, alpha 0.9 |
| Color (default) | `#cfd8dc`, alpha 0.5 |
| No multi-color segments | Single grey tone per line |

## 6. Scroll Bounds

| Rule | Formula | Purpose |
|------|---------|---------|
| scrollMin | `pad + firstNode.x - W/2` | Scroll so first node centers on screen |
| scrollMax | `pad + lastNode.x - W/2` | Scroll so last node centers on screen |
| Clamp | `[scrollMin, scrollMax]` | Wheel scroll clamped within these bounds |
| Initial scrollX | `0` | Default view at content start |

The scroll container starts at `x = pad` (80px from left edge). The pad is the left/right margin of the visible area, also used as the x-origin of the scroll container and mask.

## 7. Info Panel

| Rule | Value |
|------|-------|
| Position | Right side, width = `W/6` |
| Background | White fill, left border line |
| Overlay | Semi-transparent black over the remaining 5/6 of screen |
| Open | Instant show, positioned at right edge |
| Close | Fade-out tween to the right (200ms, Quad.easeIn) |
| Content | Level name, wave count, enemy total, deploy limit, stars, enemies defeated |

## 8. Color Palette (Monochromatic)

All stage select UI is limited to:

- `#ffffff` (white)
- `#f0f2f5` (background)
- `#e0e2e5` (locked fill)
- `#cfd8dc` (default lines, tutorial text)
- `#90a4ae` (completed lines, stars)
- `#b0b8c4` (locked elements)
- `#4a4a4a` / `#383838` / `#303030` / `#424242` (tutorial fills)
- `#1a1a2e` (primary text)
- `#000000` (tags, shadows at various alphas)

No green, yellow, blue, brown, or red anywhere in the stage select scene.

## 9. Background

| Rule | Value |
|------|-------|
| Color | `#f0f2f5` |
| Grid | 48px spacing, `#cfd8dc` at alpha 0.15 |

---

## 10. Node Positioning

### 10.1 Horizontal Alignment Limit

Nodes may be horizontally aligned (same y), but no more than **3 connected nodes in a row** without a vertical shift. After 2–3 aligned nodes, the next node must shift vertically for height variation.

Two connected nodes may also be vertically aligned (same x), but the next connected node after that must be to the right (positive x shift) — not continuing the vertical column.

### 10.2 Minimum Gap Between Nodes

The gap between node edges (not centers) must be at least **half a node width**, and preferably a **full node width**.

With `nodeW = 90px`:
- **Minimum gap (edge-to-edge):** `45px` → center-to-center spacing at least `135px`
- **Preferred gap (edge-to-edge):** `90px` → center-to-center spacing at least `180px`

### 10.3 Layout Approach

Arknights does not use a mechanical zigzag. Layout should be deliberate with branches, forks, and thematic grouping. Each chapter's node positions are hand-authored (not algorithmically generated) to give each chapter a distinct visual flow.

### 10.4 Current Chapter 1 Layout (Prologue)

```
| Level | x     | y    | Notes                            |
|-------|-------|------|----------------------------------|
| 0-1   | 40    | 0    | Intro — flat                     |
| TR-1  | 200   | 30   | +160x, +30y                      |
| 0-2   | 360   | -30  | +160x, -60y                      |
| TR-2  | 520   | 0    | +160x, +30y                      |
| 0-3   | 680   | 30   | +160x, +30y                      |
| TR-3  | 840   | -30  | +160x, -60y                      |
| 0-4   | 1000  | 0    | +160x, +30y                      |
| TR-4  | 1160  | 30   | +160x, +30y                      |
| 0-5   | 1320  | -30  | +160x, -60y                      |
| TR-5  | 1480  | 0    | +160x, +30y                      |
| 0-6   | 1640  | 30   | +160x, +30y                      |
| TR-6  | 1800  | -30  | +160x, -60y                      |
| 0-7   | 1960  | 0    | +160x, +30y                      |
| TR-7  | 2120  | 30   | +160x, +30y                      |
| 0-8   | 2280  | -30  | +160x, -60y                      |
```

**Spacing:** `160px` center-to-center → edge-to-edge gap of `160 - 90 = 70px`. Satisfies the minimum (≥45px) and approaches the preferred (≥90px).

## 11. Hexagon Progress Indicator

The hexagon doubles as a completion-rating indicator using a cake/pie-chart metaphor.

### 11.1 States

| State | Visual | Details |
|-------|--------|---------|
| Not tried / locked | No hexagon | Stage hasn't been attempted |
| Failed | Dark grey fill + white border (container only) | Attempted but never completed |
| Completed (normal) | Container + cyan sector fill by stars | Sector = `stars × 2` hex segments (1/3, 2/3, or full) |
| Completed (challenge) | Container + cyan sector fill + **white frosting** | TBD — adds a white decorative layer on top |

### 11.2 Sector Fill

- Progress fill color: `#00bcd4` (cyan) — deviates from monochromatic rule by design
- The hexagon is a 6-segment cake (60° per segment)
- **1 star** = 2 segments filled (1/3 of hexagon, from top clockwise through lower-right)
- **2 stars** = 4 segments filled (2/3 of hexagon, from top clockwise through lower-left)
- **3 stars** = full hexagon filled

### 11.3 Challenge Mode "White Frosting" *(deferred — no challenge mode yet)*

When challenge mode is implemented and a stage is cleared in challenge mode, the hexagon gets an extra white decorative overlay. Exact visual TBD (inner stroke, highlight rim, or frosting layer on the filled sector). Documented for future reference.

### 11.4 Color Reference

| Element | Color | Alpha | Technique |
|---------|-------|-------|-----------|
| Shadow (offset +2, +2) | `#000000` | 0.08 | Full hexagon, offset |
| White border/thick rim | `#ffffff` | 1 | Full-size hexagon fill |
| Recessed interior | `#424242` (dark grey) | 1 | Inset hexagon fill (-7px height) |
| Progress fill (cyan) | `#00bcd4` | 1 | Sector or full fill at inset size |
| Frosting (challenge) | `#ffffff` | TBD | TBD — decorative overlay on sector |

## 12. User-Addable Rules

*(To be filled from Arknights observation)*
