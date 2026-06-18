# Multi-Route & 4-Tile System Design

> Phase 6: Replacing single-route tile-based routing with multi-route waypoint infrastructure and simplified tile palette.

**Date:** 2026-06-16
**Status:** Draft for review

---

## 1. Tile Type System

### Current (7 types)
| Tile | Role |
|------|------|
| `floor` | Flat, non-deployable (obstacle) |
| `wall` | Elevated, non-deployable |
| `route` | Flat, walkable (path tiles) |
| `spawn` | Route start marker |
| `goal` | Route end marker |
| `deploy_ground` | Flat, deployable (ground units) |
| `deploy_ranged` | Elevated, deployable (ranged units) |

### New (6 types)
| Tile | Level | Deployable | Enemy-walkable | Role |
|------|-------|------------|----------------|------|
| `ground` | Flat | ✅ Yes (ground units) | ✅ (via waypoints) | Default fill — deploy ground units here |
| `floor` | Flat | ❌ No | ✅ | Obstacle/rough terrain — no deploy but enemies pass through |
| `ranged` | Elevated | ✅ Yes (ranged units) | ❌ | High ground — deploy ranged units here |
| `wall` | Elevated | ❌ No | ❌ | Building/wall — impassable |
| `spawn` | Flat | ❌ No | ✅ | Enemy entry point — colored zone on grid |
| `goal` | Flat | ❌ No | ✅ | Enemy target — colored zone on grid |

### Key principle
- **Spawn and goal are real tiles** on the grid, not abstract coordinates
- Routes reference spawn and goal tiles by their grid position
- Spawn and goal tiles are part of the enemy path (walkable for enemy movement)
- Multiple routes can reference the same spawn tile (shared start) or same goal tile (shared end)
- Units cannot deploy on spawn or goal tiles

### Migration
- `deploy_ground` → `ground`
- `deploy_ranged` → `ranged`
- `route` → `spawn` or `goal` (if it was a start/end marker); otherwise `ground` (context-dependent)
- Old `spawn` / `goal` → same tile types, but now referenced by Route objects

### Tile rendering
| Tile | Visual |
|------|--------|
| `ground` | Solid surface color (default fill) |
| `floor` | Crosshatch/dotted pattern (walkable but not deployable) |
| `ranged` | Raised platform (elevated visual, darker border) |
| `wall` | Solid wall/building fill |
| `spawn` | Red-tinted zone with S marker |
| `goal` | Blue-tinted zone with G marker |

---

## 2. Route Data Model

### Types

```typescript
interface Position {
  row: number
  col: number
}

interface Waypoint {
  row: number
  col: number
  pauseDuration?: number  // seconds to pause at this waypoint (v2 behavior)
}

interface Route {
  color: number     // auto-assigned hex color for editor visualization
  spawn: Position   // grid position of a spawn-type tile
  goal: Position    // grid position of a goal-type tile
  waypoints: Waypoint[]  // ordered path points between spawn and goal
}
```

### Routing philosophy
- Routes are **purely waypoint-based** — no pathfinding, no BFS, no "route tiles"
- Enemies follow the path: **spawn tile → waypoint[0] → waypoint[1] → ... → goal tile**
- Spawn and goal reference actual grid tiles — they must exist as `spawn`/`goal` type tiles
- A route is complete and valid if it has: spawn + goal + ≥1 waypoint
- Multiple routes can share the same spawn tile (multi-path from one entry) or same goal tile (converging paths)
- Routes can have independent spawn/goal for separate lanes

---

## 3. Wave-Route Assignment

### Types

```typescript
interface WaveEntry {
  enemyType: string
  count: number
  spawnInterval: number
}

interface Wave {
  routeIndex: number   // which route this wave follows (by array index)
  preludeDuration: number
  entries: WaveEntry[]
}
```

### Behavior
- A wave sends all its entries down the route specified by `routeIndex`
- Waves are sequential — wave N starts after wave N-1 is complete
- Multiple waves can target the same route (escalating pressure on one lane)
- `routeIndex` is required (a wave must have a route)

