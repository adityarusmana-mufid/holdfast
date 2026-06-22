# Visual Philosophy — Geometric Shapes as Design Constraint

**Date:** 2026-06-22
**Context:** Explicit decision to use colored geometric shapes (no sprites, no detailed art) for Holdfast v1 — informed by successful predecessors and project-specific constraints.

---

## The Decision

Holdfast v1 renders all entities as colored geometric shapes:
- **Ground units** = rounded rectangles with inner highlight
- **Ranged units** = triangles with inner highlight
- **Enemies** = circles with directional indicator
- **Projectiles** = small squares/diamonds
- **Tiles** = colored trapezoids (perspective grid)

No pixel art. No detailed sprites. No living creature depictions. This is a deliberate constraint, not a placeholder.

---

## Why

### 1. The Religious Constraint (Non-negotiable)

No living creatures can be depicted. All entities are mechanical/military vehicles. Geometric shapes map naturally to this — a tank *is* a box, a drone *is* a triangle. Trying to draw "detailed pixel art of a robot" while avoiding anything biological adds complexity without gameplay value. Shapes skip the problem entirely.

### 2. Computational Aesthetics

The user's background in other branches of computer science drives an appreciation for minimalist, systems-driven design. A game built on clean geometry foregrounds the *systems* and *decision-making* — the geometry becomes a diagram of the strategy, not decoration around it. This aligns with:
- **Tufte's data-ink ratio**: maximize information per pixel
- **Demoscene / low-fidelity tradition**: constraint breeds creativity
- **Educational games**: clarity of communication over immersion

### 3. Game Design > Visuals — The Proof

If a game works as geometric shapes, it works. If it only works with expensive art, the design is fragile. Abstract shapes force the design to be tight — every unit must be readable by color, shape, and behavior alone.

---

## Case Studies

### HEX Defense (Steam)
- **Enemies are literal solids:** cuboids, spheroids, polygonoids
- **Towers built from block patterns** — not drawn, assembled
- Commercial release, Over 40 levels, positive reception
- Proves geometric enemies are commercially viable in TD
- https://store.steampowered.com/app/534120/HEX_Defense/

### Infinitode 2 (Steam, Android, iOS)
- **Most successful minimalist TD.** Solo developer (Prineside).
- Towers and enemies are simple shapes with color coding:
  - Red square = high-defense enemy
  - Light blue ball = icy enemy
  - Yellow triangle = fast enemy
  - Blue shape = missile tower
- Reviews: *"don't let the simple graphics fool you — there's a tremendous amount of depth"*
- 15+ tower types, 11 enemy types, 500+ research tree, leaderboards, map editor
- The developer's own words: *"I am a sole developer, my skills and resources are limited. Minimal graphics allow me to focus on what matters: every tower must have a use, nothing should be useless."*
- https://infinitode.prineside.com/

### GeoDefense (iOS)
- Old-school vector graphics TD
- Cult classic — removed from App Store, brought back by popular demand years later
- Reviews cite "striking vector graphics" and "simple yet challenging" as strengths
- 30 levels, 5 towers, 15 lives — all geometric, all clear
- Proof that nostalgia alone doesn't drive a 10+ year demand cycle

### Simple Defense (Web/Mobile)
- Hexagonal tower, geometric enemies all shapes
- Active skills (laser, rockets, shield), card-driven upgrades
- "Tower defense stripped to the core" — minimalist aesthetic as selling point

---

## Shape→Meaning Mapping (Current Holdfast)

| Entity | Shape | Meaning |
|--------|-------|---------|
| Ground unit | Rounded rect (colored) | Solid, bracing, front-line |
| Ranged unit | Triangle (colored) | Precision, distance, fragile |
| Enemy | Circle (colored) | Organic movement, swarming |
| Miniboss/big enemy | Larger circle | Threat level by size |
| Ground tile | Dark trapezoid | Route path, deployable for melee |
| Ranged tile | Bright trapezoid + orange border | Off-route, deployable for ranged |
| Wall tile | Dark solid | Impassable |
| Elevated tile | Lighter + shadow edge | Vertical advantage |

Color encodes subtype (red = vanguard, blue = defender, green = mechanic, etc.), a system that would work identically whether rendered as shapes or detailed sprites.

---

## v1 vs v2

| Phase | Visual fidelity | What changes |
|-------|----------------|--------------|
| v1 (now) | Colored shapes | All entities as geometric primitives |
| v1.5 | Pixel art tiles | Grid tiles get 16×16 pixel textures (ground, wall, etc.) |
| v2 | Pixel art entities | Units and enemies become pixel sprites — *but only if v1 proves the design is solid* |

**Rule:** Pixel art is a reward for validated design, not a prerequisite. If the game isn't fun with colored shapes, sprites won't save it.

---

## Elevator Pitch

*"Holdfast proves game design beats visuals. Every enemy is a moving circle with a health bar. Every unit is a colored rectangle. If you need detailed art to know what's happening, the design is unclear — not the art."*

This isn't "we'll add art later." This is *the art.* The shapes are the final form for v1.
