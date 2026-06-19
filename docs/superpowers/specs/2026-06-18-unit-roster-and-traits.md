# Unit Roster & Traits — Phase 1

**Date:** 2026-06-18
**Status:** Implemented (documented for reference)
**Basis:** Arknights class/sub-class hierarchy, simplified to one unit per sub-class

## Roster

**26 unit configs** defined in `src/config/units.ts`. One per sub-class across 8 archetypes:

### Vanguard (2)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `pioneer` | Pioneer | ground | 1200 | 300 | 230 | 0 | 12 | 10s | BlocksTwo |
| `charger` | Charger | ground | 1100 | 290 | 200 | 0 | 10 | 10s | DPOnKill(+1), FullRefundRetreat |

### Guard (6)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `fighter` | Fighter | ground | 1800 | 360 | 220 | 0 | 9 | 15s | FastAttack |
| `arts_fighter` | Arts Fighter | ground | 1400 | 280 | 180 | 15 | 12 | 15s | ArtsDamage |
| `swordmaster` | Swordmaster | ground | 1800 | 400 | 200 | 0 | 15 | 15s | DoubleHit |
| `earthshaker` | Earthshaker | ground | 1600 | 350 | 200 | 0 | 18 | 15s | LinearAoE |
| `soloblade` | Soloblade | ground | 1500 | 380 | 180 | 0 | 13 | 15s | HealOnAttack(50) |
| `reaper` | Reaper | ground | 1600 | 350 | 200 | 0 | 14 | 15s | HealPerHitCapped(80) |
| `lord_guard` | Lord | ground | 1600 | 350 | 220 | 0 | 16 | 15s | RangedWhenNotBlocking |
| `instructor_guard` | Instructor | ground | 1400 | 350 | 200 | 0 | 15 | 15s | RangedWhenNotBlocking, RangedAttack80 |
| `crusher` | Crusher | ground | 2200 | 350 | 160 | 0 | 20 | 15s | (none — uses `true` damage type) |

### Defender (4)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `protector` | Protector | ground | 2200 | 280 | 380 | 0 | 19 | 20s | BlocksThree |
| `fortress_defender` | Fortress | ground | 2000 | 300 | 320 | 0 | 22 | 20s | RangedAoEWhenNotBlocking |
| `juggernaut` | Juggernaut | ground | 3000 | 250 | 500 | 50 | 27 | 20s | BlocksThree, `canBeHealed: false` |

### Caster (4)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `core_caster` | Core Caster | ranged | 1050 | 410 | 80 | 15 | 19 | 20s | ArtsDamage |
| `blast_caster` | Blast Caster | ranged | 900 | 350 | 60 | 15 | 23 | 20s | LinearAoE, ArtsDamage |
| `splash_caster` | Splash Caster | ranged | 950 | 380 | 60 | 20 | 22 | 20s | AoESplash(r=1, mult=0.5), ArtsDamage |
| `chain_caster` | Chain Caster | ranged | 900 | 340 | 50 | 15 | 19 | 20s | ChainJump(r=2, max=3, falloff=0.5), ArtsDamage |

### Sniper (4)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `sniper` | Marksman | ranged | 1000 | 310 | 100 | 0 | 12 | 15s | — |
| `deadeye` | Deadeye | ranged | 800 | 450 | 70 | 0 | 15 | 15s | TargetingLowestDef |
| `heavyshooter` | Heavyshooter | ranged | 1100 | 480 | 120 | 0 | 14 | 15s | Range: pointBlank (adjacent only) |
| `artilleryman` | Artilleryman | ranged | 900 | 380 | 80 | 0 | 21 | 20s | AoESplash(r=1, mult=0.5), Range: 5x3 |

### Supporter (2)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `decel_binder` | Decel Binder | ranged | 850 | 200 | 70 | 0 | 14 | 15s | SlowOnHit(value=0.5, dur=2s) |
| `bard_supporter` | Bard | ranged | 800 | 60 | 50 | 0 | 10 | 15s | AoEHoT(r=2, value=60) |

### Medic (2)
| ID | Subtype | Type | HP | ATK | DEF | RES | Cost | Redeploy | Traits |
|----|---------|------|----|-----|-----|-----|------|----------|--------|
| `medic_st` | Medic | ranged | 900 | 280 | 60 | 0 | 17 | 15s | HealAlly |
| `incantation_medic` | Incantation Medic | ranged | 850 | 280 | 50 | 15 | 18 | 15s | AttackHealsAlly, ArtsDamage |

## Traits

26 traits defined in `UnitTrait` enum (`src/types/index.ts`). Each has optional parameter fields via `UnitTraitConfig`.

### Blocking Traits
| Trait | Effect | Used By |
|-------|--------|---------|
| `BlocksTwo` | Blocks up to 2 enemies | Pioneer |
| `BlocksThree` | Blocks up to 3 enemies | Protector, Juggernaut |

