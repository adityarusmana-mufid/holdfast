# Tanknights — Core Level Logic Design

**Date:** 2026-06-12  
**Status:** Draft (pending approval)  
**Scope:** MVP core level logic — single spawn, single objective

---

## 1. Vision

A grid-based tower defense game inspired by Arknights, using pixel art geometry. Players deploy units on a grid to defend against enemies following a fixed route.

**MVP Scope:**
- Single enemy spawn point
- Single defense objective
- Fixed enemy route (no pathfinding)
- Ground units deploy on route tiles
- Ranged units deploy on surrounding tiles
- Visual level editor for rapid iteration
- **Deployment points (DP)** — auto-generates at 1/sec; each unit costs DP to deploy
- **Starting DP** — each level defines how much DP you begin with
- **Deployment limit** — cap on total active units at once (e.g., 6-8)
- **Retreat** — remove a unit to free its deploy slot; refunds half its DP cost
- **Block count** — ground units physically stop enemies from passing (1-3 enemies)

**Future Scope (not MVP):**
- Multiple spawn points with configurable enemy types
- Multiple defense objectives
- Unit blocking mechanics
- Advanced enemy AI
- **Unit selection** — choosing which units to bring into a level
- **Simple gacha** — unit acquisition system
- **Unit talents/upgrade/promotion** — level-up, stats, rank promotion
- **Progression system** — levels unlock more units

---

## 2. Core Gameplay Mechanics

### Grid System
- **Variable grid size** (editor-driven); 12×3 is the default template
- **Tile types:**
  - `route` — Enemy path, ground unit deployment zone
  - `ground_deploy` — Alternate ground unit zones (if needed)
  - `ranged_deploy` — Ranged unit deployment zone (off-route)
  - `blocked` — Impassable terrain
- **One unit per tile** — deployment collision enforcement
- **Enemies flock freely** — multiple enemies can occupy same route tile

### Enemy Movement
- Enemies spawn at designated spawn point
- Follow route tiles in sequence (predefined waypoints)
- Move continuously at fixed speed
- **Block count collision:** When an enemy enters a tile occupied by a blocking unit, the enemy stops. The unit and enemy fight. Enemy resumes moving when the unit dies or if the unit's block limit is exceeded.
- **Walk past full blockers:** If a unit is already blocking its max enemies, additional enemies walk past.
- Reach defense objective = player loses HP/life

### Unit Deployment
- Click valid tile → place unit (if DP allows and limit not reached)
- **DP system:** DP auto-generates at 1/sec during battle. Each level defines starting DP (e.g., 10). Cap at 99 DP.
- **DP costs:** Each unit has a DP cost. Placing a unit consumes that much DP.
- **Deployment limit** — max active units at any time (e.g., 6-8)
- Ground units → route tiles only
- Ranged units → non-route tiles only
- Units are stationary once placed (no moving)
- **Retreat:** Remove a unit to free its deploy slot. Refunds half its current DP cost (rounded down).
- **Redeployment:** Retreating starts a cooldown timer before the unit can be placed again.

### Combat (Simplified for MVP)
- Units auto-attack enemies in range
- Range patterns follow Arknights style (grid-based cross/diamond)
- **Block count interaction:** Ground units fight enemies they are blocking. Ranged units attack enemies in range regardless of blocking.
- Damage dealt per attack tick
- Enemies die when HP reaches 0

---

## 3. Level Data Structure

### Level JSON Schema
```typescript
interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: Tile[][];
  enemySpawn: Position;
  defenseObjective: Position;
  routeWaypoints: Position[];  // Ordered path for enemy movement
  startingDP: number;          // DP at battle start (e.g., 10)
  dpRegenRate: number;         // DP generated per second (default 1)
  dpCap: number;               // Max DP (default 99)
  deploymentLimit: number;     // Max active units at once
}

type TileType = 'route' | 'ground_deploy' | 'ranged_deploy' | 'blocked';

interface Tile {
  type: TileType;
  x: number;
  y: number;
}

interface UnitConfig {
  id: string;
  name: string;
  type: 'ground' | 'ranged';
  dpCost: number;              // DP required to deploy
  blockCount: number;          // Enemies this unit can block (0=ranged, 1-3=melee)
  hp: number;
  attack: number;
  attackInterval: number;      // Seconds between attacks
  rangePattern: RangePattern;
}

type RangePattern = 'cross' | 'square' | 'diamond' | 'melee';

interface Position {
  x: number;
  y: number;
}
```

### Example Level JSON
```json
{
  "id": "level-01",
  "name": "Tutorial",
  "width": 12,
  "height": 3,
  "grid": [
    [{"type": "ranged_deploy", "x": 0, "y": 0}, ...],
    [{"type": "route", "x": 0, "y": 1}, ...],
    [{"type": "ranged_deploy", "x": 0, "y": 2}, ...]
  ],
  "startingDP": 10,
  "dpRegenRate": 1,
  "dpCap": 99,
  "deploymentLimit": 8,
  "enemySpawn": {"x": 0, "y": 1},
  "defenseObjective": {"x": 11, "y": 1},
  "routeWaypoints": [
    {"x": 0, "y": 1},
    {"x": 1, "y": 1},
    {"x": 2, "y": 1},
    ...
    {"x": 11, "y": 1}
  ]
}
```

