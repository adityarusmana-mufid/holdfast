# Combat Mechanics — Phase 1

**Date:** 2026-06-18
**Status:** Implemented (documented for reference)
**Basis:** Arknights damage formulas, attack targeting, terrain effects

## Overview

Combat is bidirectional: units attack enemies, enemies attack units. All damage is calculated per-frame in `CombatSystem.update()`.

## Damage Formulas

Shared `calcDamage` used for both directions:

```
kinetic: max(ATK × 5%, ATK − DEF)
thermal: max(ATK × 5%, ATK × (1 − RES/100))
true:    ATK (no minimum floor)
```

- **Kinetic** (`'kinetic'`): Subtracts target's DEF from ATK. Floor of 5% of ATK prevents zero-damage scenarios against high-DEF targets.
- **Thermal** (`'thermal'`): Multiplies ATK by `(1 − RES/100)`. RES is percentage (0–100). Floor of 5% of ATK.
- **True** (`'true'`): Bypasses both DEF and RES. No minimum floor — full ATK.

### Direction-Specific Formulas

Both `CombatSystem.calculateDamage` (unit → enemy) and `CombatSystem.calcDamage` (enemy → unit) implement the same core formula but receive different parameters:

**Unit attacking enemy:**
```typescript
calculateDamage(unit, target, atkOverride?)
// uses: atk (or override), target.config.armor, target.config.res, unit.config.damageType
```

**Enemy attacking unit:**
```typescript
calcDamage(atk, def, res, type)
// uses: enemy.config.atk, unit effective def, unit.config.res, enemy.config.damageType
```

## Unit Attack Flow

### Attack Timing
- Each `UnitSprite` tracks `lastAttackTime`
- Attack fires when `lastAttackTime >= config.attackInterval`
- Timer resets to 0 after attack
- Decision Mode halves game speed (`dt × 0.5`) to give time for inspection

### Target Selection

**1. Determine attack mode:**
- If unit has no ranged-alt trait OR is currently blocking → melee mode
- If unit has `RangedWhenNotBlocking` / `RangedAoEWhenNotBlocking` AND is not blocking → ranged mode
- Ranged mode may apply `RangedAttack80` (80% ATK reduction) and uses `altRangePattern` if available

**2. Gather enemies in range:**
- Range pattern (relative `[row, col]` offsets) rotated by unit facing direction
- Enemies filtered to those whose current tile is in the range set

**3. Select primary target:**
- Ground units prioritize enemy currently blocking them (at same tile)
- Units with `TargetingLowestDef`: pick enemy with lowest armor
- Default: enemy closest to goal (highest `currentWaypoint`)

### Attack Execution

1. **Normal attacks:** Apply damage to primary target
2. **DoubleHit:** Apply damage twice in same attack cycle
3. **HealOnAttack:** Heal self for trait value after attack
4. **AoESplash:** Deal splash damage in radius around primary target (damage × `damageMultiplier`)
5. **ChainJump:** After primary hit, chain to `maxTargets` additional enemies within `radius`, with `damageFalloff` per jump
6. **LinearAoE:** Hit all enemies in range in a single attack (no primary selection)
7. **RangedAoEWhenNotBlocking:** Hit all enemies in altRangePattern
8. **AttackHealsAlly:** Heal nearest wounded ally in range for 50% ATK

### Status Effects

**Slow (`'slow'`):**
- Applied by `SlowOnHit` trait (Decel Binder)
- Factor: `traitConfig.value` (default 0.5 = 50% speed)
- Duration: `traitConfig.duration` (default 2 seconds)
- Stacking: same-type effects keep the strongest factor and longest duration
- Extends to enemies via `statusEffects` array → `getSpeedMultiplier()` returns product of all active factors

## Enemy Attack Flow

### Attack Timing
- Per-enemy timers stored in `CombatSystem.enemyAttackTimers` map (by enemy ID)
- Accrues delta each frame, fires when `>= config.attackInterval`
- Timer carries over remainder (not reset to 0)

