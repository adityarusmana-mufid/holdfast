# Multi-Route System — Plan

**Date:** 2026-06-13
**Status:** Approved for next phase
**Depends on:** Phase 4 (Combat) + Phase 5 (Game Loop) baseline stable

---

## Motivation

Single spawn → single route → single goal works for tutorial levels but severely limits strategic depth. Current architecture hardcodes a single `routePath: Position[]` + single `spawnMarker`/`goalMarker`. This blocks multi-lane defense, air units, and varied enemy routing.

---

## Phase 6 — Multi-Route Infrastructure

### 6.1 Data Model — Route as First-Class Object

Replace the current flat route fields in `Grid` / `LevelData` with a `Route` type:

```typescript
// New types
interface Route {
  id: string
  spawn: Position
  goal: Position
  waypoints: Position[]
}

interface LevelData {
  routes: Route[]
  // Remove: routePath, spawnMarker, goalMarker
}
```

**Level data example:**
```json
{
  "routes": [
    { "id": "A", "spawn": {"row":0,"col":0}, "goal": {"row":8,"col":11}, "waypoints": [{"row":0,"col":3},{"row":3,"col":3},...] },
    { "id": "B", "spawn": {"row":0,"col":0}, "goal": {"row":8,"col":11}, "waypoints": [{"row":1,"col":2},{"row":5,"col":5},...] }
  ]
}
```

### 6.2 Editor — Multi-Route Editing

Each route gets its own color-coded waypoint path visualization.

**UI changes:**
- Route selector dropdown / tabs in the editor panel
- "Add Route" / "Delete Route" buttons
- Active route is highlighted; painting waypoints adds to active route only
- Spawn/goal markers are per-route (one spawn + one goal per route, but routes can share spawn/goal tiles)
- Each route can have exactly one spawn and one goal tile

**Grid methods update:**
- `getRoute(routeId): Route | undefined`
- `setRouteSpawn(routeId, pos)`, `setRouteGoal(routeId, pos)`
- `addWaypoint(routeId, pos)`, `removeWaypoint(routeId, pos)`
- `clearRoute(routeId)`, `clearAllRoutes()`
- `getAllRoutes(): Route[]`
- Migration helper: `migrateFromLegacy()` converts `spawnMarker + goalMarker + routePath` to a single Route "A"

### 6.3 Enemy Wave Config — Route Assignment

Extend wave entry config to specify which route an enemy follows:

```typescript
interface WaveEntry {
  enemyType: string
  routeId: string           // ← NEW: which route to follow
  count: number
  interval: number
  flightCeiling?: number    // ← NEW: for air units, their Y-offset above the route
}
```

**Strategy highlights:**
- Same enemy type, multiple entries with different `routeId` → same enemy takes different routes
- Different enemy types, same `routeId` → different enemies share a route
- Different enemy types, different `routeId` → fully varied routing
- Random route selection: if `routeId` is omitted, pick randomly from available routes

### 6.4 EnemyManager — Multi-Route Spawning

Current: all enemies follow `this.waypoints` (single array).

After:
- `EnemySprite` stores its `routeId` (not raw waypoints)
- `EnemyManager` resolves `routeId → Route.waypoints` at spawn time
- Routing happens once at spawn; the full waypoint array is baked into the enemy instance

### 6.5 Pseudo-3D Perspective System

Air units need a visible altitude cue. We adopt an **Arknights-style oblique tilt** — camera pitched ~30° from vertical, looking down at a slight angle:

```
screenX = originX + col * tileWidth + row * tileWidth * 0.5
screenY = originY + row * tileHeight * 0.5 - elevation
```

Where `elevation = 0` for ground entities and `elevation = flightCeiling` for air units.

**Coordinate system changes:**
- Logical grid stays `(row, col)` — only rendering changes
- `Grid.tileToPixel(row, col)` returns pre-tilt `(x, y)` as now
- New `Grid.tileToScreen(row, col, elevation?)` returns the projected `(x, y)` with tilt applied
- `Grid.pixelToTile(x, y)` reverses the projection for mouse interaction

**Depth sorting (Z-order):**
- Every frame (or on position change), sort all containers by Y ascending
- Air units at high elevation render higher on screen and sort behind/above ground units at lower screen Y
- Tiebreaker for same Y: ground < enemy < air (ground units on top of enemies on same tile)

