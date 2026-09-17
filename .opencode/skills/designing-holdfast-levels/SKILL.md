---
name: designing-holdfast-levels
description: Use when creating or editing level JSONs for Holdfast (grid-based TD). Covers Arknights-inspired level structure, route design, tile placement, enemy composition escalation, wave pacing, and validation. Do NOT use for non-level game content.
---

# Designing Holdfast Levels

## Overview
Level design in Holdfast follows Arknights chapter 0–3 conventions: single-route grids with ground/ranged deploy tiles, perspective rendering, wave-based enemy spawns, and escalating difficulty. Every level must pass `validateLevelData()` before play.

## Grid Size Reference
| Rows | Cols | Use Case | Example |
|------|-------|----------|---------|
| 3 | 12 | Tutorial, corridor | 1-1 (Tutorial) |
| 5-6 | 8 | L-shaped, compact | 1-2 (Crossroads) |
| 7-8 | 8 | Winding, elevated | 1-3 (Breach Point) |
| 4-5 | 10-12 | Split path, advanced | (future) |

Keep grids under 10×14 — perspective ROW_INSET=6 makes tall grids visually compressed.

## Tile Types
| JSON value | Holdfast equivalent | Placement rule |
|---|---|---|
| `floor` | Empty tile | No deploy, no path |
| `route` | Path tile | Enemies walk here; ground units deploy here |
| `spawn` | Enemy spawn | Exactly 1 per map; always at path start |
| `goal` | Enemy exit | Exactly 1 per map; always at path end |
| `deploy_ground` | Ground deploy | On route tiles; redundant with `route` |
| `deploy_ranged` | Ranged deploy | Off-route only; never on route tiles |
| `elevated` | Elevated path | Walkable; renders with shadow strip |
| `repair_node` | Healing tower | Heals 30 HP/s to adjacent ground units |
| `armor_grid` | Armor buff | +100 DEF to unit on this tile |

### Tile Rules
- Ranged deploy tiles must NOT be on the route path
- Route tiles must form a connected orthogonal path from spawn → goal
- At least 1 `deploy_ranged` tile should be within range of 2+ route tiles
- Special tiles (repair_node, armor_grid) at most 1-2 per level in early chapters

## Waypoint Rules
- Every waypoint must be adjacent (orthogonal, no diagonals) to the next
- Waypoints must stay within grid bounds
- First waypoint = spawn tile, last = goal tile
- Path must traverse only walkable tiles (route, elevated)
- 8-15 waypoints per level is typical

Validation catches diagonal jumps and out-of-bounds waypoints.

## Enemy Composition Escalation (per chapter)

### Chapter 1 (Intro — 5 levels)
| Level | Grid | Starting DP | Lives | Total enemies | Enemy types | Special features |
|-------|------|-------------|-------|---------------|-------------|------------------|
| 1-1 Tutorial | 12×3 | 25 | 10 | 16 | Scout Cars, APCs, 1 Caster, 1 Tank | repair_node + armor_grid on route |
| 1-2 Crossroads | 8×6 | 20 | 10 | 23 | + Drones, 2 Casters | L-shaped route, elevated corner |
| 1-3 Breach Point | 8×8 | 20 | 15 | 26 | All types, 2 Tanks finale | Winding path, elevated section, armor_grid |
| 1-4 Junction | 10×6 | 20 | 10 | 28 | Drones + Caster pressure | Zigzag route, elevated mid-point, repair_node |
| 1-5 Stronghold | 10×8 | 18 | 15 | 34 | 3 Tanks, Casters, Drones | Long serpentine, elevated section, repair_node + armor_grid |

### Chapter 2 (planned)
- Starting DP: 15-18 (tighter)
- Lives: 10
- Total enemies: 30-45
- Introduce elite variants: Armored Scout (higher DEF), Caster Mk2 (higher RES)
- Wave combinations that force specific counters (e.g., drone-heavy + tank)

### Chapter 3 (planned)
- Starting DP: 12-15 (tight)
- Lives: 8
- Total enemies: 40-60
- Multiple spawn points, split route
- Enemy mechanics (e.g., Wraith ignores block, Defense Crusher debuffs)

## Wave Design Guidelines

