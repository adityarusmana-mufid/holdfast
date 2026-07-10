# Enemy Archetype Expansion — Full Roster

**Date:** 2026-07-10
**Status:** Approved design
**Basis:** Arknights normal enemy archetypes adapted for Holdfast's geometric-shape visual style and damage system (kinetic/thermal/true)

## Motivation

The existing roster of 5 enemy types (Scout Car, APC, Tank, Drone, Artillery Caster) provides basic stat variety but lacks the behavioral diversity that creates strategic decision-making. This expansion introduces 8 new enemy families, each with a unique behavior that forces specific player responses — mirroring Arknights' approach where every enemy type tests a different strategic dimension.

## New EnemyConfig Behavior Model

Extend `EnemyConfig` with a `behavior` field:

```typescript
type EnemyBehavior =
  | { type: 'standard' }
  | { type: 'exploder'; explosionDamage: number; explosionRadius: number; damageType: DamageType }
  | { type: 'stealth'; detectionRange: number }
  | { type: 'healer'; healAmount: number; healInterval: number; healRange: number }
  | { type: 'buffer'; buffAtk: number; buffRange: number }
  | { type: 'shielded'; shieldHp: number }
  | { type: 'summoner'; spawnType: string; spawnInterval: number; spawnCount: number }
```

## Full Enemy Roster

### Legend

- All stats are fixed per enemy type — no chapter scaling.
- Difficulty scales horizontally: harder levels = more enemies, denser waves, complex route combos.
- Each archetype has a normal variant (distinct color) and **one elite variant** (grey color, "Elite" suffix).
- Elite stats = ~1.5x HP, ~1.3x ATK, ~1.3x armor/RES compared to normal.

### Existing (preserved) + Elite variants

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Aerial | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|--------|-------|----|----------|
| soldier | Scout Car | 2200 | 280 | 100 | 0 | 60 | kinetic | — | `#e74c3c` | 1 | standard |
| soldier_elite | Scout Car Elite | 3300 | 360 | 130 | 0 | 60 | kinetic | — | `#808080` | 2 | standard |
| trooper | APC | 3000 | 350 | 150 | 5 | 42 | kinetic | — | `#c0392b` | 2 | standard |
| trooper_elite | APC Elite | 4500 | 450 | 200 | 10 | 42 | kinetic | — | `#707070` | 3 | standard |
| heavy | Tank | 8000 | 600 | 400 | 10 | 30 | kinetic | — | `#8e44ad` | 3 | standard |
| heavy_elite | Tank Elite | 12000 | 800 | 520 | 15 | 30 | kinetic | — | `#606060` | 4 | standard |
| drone | Drone | 1500 | 200 | 50 | 0 | 72 | kinetic | ✅ | `#f39c12` | 1 | standard |
| drone_elite | Drone Elite | 2200 | 260 | 80 | 0 | 72 | kinetic | ✅ | `#909090` | 2 | standard |
| caster | Artillery Caster | 2500 | 250 | 80 | 0 | 36 | thermal | — | `#9b59b6` | 2 | standard |
| caster_elite | Artillery Caster Elite | 3800 | 330 | 100 | 0 | 36 | thermal | — | `#808080` | 3 | standard |

### New Archetypes

#### 1. Rusher (Replaces "Hound" — fast swarm)

Fast, fragile, low block count needed. Tests early DP economy and AoE coverage.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|----|----------|
| rusher | Rusher | 1800 | 220 | 50 | 0 | 85 | kinetic | `#e67e22` | 1 | standard |
| rusher_elite | Assault Rusher Elite | 2800 | 300 | 80 | 0 | 95 | kinetic | `#a0a0a0` | 2 | standard |

#### 2. Marksman (Replaces "Crossbowman" — ranged kinetic)

Ranged kinetic attacker that targets backline. Tests defender coverage and tank placement.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Range | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|-------|----|----------|
| marksman | Marksman | 2400 | 350 | 80 | 0 | 38 | kinetic | 2.5 | `#27ae60` | 2 | standard |
| marksman_elite | Marksman Elite | 3600 | 480 | 120 | 0 | 42 | kinetic | 3.0 | `#808080` | 3 | standard |