---

## 3b. Route Connectivity Validation

Levels must pass validation before they can be played. The core validation rule: **waypoints must form a connected path from each spawn tile through all referenced goal tiles.**

### Validation rules by route count
| Scenario | Rule |
|----------|------|
| 1 spawn + 1 goal (1 route) | Route's waypoints connect spawn to goal — contiguous adjacency |
| 2 spawns + 1 goal (2 routes) | Each route's waypoints independently connect its spawn to the shared goal |
| 1 spawn + 2 goals (2 routes) | Each route's waypoints independently connect the shared spawn to its goal |

### How validation works
For each Route, walk the full path `[spawn, ...waypoints, goal]`. Verify that every consecutive pair is adjacent (Chebyshev distance ≤ 1 — includes diagonals). Any break in adjacency means disconnected path → level invalid.

Additional constraints:
- All routes must be valid (connected spawn → goal)
- At least one route must exist
- All waves must reference a valid routeIndex
- Spawn and goal tiles must exist at the specified positions

### Editor feedback
- Invalid routes are flagged with a red warning badge in the route list
- The disconnected gap is visually highlighted on the grid
- The "Play" button is disabled until all routes pass validation

---

### Why index instead of string ID
- Simpler data model, no naming overhead
- Route array order is stable — editor does not support reordering (v1)
- Auto-assigned route color is the visual identifier in the editor, not a name
- Editor shows a color swatch + "Route N" label in wave panel

---

## 4. Multi-Route in LevelData

```typescript
interface LevelData {
  name: string
  cols: number
  rows: number
  tiles: Tile[][]        // 6 tile types (ground, floor, ranged, wall, spawn, goal)
  routes: Route[]        // replaces single waypoints array
  waves: Wave[]
  startingDP: number
  dpRegenRate: number
  dpCap: number
  deploymentLimit: number
  lives: number
}
```

### Legacy migration
When loading a LevelData without `routes` (old format):
1. Create a single `Route` with the old `waypoints` array
2. Scan tiles for old spawn/goal types → convert to new spawn/goal types, use their positions
3. If no old spawn/goal tiles found, use first waypoint as spawn and last as goal
4. Assign all waves `routeIndex = 0`

---

## 5. Editor UX for Multi-Route

### Palette
- 6 tile type buttons: **Ground**, **Floor**, **Ranged**, **Wall**, **Spawn**, **Goal**
- Removed: Route, DeployGround, DeployRanged

### Spawn/Goal tile painting
- Painting a spawn or goal tile creates the physical tile on the grid
- A route's spawn/goal reference must point to a position where that tile type exists
- The editor should highlight all existing spawn tiles when editing a route's spawn (and same for goal)

### Route Panel (new section in editor, replaces Paint Waypoints toggle)
- Button: **Add Route** — creates new route, assigns next color, focuses on it
- Route list showing each route as a colored swatch + "Route N" + waypoint count
- Selected route is highlighted — its waypoints are visible on grid
- Click a route in the list to select it for editing
- Button: **Delete Route** (only if >1 route exists, with confirmation)
- Each route's spawn and goal markers are shown on the grid in route color

### Route creation flow (editor)

1. **Paint spawn and goal tiles** on the grid using the palette (they appear as colored zones)
2. **Create a Route** via "Add Route" button → route appears in list with auto-color
3. **Assign spawn tile** — with route selected, click a spawn tile on grid to link it
4. **Assign goal tile** — with route selected, click a goal tile on grid to link it
5. **Paint waypoints** — with route selected, click tiles between spawn and goal to build the path; each click appends a waypoint
6. **Validation** — system checks adjacency chain spawn → waypoints → goal; broken chain = invalid route

### Waypoint editing
- Clicking an existing waypoint in Erase mode removes it
- The full path `[spawn, ...waypoints, goal]` must remain contiguous after removal
- Visual: colored circles with directional arrows along the route's path
- Route is valid when: spawn tile exists on grid, goal tile exists on grid, waypoints connect them contiguously