---

## 4. Technology Stack

### Core Stack
- **Language:** TypeScript
- **Game Engine:** Phaser 3
- **Build Tool:** Vite
- **Deployment:** Static web (itch.io ready)

### Why Phaser 3?
- Mature game framework with excellent tile/grid support
- Built-in scene management, input handling, camera system
- Rich plugin ecosystem
- Good performance for 2D pixel art games
- Can reuse same engine for editor + game

---

## 5. Architecture

### Project Structure
```
tanknights/
├── src/
│   ├── game/                    # Core game logic
│   │   ├── scenes/              # Phaser scenes
│   │   │   ├── GameScene.ts     # Main gameplay
│   │   │   └── EditorScene.ts   # Level editor
│   │   ├── entities/            # Game objects
│   │   │   ├── Unit.ts
│   │   │   ├── Enemy.ts
│   │   │   └── Grid.ts
│   │   ├── systems/             # Game systems
│   │   │   ├── DeploymentSystem.ts
│   │   │   ├── CombatSystem.ts
│   │   │   └── PathingSystem.ts
│   │   └── config.ts            # Phaser config
│   ├── editor/                  # Level editor UI
│   │   ├── EditorUI.ts          # Toolbar, tile palette
│   │   ├── LevelSerializer.ts   # JSON export/import
│   │   └── TilePainter.ts       # Click-to-paint logic
│   ├── shared/                  # Shared types and utilities
│   │   ├── types/
│   │   │   ├── Level.ts
│   │   │   ├── Tile.ts
│   │   │   └── Unit.ts
│   │   └── utils/
│   │       ├── GridMath.ts      # Distance, range checks
│   │       └── PathFollower.ts  # Enemy movement along waypoints
│   ├── assets/                  # Sprites, tiles, audio
│   │   ├── tiles/
│   │   ├── units/
│   │   └── enemies/
│   └── main.ts                  # Entry point
├── levels/                      # Exported JSON levels
│   └── level-01.json
├── public/                      # Static assets
├── tests/                       # Unit tests (vitest)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

---

## 6. Core Systems Design

### 6.1 Grid System
**Responsibility:** Manage tile data, validate placement, render grid

```typescript
class Grid {
  width: number;
  height: number;
  tiles: Tile[][];
  
  getTile(x: number, y: number): Tile | null;
  isValidDeployment(x: number, y: number, unitType: UnitType): boolean;
  getNeighbors(x: number, y: number): Tile[];
}
```

### 6.2 Deployment System
**Responsibility:** Handle unit placement, DP management, retreat, limit enforcement

```typescript
class DeploymentSystem {
  currentDP: number;
  activeUnits: number;

  deployUnit(unit: UnitConfig, x: number, y: number): boolean;
  canDeploy(unit: UnitConfig, x: number, y: number): boolean;
  retreatUnit(x: number, y: number): void;      // Refunds half DP cost
  getDPRefund(unit: UnitConfig): number;         // Math.floor(dpCost / 2)
  updateDP(deltaTime: number): void;             // Add dpRegenRate per second
}
```

### 6.3 Pathing System
**Responsibility:** Move enemies along route waypoints

```typescript
class PathingSystem {
  route: Position[];
  