### Target Selection

**Ground enemies:**
- Attack only when `blocked === true`
- Target: the unit at `blockerUnitKey` (the ground unit blocking them)
- If blocker dies mid-cycle, no attack that cycle

**Aerial enemies:**
- Never blocked — always eligible to attack
- Target: nearest ranged unit within 3 tiles (Manhattan distance)
- If no ranged unit in range, does nothing

### Damage Application
- Enemy ATK vs unit effective DEF + RES
- Unit effective DEF = base DEF + 100 if on ArmorGrid tile
- `onUnitDamageDealt` callback triggers floating damage numbers
- `onUnitDeath` callback triggers when HP ≤ 0

## Healing System

**Class:** `HealingSystem` (`src/systems/HealingSystem.ts`)

### Repair Node
- Heals any unit on the tile at 30 HP/sec
- Accumulator ticks once per second
- RepairNode tile type: `repair_node` (ground-deployable)

### HealAlly Trait (Medic)
- Heals lowest-HP ally in range every attack cycle for `ATK` amount
- Ticks on attack interval, not per-frame
- Targets: allied `UnitSprite` objects in range pattern, filtered to alive + not self

### AoEHoT Trait (Bard Supporter)
- Area heal in `radius` tiles every attack cycle
- Heals all allies in radius for `value` HP
- Ticks on attack interval
- No target selection — heals everyone in area

### AttackHealsAlly (Incantation Medic)
- Handled in CombatSystem attack flow (not HealingSystem)
- After each attack, heals nearest wounded ally in range for 50% ATK

### CannotBeHealed
- `UnitConfig.canBeHealed: false` (Juggernaut)
- `UnitSprite.heal()` checks this before applying healing

## Terrain Effects

| Tile Type | Effect |
|-----------|--------|
| `repair_node` | 30 HP/sec healing for unit on tile |
| `armor_grid` | +100 DEF for unit on tile |
| `floor` | Walkable by enemies |
| `ground` | Deployable by ground units |
| `ranged` | Deployable by ranged units |
| `wall` | Impassable (non-walkable, non-deployable) |
| `spawn` | Enemy spawn tile |
| `goal` | Enemy objective tile |

## Range Patterns

Defined in `RANGE_PATTERNS` (`src/shared/utils/GridMath.ts`):

| Pattern | Relative Offsets | Used By |
|---------|-----------------|---------|
| `selfOnly` | `[0,0]` | Protector, Bard |
| `meleeFront` | `[-1,0], [0,0]` | Most ground units |
| `meleeCross` | `[0,0], [-1,0], [1,0], [0,-1], [0,1]` | Lord (alt) |
| `ranged4x3` | 3 columns × 4 rows ahead `[-3..0][-1..1]` | Most ranged |
| `ranged5x3` | 3 columns × 5 rows ahead | Artilleryman |
| `pointBlank` | `[-1,0]` | Heavyshooter |
| `line4` | `[-1,0], [-2,0], [-3,0], [-4,0]` | Blast Caster |

Patterns are relative to unit position and rotated by facing direction.

## Floating Numbers

- **Damage vs enemy:** white arrow (`>`), purple tilde (`~`) for thermal — floats up and fades
- **Damage vs unit:** red arrow, purple tilde — floats up and fades
- **Healing:** green `+{amount}` — floats up and fades
- **Flash messages:** centered bottom, fade up — used for deploy, retreat, kill, death events

## Integration Points

| System | Called By | Frequency |
|--------|-----------|-----------|
| `CombatSystem.update()` | `GameScene.update()` | Every frame |
| `HealingSystem.update()` | `GameScene.update()` | Every frame |
| `EnemyManager.update()` | `GameScene.update()` | Every frame |
| `DeploymentSystem.update()` | `GameScene.update()` | Every frame |

GameScene decision mode halves delta by 0.5× for all systems simultaneously when inspecting a unit.
