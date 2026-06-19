# Enemy System — Phase 1

**Date:** 2026-06-18
**Status:** Implemented (documented for reference)
**Basis:** Arknights wave-based enemy spawning with fixed route pathfinding

## Overview

Enemies spawn in waves, follow fixed waypoint paths, and are managed by `EnemyManager`. No pathfinding — enemies follow predefined waypoint routes from spawn to goal.

## Wave System

### Data Model

```typescript
interface Wave {
  routeIndex: number       // which route to follow (index into LevelData.routes)
  entries: WaveEntry[]     // sequence of enemy groups in this wave
  preludeDuration: number  // delay before wave starts
}

interface WaveEntry {
  enemyType: string        // matches EnemyConfig.id
  count: number            // how many of this enemy type
  spawnInterval: number    // seconds between each spawn
}
```

### Spawn Flow

1. `startBattle()` → calls `startNextWave()`
2. Each wave iterates through its entries sequentially
3. For each entry, spawns `count` enemies at `spawnInterval` seconds apart
4. After all entries consumed, advances to next wave
5. When all waves consumed, `allWavesComplete = true`
6. Battle victory condition: `allWavesComplete && enemies.length === 0`

### Level Data

Waves defined in `LevelData` (per level JSON). Example from `level-01.json`:

```json
"waves": [
  { "routeIndex": 0, "entries": [{ "enemyType": "soldier", "count": 10, "spawnInterval": 2.0 }], "preludeDuration": 0 }
]
```

Levels can have multiple waves with different route indices (for multi-route levels).

## Enemy Configuration

4 enemy types in `src/config/enemies.ts`:

| ID | Name | HP | ATK | Armor | RES | Speed | DP/Kill | AtkInt | DmgType | Special |
|----|------|----|-----|-------|-----|-------|--------|--------|---------|---------|
| `soldier` | Scout Car | 800 | 100 | 50 | 0 | 60 | 1 | 1.0s | kinetic | — |
| `trooper` | APC | 2000 | 200 | 100 | 0 | 45 | 2 | 1.5s | kinetic | — |
| `heavy` | Tank | 5000 | 400 | 300 | 0 | 30 | 3 | 2.5s | kinetic | — |
| `drone` | Drone | 500 | 150 | 20 | 0 | 80 | 1 | 1.5s | kinetic | Aerial |

### EnemyConfig Type

```typescript
interface EnemyConfig {
  id: string              // unique key
  name: string            // display name
  hp: number
  atk: number
  armor: number
  res: number             // percentage 0–100
  speed: number           // pixels per second
  color: number           // Phaser hex color
  dpOnKill: number        // DP awarded on kill
  attackInterval: number  // seconds between attacks
  damageType: DamageType  // 'kinetic' | 'thermal' | 'true'
  isAerial?: boolean      // true = drone (flies over blockers)
}
```

## Movement

Enemies move tile-to-tile along their path using pixel interpolation:
- `EnemySprite.move(delta)` calculates `step = speed × speedMultiplier × delta`
- Moves toward next waypoint center (via `tileToPixel`)
- When within step distance of waypoint, snaps to it and advances `currentWaypoint`
- Speed multipliers from status effects (slow) reduce effective speed
- Direction indicator triangle rotates toward next waypoint
- Blocked enemies cannot move until unblocked

### Routes

```typescript
interface Route {
  color: number           // visual route color (editor)
  spawn: Position         // spawn tile
  goal: Position          // goal tile
  waypoints: Waypoint[]   // intermediate waypoints
}
```

Path constructed as `[spawn, ...waypoints, goal]`. Enemies walk sequentially through this list. When they reach the last index (`path.length - 1`), they "reach the objective".

## Blocking System

Handled in `EnemyManager.updateBlocking()`:

### Ground Enemies (non-aerial)
- When an enemy occupies the same tile as a ground unit, the unit blocks it
- Block capacity: `unit.config.blockCount` (1-3)
- First-come-first-served: first `blockCount` enemies on the tile get blocked
- If tile is at capacity, additional enemies pass through (unblocked)
- When unit retreats/dies, enemies transfer to adjacent ground units (preferred) or become unblocked
- Blocked enemies are marked with `blocked: true` and `blockerUnitKey` (unit position `"row,col"`)

### Aerial Enemies (Drones)
- `isAerial: true` — never blocked
- `blocked` always false
- Ignored by ground unit block checks

### Visual Stacking
Multiple enemies on the same tile (blocked) get visual offsets:
- Table of 7 offset positions centered on the tile
- Prevents overlap when 2+ enemies are blocked on the same unit

## Combat Integration

### Enemy Attacks
- Ground enemies: attack only when `blocked`, target their blocker
- Aerial enemies: never blocked, target nearest ranged unit within 3 tiles
- Attack timer per enemy stored in `CombatSystem.enemyAttackTimers` map by enemy ID
- Attack formula: enemy ATK vs unit DEF/RES, using shared `calcDamage()`

### Kill Rewards
- `onEnemyKilled` callback in GameScene: `depSystem.addDP(enemy.config.dpOnKill)`
- DPOnKill trait units get additional DP

### Objective Check
- `updateObjectiveCheck()` runs every frame
- If enemy reaches last waypoint: `lives -= 1`, enemy destroyed
- Lives reaching 0 triggers defeat

## Defeat & Victory

| Condition | Trigger |
|-----------|---------|
| Lives ≤ 0 | Defeat — flash "DESYNC", show result |
| All waves complete + no alive enemies | Victory — flash "SYNC COMPLETE", show result |
| Victory with full lives | 3 stars |
| Victory with ≥ 50% lives | 2 stars |
| Victory with < 50% lives | 1 star |

## Future Considerations

- More aerial enemy types with different targeting behaviors
- Enemy `res` is currently 0 for all configs — future thermal-weak enemies would use this
- Movement speed variability (pause at waypoints, speed-up phases)
- Boss enemies with special mechanics (multiple attacks, phase transitions)
- Enemy variants with different damage types (thermal drones, true damage tanks)
