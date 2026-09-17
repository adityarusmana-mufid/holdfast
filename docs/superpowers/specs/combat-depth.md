# Combat Depth — Phase 1

**Date:** 2026-06-17
**Phase:** Enemy Attacks + Terrain Effects
**Basis:** Arknights mechanics (blocker targeting, damage formulas, terrain effects)

## Motivation

Units face zero consequences. HP, DEF, RES, Medics, Defenders exist as stats/systems but are meaningless. Enemies walk past blockers without fighting back. This phase makes combat bidirectional.

## Changes

### Type Changes

- Rename `insulation` → `res` on both `UnitConfig` and `EnemyConfig` (percentage 0–100)
- Add `EnemyConfig.attackInterval: number` (seconds between attacks)
- Add `EnemyConfig.damageType: DamageType`
- Add `TileType.RepairNode` and `TileType.ArmorGrid`

### Damage Formula

Current thermal uses flat subtraction like kinetic. Fix to percentage-based:

```
kinetic: max(ATK × 5%, ATK − DEF)
thermal: max(ATK × 5%, ATK × (1 − RES/100))
```

Extracted into shared `calculateDamage(atk, def, res, type)` used by both directions.

### Enemy Attack System

**Ground enemies:** Attack only if blocked. Attack blocker every `attackInterval` seconds.

**Aerial enemies (drones):** Never blocked. Target nearest ranged unit within 3 tiles.

**Unit death:** HP=0 → auto-retreat (half `dpCostPaid` refund), redeploy timer starts, unit removed.

### Repair Node

| Property | Value |
|---|---|
| Tile type | `repair_node` (ground-deployable) |
| Heal rate | 30 HP/s flat |
| Visual | Green center dot, "RN" label |

### Armor Grid

| Property | Value |
|---|---|
| Tile type | `armor_grid` (ground-deployable) |
| Bonus | +100 flat DEF |
| Visual | Steel-blue center dot, "AG" label |

### Editor

Repair Node and Armor Grid added to tile palette with keyboard shortcuts.

### Enemy Config Defaults

| Enemy | attackInterval | damageType |
|---|---|---|
| Scout Car | 1.0s | kinetic |
| APC | 1.5s | kinetic |
| Tank | 2.5s | kinetic |
| Drone | 1.5s | kinetic |

## Implementation Order

1. Type changes (types + config renames)
2. Damage formula fix
3. Enemy attack loop + unit death → retreat
4. Repair Node
5. Armor Grid
6. Editor tile palette
7. Level update (level-01.json)