#### 3. Gunship (Heavy aerial + buffer)

Tanky aerial unit that also buffs nearby allies. Tests anti-air prioritization and target focus.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Range | Aerial | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|--------|-------|----|----------|
| gunship | Gunship | 5000 | 350 | 150 | 15 | 45 | kinetic | 2.0 | ✅ | `#f1c40f` | 3 | standard |
| gunship_elite | Gunship Elite | 7000 | 450 | 200 | 20 | 50 | kinetic | 2.0 | ✅ | `#808080` | 4 | buffer (20% ATK, 2.0 range) |

#### 4. Breacher (Replaces "Slug" — explode on death)

Suicide unit that explodes for AoE thermal damage on death. Tests spacing and kill-at-range discipline.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|----|----------|
| breacher | Breacher | 2500 | 150 | 30 | 0 | 52 | kinetic | `#d35400` | 2 | exploder (400 thermal, 1.5 tiles) |
| breacher_elite | Breacher Elite | 4000 | 200 | 50 | 0 | 55 | kinetic | `#909090` | 3 | exploder (600 thermal, 2.0 tiles) |

#### 5. Phantom (Replaces "Wraith" — stealth)

Invisible until a friendly unit is within detection range. Tests prediction, scout deployment, and front-line defense.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|----|----------|
| phantom | Phantom | 3800 | 450 | 50 | 15 | 48 | kinetic | `#2c3e50` | 2 | stealth (detect 2.0 tiles) |
| phantom_elite | Phantom Elite | 5500 | 600 | 80 | 25 | 52 | kinetic | `#505050` | 3 | stealth (detect 1.5 tiles) |

#### 6. Repair Vehicle (Healer)

Periodically heals nearby damaged enemies. Tests priority targeting and burst damage.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|----|----------|
| repair | Repair Vehicle | 3500 | 200 | 100 | 0 | 34 | kinetic | `#1abc9c` | 2 | healer (200 HP / 3.5s, 1.5 tile) |
| repair_elite | Repair Elite | 5000 | 250 | 150 | 0 | 38 | kinetic | `#808080` | 3 | healer (350 HP / 3.0s, 2.0 tile) |

#### 7. Shielded Transport (Shield)

Has a damage-absorbing shield that depletes before HP. Tests sustained fire vs spike damage.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|-------|----|----------|
| shielded | Shielded Transport | 5000 | 300 | 100 | 0 | 36 | kinetic | `#2980b9` | 2 | shielded (2500 shield) |
| shielded_elite | Shielded Elite | 7000 | 400 | 150 | 0 | 38 | kinetic | `#666666` | 3 | shielded (4000 shield) |

#### 8. Carrier Drone (Summoner)

Aerial unit that periodically spawns Rushers. Tests board control and spawn-camping.

| ID | Name | HP | ATK | Armor | RES | Speed | Dmg | Aerial | Color | DP | Behavior |
|----|------|----|-----|-------|-----|-------|-----|--------|-------|----|----------|
| carrier | Carrier Drone | 3500 | 150 | 100 | 10 | 28 | kinetic | ✅ | `#e91e63` | 3 | summoner (rusher, 10s, 1) |
| carrier_elite | Carrier Elite | 5000 | 200 | 150 | 15 | 30 | kinetic | ✅ | `#808080` | 4 | summoner (rusher, 7s, 2) |

## Behavior Processing

