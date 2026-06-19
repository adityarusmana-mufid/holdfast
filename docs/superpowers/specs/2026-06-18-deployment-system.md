# Deployment System — Phase 1

**Date:** 2026-06-18
**Status:** Implemented (documented for reference)
**Basis:** Arknights DP system simplified for v1

## Overview

The deployment system manages the player's ability to place units on the grid during a battle. It tracks DP (Deployment Points), unit cooldowns, deployment limits, and cost multipliers for redeployment.

## System Architecture

### Class: `DeploymentSystem` (`src/systems/DeploymentSystem.ts`)

Owned by `GameScene`. Instantiated once per battle.

### State

| Field | Type | Description |
|-------|------|-------------|
| `currentDP` | `number` | Current DP balance (rounded down on display) |
| `dpRegenRate` | `number` | DP gained per second (default 1) |
| `dpCap` | `number` | Max DP storage (default 99) |
| `deploymentLimit` | `number` | Max simultaneous units on field (default 8) |
| `activeUnits` | `Map<string, DeployedUnit>` | Units currently on field, keyed by `"row,col"` |
| `deployedUnitIds` | `Set<string>` | Set of unit IDs that have been deployed (prevents same type reuse until retreat) |
| `redeployTimers` | `Map<string, number>` | Seconds remaining per unit ID before redeploy allowed |
| `deployCostMultiplier` | `Map<string, number>` | DP cost multiplier per unit ID (increases on retreat/death) |
| `dpAccumulator` | `number` | Fractional DP accumulator for sub-second regen |

### Key Methods

#### `canDeploy(unit, row, col)` → `{ ok, reason? }`
Checks:
1. Tile exists within grid bounds
2. Tile not already occupied by another unit
3. Active unit count < deployment limit
4. Unit not on redeploy cooldown
5. Enough DP to cover current cost
6. Unit type matches tile type (ground → Ground/RepairNode/ArmorGrid, ranged → Ranged)

Returns `{ ok: true }` or `{ ok: false, reason: '...' }`.

#### `deployUnit(unit, row, col, facing?)` → `DeployedUnit | null`
- Calls `canDeploy` — returns null if failed
- Subtracts current cost from DP
- Creates `DeployedUnit` record with full HP copy, `dpCostPaid`, `lastAttackTime: 0`, `blocking: []`
- Registers in `activeUnits` map and `deployedUnitIds` set
- Clears redeploy timer for this unit ID

#### `retreatUnit(row, col)` → `number` (refund amount)
- Removes unit from field via `removeUnit`
- Refunds: half of `dpCostPaid` (rounded down), or full if unit has `FullRefundRetreat` trait
- Clamps refund to `dpCap`

#### `removeUnit(row, col)`
- Called on retreat AND on unit death (from combat)
- Removes from `activeUnits` and `deployedUnitIds`
- Sets redeploy timer to `unit.config.redeployTime`
- Escalates cost multiplier:
  - First deployment: 1.0× (default)
  - First removal: 1.5×
  - Subsequent removals: multiplied by 2 (capped at 2.0×)

#### `update(delta)` — called every frame
- Accumulates DP regen (`delta × dpRegenRate`), awards integer DP when accumulator ≥ 1
- Updates all redeploy timers by delta
- DP clamped to `dpCap`

#### `addDP(amount)` — used for kill rewards
- Adds DP (clamped to cap)
- Called from CombatSystem callbacks: base `dpOnKill` + optional `DPOnKill` trait bonus

## DP Economy

| Parameter | Source | Default |
|-----------|--------|---------|
| Starting DP | `LevelData.startingDP` | 10 |
| Regen rate | `LevelData.dpRegenRate` | 1/sec |
| DP cap | `LevelData.dpCap` | 99 |
| Deployment limit | `LevelData.deploymentLimit` | 8 |

Cost escalation:
```
1st deploy:            cost = dpCost × 1.0
After 1st retreat/die: cost = dpCost × 1.5
After 2nd+ removal:    cost = dpCost × min(2.0, previousMult × 2)
```

## Integration Points

### GameScene (`src/scenes/GameScene.ts`)
- Creates `DeploymentSystem` in `create()` with level parameters
- Calls `depSystem.update(dt)` each frame
- Click-to-deploy flow: select unit → click tile → `deployUnit()`
- Right-click or click near center cancels facing confirmation
- `unitCostMultiplier` tracked per-unit for cost display
- `redeployTimers` shown in palette as `remaining.toFixed(2)s`

### EnemyManager (`src/systems/EnemyManager.ts`)
- Uses `depSystem.getUnitAt()` in `updateBlocking()` to check if ground unit is on a tile
- Calls `unit.blocking.length` to determine if blocker has room

### CombatSystem (`src/systems/CombatSystem.ts`)
- `onEnemyKilled` callback: calls `depSystem.addDP(enemy.config.dpOnKill)`
- `onUnitDeath` callback: calls `depSystem.removeUnit()`
- `DPOnKill` trait: calls `depSystem.addDP(traitValue)` on kill

## Visual Feedback

- Unit palette in GameScene shows:
  - Current DP cost (updated for cost multiplier)
  - Whether unit is on cooldown (red overlay + timer text)
  - Whether unit can be afforded (dimmed if can't afford)
- Hover indicator: green (`0x00c853`) if tile valid, red (`0xd32f2f`) if invalid
- Flash messages: `"DEPLOY // [name] -[cost] DP"` on deploy
- Inspect mode: `"RETREAT [+[refund] DP]"` button

## Future Considerations

- `PassiveDPRegen` trait (vanguard) would increase `dpRegenRate` per deployed unit
- Skills/SP system in v2 may add DP-on-skill mechanics
- `deployCostMultiplier` escalation could be softened for v2