### Damage Traits
| Trait | Effect | Used By |
|-------|--------|---------|
| `ArtsDamage` | Unit deals thermal damage | Core Caster, Arts Fighter, Splash Caster, Chain Caster, Incantation Medic, Blast Caster |
| `DoubleHit` | Attacks twice per attack cycle | Swordmaster |
| `FastAttack` | attackInterval 0.78s (faster than normal) | Fighter, Soloblade |
| `AoESplash` | Splash damage in radius around primary target. Param: `radius`, `damageMultiplier` | Artilleryman, Splash Caster |
| `LinearAoE` | Hits all enemies along the unit's range line | Blast Caster, Earthshaker |
| `ChainJump` | Attack chains to nearby enemies. Param: `radius`, `maxTargets`, `damageFalloff` | Chain Caster |

### Offensive Utility
| Trait | Effect | Used By |
|-------|--------|---------|
| `SlowOnHit` | Slows enemy by `factor`× for `duration` seconds | Decel Binder |
| `TargetingLowestDef` | Prioritizes enemy with lowest armor | Deadeye |
| `RangedWhenNotBlocking` | Switches to altRangePattern when not blocking | Lord Guard |
| `RangedAoEWhenNotBlocking` | AoE ranged attack when not blocking | Fortress Defender |
| `RangedAttack80` | Ranged attacks deal 80% ATK (paired with `RangedWhenNotBlocking`) | Instructor Guard |
| `LongRangeAttack` | Extended attack range (NOT YET IMPLEMENTED in any unit) | — |
| `ConditionalDamage120` | +20% damage under condition (NOT YET USED) | — |
| `TakesTrueDamage` | Receives true damage (NOT YET USED) | — |

### Healing & Sustain
| Trait | Effect | Used By |
|-------|--------|---------|
| `HealAlly` | Heals lowest-HP ally in range every attack cycle for ATK amount | Medic |
| `AttackHealsAlly` | Attack also heals nearest injured ally for 50% ATK | Incantation Medic |
| `AoEHoT` | Area health-over-time in `radius` tiles every attack cycle, `value` HP per tick | Bard Supporter |
| `HealOnAttack` | Heals self for `value` HP on each attack | Soloblade |
| `HealPerHitCapped` | Heals self for `value` on kill | Reaper |
| `CannotBeHealed` | Immune to external healing (implicit from `canBeHealed: false`) | Juggernaut |

### DP & Economy
| Trait | Effect | Used By |
|-------|--------|---------|
| `DPOnKill` | Gains +`value` DP per kill | Charger |
| `FullRefundRetreat` | Full DP refund on retreat (instead of half) | Charger |
| `PassiveDPRegen` | Increases DP regen rate (NOT YET IMPLEMENTED) | — |

## UnitConfig Type (`src/types/index.ts`)

```typescript
interface UnitConfig {
  id: string            // unique key
  name: string          // archetype display name (e.g. "Guard", "Medic")
  archetype: string     // class: "vanguard" | "guard" | "defender" | "caster" | "sniper" | "supporter" | "medic"
  subtypeLabel: string  // sub-class display name (e.g. "Fighter", "HealAlly")
  type: 'ground' | 'ranged'
  hp: number
  atk: number
  def: number
  res: number           // percentage 0–100
  damageType: DamageType  // 'kinetic' | 'thermal' | 'true'
  attackInterval: number  // seconds between attacks
  rangePattern: number[][]  // relative [row, col] offsets
  altRangePattern?: number[][]  // used when RangedWhenNotBlocking is active
  blockCount: number    // 0 = cannot block (ranged), 1-3 = ground blocker capacity
  dpCost: number
  redeployTime: number  // seconds before unit can be re-deployed after retreat/death
  color: number         // Phaser hex color for visual
  traits: UnitTraitConfig[]
  splashConfig?: SplashConfig  // { radius, damageMultiplier, damageType? }
  canBeHealed?: boolean  // default true
}
```

## Design Decisions

1. **One unit per sub-class** — full Arknights would have multiple units per sub-class with different stats/traits. v1 simplifies to exactly one representative per sub-class.

2. **RES as percentage** — stored 0–100, used as `ATK × (1 − RES/100)` in thermal formula. No flat RES in v1.

3. **`true` damage type** — bypasses both DEF and RES. Used by Crusher (Guard). Formula: `ATK` (no min 5% floor).

4. **Alt range patterns** — units with `RangedWhenNotBlocking` have two range patterns: melee (when blocking) and ranged (when free). This mirrors Arknights Lord guards.

5. **No unit growth** — all units are fixed power. No leveling, no promotion, no potential unlocks. This is a design constraint for Holdfast 1.

## Future Considerations

- Skills/SP system in v2 would add per-unit active abilities
- v2 could add multiple units per sub-class (different rarities/stats)
- `PassiveDPRegen`, `ConditionalDamage120`, `TakesTrueDamage`, `LongRangeAttack` defined but unused — available for future unit additions
- Unit roster is shared across all levels — no level-specific unit gating