**Rendering pipeline:**
- Tiles: rendered as flat parallelograms (rhombus) matching the oblique projection — top edge is the tile's row span, bottom half-row offset creates the tilt illusion
- Units: circular body rendered at projected screen coords with elevation applied
- Enemies: same projection, enemies at higher elevation shift up on screen
- Editor: stays top-down for ease of placement; toggles to tilt in GameScene only

### 6.6 Air Units — Route Reuse via Perspective

Air enemies follow existing routes but use the same oblique projection with a positive elevation offset. No separate route data needed — perspective is purely a rendering concern.

**Implementation:**
- `EnemyConfig` gets optional `flightCeiling: number` (default 0 for ground)
- `EnemySprite.render()` applies elevation to screen Y: `container.y = screenY - flightCeiling`
- Air units do NOT block and are NOT blocked — skip blocking entirely
- Air units take damage from ranged units only (melee/ground ignore them)
- Visual: diamond/triangle shape instead of circle, lighter color palette, optional drop shadow on ground plane (projected oval at zero elevation directly below)
- Unit attacks check elevation: ground-range check only targets `flightCeiling === 0` enemies

---

## Phase 7 — Route Differentiation Strategies

### 7.1 Enemy Spawning — Route Selection Modes

Wave entries support these route assignment modes:

| Mode | Config | Behavior |
|------|--------|----------|
| Fixed | `routeId: "A"` | Every enemy in this entry takes route A |
| Shuffle | `routeIds: ["A","B","C"]` | Round-robin across the list |
| Random | _(omit routeId)_ | Uniform random from all available routes |
| Weighted | `routeWeights: {A: 0.7, B: 0.3}` | Probabilistic distribution |

### 7.2 Waypoint Variation (Future Enhancement)

Beyond fixed routes, add per-enemy waypoint perturbation for visual variety:
- Small random offset (±1 tile) at intermediate waypoints
- Preserves overall lane direction but avoids robotic single-file marching
- Only for cosmetic routes where exact path doesn't affect blocking

---

## Migration Path

1. **Backward compat**: `fromLevelData()` detects legacy format (`routePath` present), runs `migrateFromLegacy()` to produce a single Route "A"
2. **`toLevelData()`** always exports new `routes[]` format
3. **Editor upgrade**: start showing route selector after migration; old levels load and edit fine
4. **Remove legacy fields** after all levels are migrated

---

## Implementation Order

| Step | What | Files |
|------|------|-------|
| 1 | Add `Route` type and update `LevelData` | `src/types/index.ts` |
| 2 | Update `Grid` — replace single markers with `Map<string, Route>` | `src/entities/Grid.ts` |
| 3 | Add `tileToScreen()` projection + `pixelToTile()` reverse for oblique tilt | `src/entities/Grid.ts` |
| 4 | Add migration helper `migrateFromLegacy()` | `src/entities/Grid.ts` |
| 5 | Update `toLevelData()` / `fromLevelData()` | `src/entities/Grid.ts` |
| 6 | Add route selector to editor panel + per-route waypoint painting | `src/scenes/EditorScene.ts` |
| 7 | Update `EnemySprite` to accept `routeId` + resolve at spawn | `src/entities/Enemy.ts` |
| 8 | Update `EnemyManager` wave spawn to use route assignment | `src/systems/EnemyManager.ts` |
| 9 | Add `flightCeiling` to enemy config + air unit rendering + elevation in projection | `src/config/enemies.ts`, `src/entities/Enemy.ts` |
| 10 | Air unit blocking immunity (air skips blocking entirely) | `src/systems/EnemyManager.ts` |
| 11 | Depth sorting — Z-order by Y+ elevation for all entities | `src/entities/Enemy.ts`, `src/entities/UnitSprite.ts` |
| 12 | Oblique tile rendering (parallelograms instead of squares) | `src/entities/Grid.ts` |
| 13 | Route-based rendering (color-coded routes in editor) | `src/scenes/EditorScene.ts` |

---

## Open Questions

- Should route IDs be string names ("Top Lane") or simple indices (0, 1, 2)?
- Should the editor auto-generate routes from connected route tiles (current behavior) or require explicit waypoint painting?
- Is a `tileToScreen()` projection helper sufficient, or should the entire scene use a Phaser camera transform?
- For air unit collision: can two air enemies overlap on the same tile, or is it one-per-tile like ground?