| Behavior | Where | How |
|----------|-------|-----|
| standard | — | Default enemy. Attacks blocker (ground) or nearest ranged (aerial). |
| exploder | `CombatSystem.onEnemyKilled` | On death, create delayed AoE circle at position. Damages all friendly units within radius. |
| stealth | `EnemySprite.update` | Alpha = 0.2 when no unit within `detectionRange`. Full alpha when detected. |
| healer | `EnemyManager.updateBehavior` | Timer pulse. Finds nearest damaged ally within `healRange`, heals `healAmount`. |
| buffer | `EnemyManager.updateBehavior` | Aura: every 1s, apply ATK buff to all allies within `buffRange`. |
| shielded | `CombatSystem.calcDamage` | Damage subtracts from `shieldHp` first. Visual: blue outline while shielded. |
| summoner | `EnemyManager.updateBehavior` | Timer pulse. Spawns enemy type at own position (same route). |

### Implementation Notes

- All behavior processing lives in `EnemyManager` (or extracted to `BehaviorSystem` if it grows).
- Stealth uses a simple distance check against all deployed units — no line-of-sight.
- Exploder spawns a visual warning circle (0.5s delay) before damage applies, giving the player time to react.
- Shielded enemies show a blue shield indicator on their sprite while shield is active.
- Summoner spawns use the same `spawnEnemy()` code path as wave spawns.
- Healer and buffer effects should have clear visual feedback (green pulse for heals, yellow glint for buffs).
- `behavior` is single-choice per enemy. `isAerial` flag is independent — any behavior can be aerial (e.g., exploder + aerial = flying bomb).

## Visual Variations

Normal enemies use distinct colors per archetype. Elite variants use grey tones (`#606060`–`#a0a0a0` depending on size class) with "Elite" appended to their name. This makes elite threats instantly recognizable regardless of archetype.

Each archetype also gets a distinct geometric shape to differentiate at a glance:

| Archetype | Shape | Visual Cue |
|-----------|-------|-----------|
| Scout / Trooper / Heavy | Circle | Existing procedural circles |
| Rusher | Triangle | Pointing in direction of travel |
| Marksman | Diamond | Crosshair overlay when has target |
| Drone / Gunship | Circle with ring | Thin outer ring (aerial indicator) |
| Breacher | Hexagon | Pulsing red glow when low HP |
| Phantom | Circle (dim) | Faint, semi-transparent |
| Repair | Square | Green cross pulse |
| Shielded | Circle with border | Blue ring (full), fading to red (depleted) |
| Carrier | Hexagon with trail | Small spawn indicators beneath |

## Level Integration

No chapter stat scaling. Difficulty is purely horizontal — harder levels use more enemies per wave, denser spawns, wider type variety, complex routing, and elite variants. Enemy type introduction per chapter:

- **Ch1**: soldier, trooper, rusher, drone, breacher
- **Ch1 late**: marksman, caster
- **Ch2**: heavy, phantom, shielded, repair
- **Ch2 late**: gunship
- **Ch3**: carrier + all elite variants

## Impact on CombatSystem

Minimal changes needed:
- `calcDamage` gets a `shielded` branch: subtract from shield first, then apply remainder to HP.
- `onEnemyKilled` gets an exploder check: spawn AoE effect at enemy position.
- Ranged enemy targeting (`getRangedTarget`) already exists for caster — marksman reuses the same logic.

## Impact on EnemyManager

New methods:
- `updateBehaviors(delta)` — iterates alive enemies, dispatches per behavior type
- `handleExplosion(position, damage, radius)` — damages units in AoE
- `handleHealerTick(enemy)` — heals nearest damaged ally
- `handleBufferTick(enemy)` — buffs nearby allies
- `handleSummonerTick(enemy)` — spawns minion at enemy position

## Impact on EnemySprite

- `behavior: EnemyBehavior` field
- `shieldHp: number` (current shield HP, if shielded)
- `isDetected: boolean` (stealth detection state)
- `detectionRadius` helper (for stealth visibility check)
- Shape rendering changes per visual table above

## Testing

- Each behavior type gets a test: exploder AoE damages correct targets, stealth detection toggles correctly, healer restores HP to nearest damaged ally, buffer applies ATK buff, shielded absorbs correct damage amount, summoner spawns correct enemy type at interval.
- All existing CombatSystem tests must pass unchanged.