### Wave Panel
- Each wave shows a route selector: colored swatch + dropdown/index
- Selecting a route highlights that route on the grid

---

## 6. Route Colors

A cycling palette of 8 colors (enough for any v1 level):

```typescript
const ROUTE_COLORS = [
  0xff4444, // red
  0x4488ff, // blue
  0x44dd44, // green
  0xffaa00, // orange
  0xcc44ff, // purple
  0x00cccc, // cyan
  0xff66aa, // pink
  0x888888, // gray
]
```

Colors are assigned sequentially on creation and stored in the Route data (not re-computed). This ensures colors are stable across save/reload.

---

## 7. Game Runtime Changes

### Spawning
- EnemyManager receives routes array alongside waves
- When a wave starts, its `routeIndex` determines the spawn position and waypoint path
- Enemy sprite stores route's waypoints and follows them

### Rendering
- Grid does not render routes — only tiles
- Spawn and goal markers shown during deployment phase (before battle starts)
- No route lines/paths visible during gameplay

### Combat & Blocking
- No changes to combat system — combat is tile-based, route-independent
- A blocking unit blocks enemies on its tile regardless of which route they came from
- Enemies from different routes can converge at the same tile

### Facing
- `computeFacingTowardGoal` uses the assigned route's goal position
- Each unit computes facing toward the nearest goal across all routes

---

## 8. Waypoint Stop Points (v2 data scaffolding)

The `Waypoint` type includes `pauseDuration?: number` to future-proof the data model:

```typescript
interface Waypoint {
  row: number
  col: number
  pauseDuration?: number  // v2: enemy pauses here for N seconds
}
```

The editor should eventually support a toggle to set pause on a waypoint. The game will ignore the field for now. This prevents data migration when we implement the behavior.

---

## 9. File Change Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | TileType: 6 values (ground, floor, ranged, wall, spawn, goal); add Route, Waypoint; add routeIndex to Wave |
| `src/shared/utils/GridMath.ts` | Update tile helpers; add isWalkable (spawn, goal); update isDeployable; add ROUTE_COLORS |
| `src/entities/Grid.ts` | Remove routePath, setSpawn/getSpawn, setGoal/getGoal; update render() for 6 tiles; initEmpty to Ground; fromLevelData/toLevelData for routes; add route validation helpers |
| `src/scenes/EditorScene.ts` | 6-tile palette; route panel (add/list/delete); per-route waypoint painting; spawn/goal tile linking; wave panel route selector; validation UI |
| `src/systems/EnemyManager.ts` | Route-aware spawning; wave.routeIndex → route waypoints; store route data |
| `src/entities/Enemy.ts` | Accept route waypoints in constructor; store goal position |
| `src/systems/RouteGenerator.ts` | REMOVE (no longer needed — BFS auto-route eliminated) |
| `src/systems/DeploymentSystem.ts` | Update canDeploy for new tile types |
| `src/levels/testLevel.ts` | Migrate to 6-tile multi-route format |
| `src/scenes/GameScene.ts` | Load routes; pass to EnemyManager; update facing logic for multi-route |

---

## 10. Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spawn/goal | Real tile types (6 total) | Physical grid markers, not abstract coordinates; validates connectivity on the tile grid |
| Route reference | Array index | Simpler than string IDs; no naming overhead; indices stable in editor |
| Wave-route assignment | Per-wave (not per-entry) | Wave is the batching unit — one route per wave |
| Route color | Stored in data | Stable across save/reload; not computed |
| Route creation | Paint tiles → create route → link spawn/goal → paint waypoints | Clear 5-step flow separates tile painting from route definition |
| Validation | Adjacency chain check on full path | Ensures spawn → waypoints → goal is contiguous |
| BFS/auto-route | Removed | Routes are waypoint-defined; no tile-based routing exists |
| Route reordering | Not supported (v1) | Only creation/deletion; order = creation order |
| Stop points | Data field only (v2) | Scaffold the type; implement later |