### Wave Structure
- 4-6 waves per level
- `preludeDuration`: 6-10s between waves (player breather)
- `spawnInterval`: 2-4s between individual enemies in an entry
- Same enemy type entries: avoid count > 5 in one entry (spread across entries)

### Escalation Pattern
```
Wave 1: Cheap units only (Scout Cars, Drones) — build DP
Wave 2: Mix cheap + medium (APCs) — establish defense
Wave 3: Introduce new threat (Caster) — test defense weakness
Wave 4: Mixed + numbers pressure — challenge positioning
Wave 5: Elite + horde (Tank + swarm) — final test
Wave 6: Boss wave (2 Tanks + all types) — optional climax
```

### Pacing Tips
- First enemy spawns 2-3s after start (give player time)
- Let player deploy 2-3 units before first enemy arrives
- Spaces between waves should give 3-5 DP regen cycles
- Last wave should feel like a climax, not a grind

## Level Design Process

```
1. Choose grid size (rows × cols)
2. Draw route path (spawn → waypoints → goal)
3. Place route tiles along the path
4. Position ranged deploy tiles near route (not on it)
5. Add 0-2 special tiles (repair_node, armor_grid, elevated)
6. Set waypoints = every tile on the path (orthogonal)
7. Fill remaining tiles as floor
8. Design waves: total enemies, composition, pacing
9. Set DP/economy: startingDP, dpRegenRate=1, dpCap=99
10. Validate with validateLevelData()
```

## Quick Reference: DP/Spawn Params

| Parameter | Chapter 1 range | Notes |
|-----------|-----------------|-------|
| `startingDP` | 20-25 | Higher = easier start |
| `dpRegenRate` | 1 | Always 1 in v1 |
| `dpCap` | 99 | Always 99 in v1 |
| `deploymentLimit` | 8 | Cap on active units |
| `lives` | 10-15 | Lower = more punishing |

## Common Mistakes to Avoid

1. **Diagonal waypoints**: Every step must be orthogonal (dr+dc=1). Wrong: `(0,2)→(1,1)`
2. **Route tiles disconnected**: Route tiles must form a single connected group from spawn to goal
3. **Ranged tiles on route**: `deploy_ranged` tiles must be off the path. Ground units deploy on route.
4. **Wrong routeIndex**: Waves reference `routes[0]` via `"routeIndex": 0` in single-route levels
5. **spawnInterval: 0**: Always use ≥ 0.1. Use 0.1-1 for single enemies that should appear at wave start
6. **Enemy count mismatch**: Verify total against wave entry counts. Validation catches this.
7. **Missing routeIndex in waves**: Every wave must have `"routeIndex": 0`. Validation catches this.
8. **Grid too tall**: > 10 rows with perspective makes top tiles nearly invisible. Stick to 3-9.

## Validation
All levels must pass `validateLevelData()` (defined in `src/shared/utils/LevelValidation.ts`). Run manually:
```bash
node -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('levels/my-level.json', 'utf-8'));
const { validateLevelData } = require('./src/shared/utils/LevelValidation');
console.log(validateLevelData(d));
"
```
Or use the validation script in ChapterSelect.

## Reference: Existing Levels

### 1-1 Tutorial (12×3)
Straight corridor. Single route (row 1). Ranged tiles on rows 0 and 2. repair_node at (6) and armor_grid at (7) on the route. 16 enemies in 4 waves. High starting DP (25).

### 1-2 Crossroads (8×6)
L-shaped route: right on row 1, down col 2, then right on row 4. Elevated corner. repair_node at the bend. Drones + Casters. 23 enemies in 5 waves.

### 1-3 Breach Point (8×8)
Winding serpentine: right on row 0, down through cols 2→1, right on row 5, down col 6. Elevated section with armor_grid. 26 enemies in 5 waves.

### 1-4 Junction (10×6)
Zigzag route: right on row 0 (cols 0-2), down col 2 through elevation, right on row 4 (cols 2-8) past repair_node. Ranged tiles flank the lower corridor. 28 enemies in 5 waves.

### 1-5 Stronghold (10×8)
Chapter 1 finale. Long serpentine: right on row 0 (cols 0-2), down col 2 through elevated section (rows 1-5), right on row 5 (cols 2-6), down col 6 to goal. repair_node at (6,7), armor_grid at (7,7). Tight DP (18), 34 enemies in 6 waves, climaxes with 2 Tanks + 2 Casters.
