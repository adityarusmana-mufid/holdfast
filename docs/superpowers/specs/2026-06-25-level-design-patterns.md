# Level Design Patterns

Date: 2026-06-25
Status: Approved

## Overview

Holdfast levels are single-route tower defense maps with an Arknights-inspired grid layout. Each level defines a tile grid, enemy waypoints along a fixed route, wave-based spawns, and DP economy settings. This document catalogs the layout patterns used across all 40 operations (5 chapters × 8 operations).

## Layout Patterns

### 1. Straight Corridor

| Property | Value |
|----------|-------|
| Grid | 3×10 or 3×12 |
| Route | Centered horizontal row |
| Deploy | Ranged tiles above/below route, cols 1–(N-2) |
| Ranged coverage | Full route length |

```
F  F  R  R  R  R  R  R  F  F
S  █  █  █  █  █  █  █  █  G
F  F  R  R  R  R  R  R  F  F
```

**When to use:** Tutorial levels, early chapter openers, levels teaching a single mechanic.
**Complexity:** Minimal — player focuses on wave composition, not positioning.

### 2. L-Shaped Route

| Property | Value |
|----------|-------|
| Grid | 5×8 |
| Route | Right on row 0 (cols 0–bc), down at bend col, right on row N-1 to goal |
| Bend col | 2–3 |
| Deploy | Inner/outer corner tiles, flanks along both horizontal runs |

```
S  █  █  █  F  F  F  F
F  F  F  █  F  F  F  F
F  F  F  █  F  F  F  F
F  F  F  █  F  F  F  F
F  F  F  █  █  █  █  G
```

**Ranged positions:** Corners of the L provide flanking shots — ranged units can hit enemies before they round the bend, or as they approach the second corridor.
**When to use:** Chapter 1-2 levels introducing routing awareness.

### 3. Zigzag (S-Curve)

| Property | Value |
|----------|-------|
| Grid | 5×8 or 5×10 |
| Route | Right → down → right → down → right (2-3 bends) |
| Bend cols | 2, 6 |
| Deploy | Outer edges of each zigzag segment, center islands between bends |

```
S  █  █  F  F  F  F  F
F  F  █  F  F  F  F  F
F  F  █  █  █  █  F  F
F  F  F  F  F  █  F  F
F  F  F  F  F  █  █  █  G
```

**Ranged positions:** Each bend creates a natural kill zone where ranged units can fire down two segments of the route. The inner islands near bends are prime ranged deploy spots.
**When to use:** Mid-chapter levels (2–5 in a chapter). Tests the player's ability to cover multiple approach angles.

### 4. Winding Serpentine

| Property | Value |
|----------|-------|
| Grid | 7×8 to 7×10 |
| Route | Full-width serpentine: right → down → left → down → right → down → left |
| Deploy | Pockets between route segments, outer corners |

```
S  █  █  █  █  █  █  █
F  F  F  F  F  F  F  █
█  █  █  █  █  █  █  █
█  F  F  F  F  F  F  F
█  █  █  █  █  █  █  █
F  F  F  F  F  F  F  █
█  █  █  █  █  █  █  G
```

**Ranged positions:** Serpentine creates isolated "pockets" of deployable tiles between the meandering route. These pockets are especially valuable because enemies pass multiple times within range. The outer corners of each zigzag also provide crossfire coverage.
**When to use:** Late chapter levels (5–7). High path length means more time for DPS but requires covering more angles.

### 5. Intersection / Loop Pattern

| Property | Value |
|----------|-------|
| Grid | 3×10 to 3×12 |
| Route | Rectangular loop from spawn, rejoining at the far end |
| Deploy | Inside the loop, outside the loop, along the exit corridor |

```
S  █  █  █  █  █  █  █  █  G
F  F  F  █  F  F  █  F  F  F
F  F  F  █  █  █  █  F  F  F
```

**Behavior:** The route splits at the intersection points — enemies travel around the rectangular loop and rejoin before the exit. This creates a "merge" point where two streams of enemies converge.
**Ranged positions:** Deploy inside the loop for 360° coverage of the junction. Deploy outside to catch enemies before they enter or after they exit the loop.
**When to use:** Chapter 3-4 levels, advanced. Teaches the player to identify convergence points and prioritize coverage at chokepoints.

## Waypoint Design Principles

### Orthogonality Rule
All consecutive waypoints must be orthogonally adjacent (dr + dc = 1). Diagonal jumps are invalid — the validation function `validateLevelData()` rejects them.

### Waypoint Count Guidelines

| Layout | Waypoints | Notes |
|--------|-----------|-------|
| Straight (3×10) | 10 | One per column |
| L-shape (5×8) | ~14 | Full path tiles |
| Zigzag (5×8) | ~14 | Full path tiles |
| Winding (7×8) | ~28 | Full path tiles |
| Intersect (3×10) | ~18 | Includes loop segments |

### Waypoint Intersections / Convergence
When the route doubles back on itself (serpentine, intersect patterns), treat the route as **one continuous path** with a single waypoint list. There is no multi-route branching — enemies follow the same sequential waypoints. The "intersection" is a geometric feature where the tile path crosses itself, creating a visual chokepoint for the player.

**Key implication:** A single-route level with "intersection" tiles means enemies pass through the same tile column multiple times, making that column the critical defense point. Deploy ranged units to cover that column from both approach directions.

## Difficulty Scaling

| Chapter | DP range | Lives | Waves | Enemy types introduced |
|---------|----------|-------|-------|----------------------|
| 0 | 25–19 | 10 | 3–4 | soldier, trooper, drone |
| 1 | 25–19 | 10 | 3–4 | +drone, caster |
| 2 | 23–17 | 10 | 3–5 | +caster, heavy |
| 3 | 21–13 | 10 | 3–6 | heavies, mixed comps |
| 4 | 19–12 | 10 | 3–6 | full mixed comps |

### Per-Chapter Escalation

- **Chapter 0:** Blocking, healing, facing direction. Soldier/drone only.
- **Chapter 1:** Aerial enemies, DP generation. Drone pressure introduced.
- **Chapter 2:** High-DEF enemies, AoE, full composition. Casters and heavies appear.
- **Chapter 3:** Advanced compositions with mixed threat types. Tight DP.
- **Chapter 4:** Maximum pressure — all enemy types, tightest DP.

## Tile Validation Rules

All levels must pass `validateLevelData()`:

1. Exactly one `spawn` tile and one `goal` tile
2. Route tiles form a connected orthogonal path from spawn → goal
3. All waypoints are within grid bounds
4. Consecutive waypoints are orthogonally adjacent
5. `deploy_ranged` tiles are never on route/spawn/goal tiles
6. At least one wave with at least one entry
7. Valid enemy type IDs (must exist in `ENEMY_CONFIGS`)
8. Positive integer for `cols` and `rows`
9. Grid dimensions match tile array dimensions

## Layout Selection by Chapter

| Layout | Ch 0 | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|--------|------|------|------|------|------|
| Straight | 0-3 | — | — | 3-2 | 4-1 |
| L-shape | 0-4 | 1-3 | — | 3-3 | 4-2 |
| Zigzag | 0-5 | 1-4 | 2-3 | 3-4 | 4-3 |
| Winding | 0-6 | 1-5 | 2-4 | 3-5, 3-7 | 4-4, 4-6 |
| Intersect | — | 1-6 | — | 3-6 | 4-5, 4-7 |