  moveEnemy(enemy: Enemy, deltaTime: number): void;
  getNextWaypoint(enemy: Enemy): Position | null;
  hasReachedObjective(enemy: Enemy): boolean;
}
```

### 6.4 Combat System
**Responsibility:** Handle attacks, damage, range checks

```typescript
class CombatSystem {
  findTargetsInRange(unit: Unit, grid: Grid): Enemy[];
  attack(unit: Unit, target: Enemy): void;
  checkDeath(enemy: Enemy): boolean;
}
```

---

## 7. Level Editor Design

### Editor Features (MVP)
1. **Tile Palette** — Click to select tile type (route, ground_deploy, ranged_deploy, blocked)
2. **Tile Painter** — Click grid cell to paint selected tile type
3. **Spawn/Objective Markers** — Click to set spawn point and defense objective
4. **Route Builder** — Automatically generate waypoints from painted route tiles
5. **Export** — Save level as JSON file
6. **Import** — Load existing level JSON for editing

### Editor UI Layout
```
┌─────────────────────────────────┐
│ Toolbar: [Save] [Load] [Clear] │
├──────────┬──────────────────────┤
│ Palette: │                      │
│ [Route]  │   Grid Canvas        │
│ [Ground] │   (click to paint)   │
│ [Ranged] │                      │
│ [Block]  │                      │
│ [Spawn]  │                      │
│ [Goal]   │                      │
└──────────┴──────────────────────┘
```

---

## 8. Rendering & Art Style

### Visual Style
- **Pixel art geometry** — simple shapes (squares, circles, triangles)
- **Grid lines** — visible for debugging, toggleable
- **Tile colors** (placeholder):
  - Route: light gray
  - Ground deploy: green tint
  - Ranged deploy: blue tint
  - Blocked: dark gray
  - Spawn: red marker
  - Objective: yellow marker

### Rendering Layers (Phaser)
1. **Background** — solid color
2. **Grid tiles** — base tile sprites
3. **Units** — deployed units
4. **Enemies** — moving enemies
5. **UI overlays** — health bars, range indicators

---

## 9. MVP Feature Set

### Phase 1 — Grid & Editor
- [ ] Grid rendering (tiles, borders)
- [ ] Level editor (tile painting)
- [ ] JSON export/import
- [ ] Spawn/objective markers

### Phase 2 — Unit Deployment
- [ ] Unit placement system (click-to-deploy)
- [ ] Deployment validation (tile type, collision)
- [ ] DP system — auto-generation at 1/sec, starting DP per level, cap
- [ ] Unit DP costs — each unit has a cost, deducted on deploy
- [ ] Deployment limit enforcement (max active units)
- [ ] Unit retreat (remove unit, refund half DP cost, start redeploy timer)
- [ ] Unit sprites and animations (colored shapes for v1)
- [ ] Unit config data structure (dpCost, blockCount, hp, attack, rangePattern)

### Phase 3 — Enemy Movement
- [ ] Enemy spawning
- [ ] Waypoint following along route tiles
- [ ] Block count collision — enemies stopped by blocking units
- [ ] Walk-past behavior — enemies bypass unit if block limit exceeded
- [ ] Objective collision detection (enemy reaches goal)
- [ ] Enemy rendering (colored shapes for v1)
- [ ] Enemy config data structure (hp, attack, speed, blockable flag)

### Phase 4 — Combat
- [ ] Unit auto-attack logic (attack interval, target selection)
- [ ] Range calculation (cross/square/diamond/melee patterns)
- [ ] Block count interaction — ground units fight blocked enemies
- [ ] Damage and HP system
- [ ] Enemy death handling

### Phase 5 — Game Loop
- [ ] Wave spawning
- [ ] Win/lose conditions
- [ ] Game state management
- [ ] Basic UI (HP, resources)

---

## 10. Non-Goals (Deferred)

These are explicitly **not** part of the MVP:
- Multiple enemy spawn points
- Enemy type configuration per spawn
- Advanced enemy AI (splitting, flying)
- Sound effects and music
- Persistent progression/unlocks
- Multiplayer or leaderboards
- **Unit selection** — choosing which units to bring into a level
- **Simple gacha** — unit acquisition system
- **Unit talents/upgrade/promotion** — level-up, stats, rank promotion (v2+ features)
- **Progression unlocks** — levels unlocking new units
- **Pixel art visuals** — colored geometric shapes are fine for v1

---

## 11. Success Criteria

The MVP is successful when:
1. ✅ Level editor can create and export playable levels
2. ✅ Game loads level JSON and renders correctly
3. ✅ Units can be deployed on valid tiles
4. ✅ Enemies follow route from spawn to objective
5. ✅ Units attack enemies in range
6. ✅ Enemies die when HP reaches 0
7. ✅ Game ends when enemy reaches objective
8. ✅ Playable in browser, deployable to itch.io

---

## 12. Design Decisions (2026-06-12)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Grid size** | Variable (editor-driven) | Editor paints any grid size; no hardcoded limits from the start |
| **Range patterns** | Multiple (cross, square, diamond) | Core to Arknights gameplay identity; worth implementing early since grid math is already needed |
| **Enemy waves** | Wave-based (multiple waves) | Gives meaningful game loop; continuous spawning doesn't create interesting gameplay |
| **Enemy route** | Fixed waypoints, no pathfinding | Simplified routing from painted route tiles |
| **Editor scope** | Visual editor first | Faster iteration for level design debugging; JSON export for game consumption |
| **Deployment zones** | Ground = route tiles, Ranged = off-route tiles | Mirrors Arknights core distinction |
| **DP system** | Auto-generation at 1/sec + starting DP per level | Creates pacing tension — deploy cheap units first, build up to expensive ones |
| **DP costs** | Each unit has a cost deducted on deploy | Different costs create trade-off decisions between units |
| **Retreat refund** | Half of current DP cost (rounded down) | Strategic cost for misplacement; retreat + replace is core loop |
| **Deployment limit** | Cap on active units (v1) | Prevents flooding; 6-8 default |
| **Block count** | Ground units block 1-3 enemies (v1) | Makes melee units matter; Defenders hold the line, Guards duel |
| **Visual style** | Colored geometric shapes (v1) | Pixel art deferred to v2; shapes work for debugging gameplay |

---

## 13. Next Steps

1. ✅ Design approval
2. ⏳ Answer open questions
3. ⏳ Write detailed implementation plan (phases breakdown)
4. ⏳ Set up project scaffold (Vite + Phaser + TypeScript)
5. ⏳ Begin Phase 1 implementation

---

**Approved by:** User  
**Date:** 2026-06-12
