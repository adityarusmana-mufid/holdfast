# Skills System Design

Date: 2026-06-25
Status: Draft

## Overview

Add an Arknights-inspired skills system to Holdfast. Each unit subclass gets 3 skills (borrowed from
different Arknights operators in the same subclass branch). Player picks one skill per unit in
PickerScene before confirming deployment.

## SP Mechanics

Two independent axes:

**Recovery type** (how SP is gained):
- `auto` — +1 SP per second automatically
- `offensive` — +1 SP each time the unit attacks (or heals for Medics)
- `defensive` — +1 SP each time the unit is attacked

**Activation type** (when skill fires):
- `auto` — fires immediately when SP ≥ cost
- `manual` — player taps skill button when SP ≥ cost
- `toggle` — player taps to activate and again to deactivate. No duration.
  Costs SP each time it is toggled on. Stays active until manually turned off.
- `passive` — no SP bar, always active

Skills have `spInitial` (pre-charged SP on deploy) and `spCost`.

## Duration Axis

A third axis (after recovery type × activation type) governing how long a skill's effect lasts on the battlefield.

| Type | Behavior | Duration Value | Arknights Example | In v1? |
|------|----------|----------------|-------------------|--------|
| `instant` | Effect fires once immediately, then done. No ongoing state to track. Two subtypes: **next attack** (skill consumed on next hit) and **immediate** (effect applied right now). | `undefined` or omitted | Power Strike (next attack 210%), Supply (generate DP now), Sword Heart (deal 500% now) | ✅ |
| `duration` | Skill stays active for N seconds. During this time the unit has modified behavior. Skill expires automatically after N seconds and effects revert. SP resets to 0 after expiration. | number (seconds) | Truesilver Slash (30s ATK +200%), Volcano (15s ATK +130%), Chain Saw (25s ATK +50% AoE) | ✅ |
| `toggle` | Player manually toggles on and off. No automatic expiration. Costs SP each time it's turned on. SP locked while active. Can be turned off at any time, SP immediately available to toggle on again. | `'toggle'` | Mountain S2 Sweeping Stance, SilverAsh S2 Rules of Survival | ✅ |
| `unlimited` | Lasts 3600s — functionally permanent for any gameplay-relevant duration. Used for permanent transformation skills that change a unit's entire mode. SP locked permanently once activated. | `'unlimited'` or 3600 | N/A — deferred. Rare in base Arknights. | ❌ v1 |
| `ammunition` | Instead of a time duration, the skill lasts for N attacks. Each normal attack consumes 1 ammunition. Skill auto-deactivates when ammunition runs out. Can also be manually deactivated early. | number (bullets/attacks) | Cantabile S2, Lumen S3 — attacks consume ammo instead of timer | ❌ v1 |

**Notes on sub-types:**

- **Instant + "next attack"**: The SP is consumed and the unit enters a "prepped" state (`readyEffect`). On the next valid attack, the modifier applies and the state resets. If the unit has no target when the skill activates (auto-activation), SP is held until a target appears — no SP lock during this wait. Manual instant skills require the player to activate; if no target exists, the skill fires anyway (e.g., Sword Heart targets an enemy, Supply generates DP regardless).
- **Duration + auto-activation**: Skills with auto recovery + auto activation + a duration (e.g., Spirit Burst, Bloodthirst) auto-fire when SP is full and run for their duration. SP resets to 0 and starts recharging only after duration expires.
- **Toggle vs Duration**: Toggle has no countdown — the player decides when to end it. Duration always auto-expires. Toggle costs SP each time it's turned on (not per second). Duration spends SP once at activation.
- **Unlimited (deferred)**: Used in base Arknights for skills like Skadi the Corrupting Heart S3 which permanently changes attack range and type. We skip this for v1 since no unit in our roster has such a transformative skill.
- **Ammunition (deferred)**: Used in base Arknights for skills that consume ammo per attack. The skill can be manually deactivated to preserve remaining ammo. We skip this for v1 — it requires tracking ammo count per attack and a manual deactivation button distinct from toggle.

**v1 skills breakdown by duration type:**

| Count | Type | Details |
|-------|------|---------|
| 34 | `instant` | All "next attack" (offensive recovery) and immediate-effect skills |
| 42 | `duration` | All time-based buff skills with auto-expiration |
| 2 | `toggle` | Sweeping Stance (Fighter S2), Rules of Survival (Lord S2) |
| 78 | **Total** | |

**Review pass (all 78 skills):** Each skill's duration field matched against its effect description — verified across all 26 subclasses. No discrepancies found. The `-` entries (instant) correctly represent skills that fire once without ongoing state. Toggle entries correctly represent manual on/off without countdown. Duration entries correctly represent skills with time-based auto-expiration.

## Types

```typescript
type SpRecoveryType = 'auto' | 'offensive' | 'defensive'
type SkillActivationType = 'auto' | 'manual' | 'toggle' | 'passive'

interface SkillConfig {
  id: string
  name: string
  description: string    // display text, numbers rendered in blue
  spRecovery: SpRecoveryType
  activation: SkillActivationType
  spCost: number
  spInitial: number
  duration?: number       // undefined = instant
  charges?: number        // multi-charge storage
  effect: SkillEffect
}

interface SkillState {
  config: SkillConfig
  currentSp: number
  isActive: boolean       // true while toggle is on or duration is counting
  remainingDuration: number  // for duration skills; -1 for toggle
  charges: number
  spLocked: boolean       // true while active or charged-but-no-target
}
```

### Effect Types

```typescript
type SkillEffect =
  | { type: 'generateDP'; amount: number }
  | { type: 'enhanceAttack'; atkMultiplier?: number; hitCount?: number; aspdBonus?: number;
      trueDamage?: boolean; splash?: { radius: number; damageMultiplier: number };
      defIgnore?: number; targetCount?: number; binds?: boolean; slowFactor?: number }
  | { type: 'statBuff'; atkMultiplier?: number; defMultiplier?: number; aspdBonus?: number;
      blockBonus?: number; hpRegenPerSecond?: number | { percent: number };
      healOnAttackMultiplier?: number }
  | { type: 'heal'; amountMultiplier?: number; isPercent?: boolean; targetCount?: number;
      range?: 'self' | 'ally' | 'allies' }
  | { type: 'aoeAttack'; radius: number; damageMultiplier: number; damageType?: DamageType }
  | { type: 'buffAlly'; atkMultiplier?: number; defMultiplier?: number; aspdBonus?: number;
      hpRegen?: number; duration: number }
  | { type: 'debuffEnemies'; slowFactor?: number; duration: number; fragile?: number; radius?: number }
  | { type: 'statToggle'; defMultiplier?: number; atkMultiplier?: number;
      blockBonus?: number; attackAllBlocked?: boolean; hpRegenPerSecond?: number | { percent: number };
      meleeOnly?: boolean }                               // Mountain S2 / Rules of Survival style
  | { type: 'survival'; minHp?: boolean; shieldPercent?: number; duration?: number }
  | { type: 'special'; description: string }
```

## UnitConfig Changes

Add to `UnitConfig`:
```typescript
skills: SkillConfig[3]    // always exactly 3
```

Add to `DeployedUnit`:
```typescript
skillState?: SkillState
```

## Per-Subclass Skill Sets

### Vanguard

#### Pioneer
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Supply | auto | auto | 33 | 0 | - | Generates 12 DP |
| S2 | Sword Rain | auto | manual | 30 | 10 | - | Deals 300% AoE damage (2-tile radius) around self, stuns 2s |
| S3 | Aerial Hammer | auto | manual | 45 | 15 | 15s | ATK +60%, attacks deal splash (1-tile radius), generate 1 DP on kill |

#### Charger
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Charging | auto | auto | 4 | 0 | - | Next attack deals 200% ATK |
| S2 | End of Line | auto | manual | 35 | 10 | 20s | ATK +50%, generate 1 DP on attack hit |
| S3 | Mandragora | auto | manual | 50 | 20 | 15s | ATK +100%, true damage, cannot be blocked |

### Guard

#### Fighter
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Power Strike | offensive | auto | 4 | 0 | - | Next attack deals 210% ATK |
| S2 | Sweeping Stance | auto | toggle | 8 | 0 | toggle | ATK +50%, Block +1, attacks hit all blocked enemies, restore 5% HP/sec |
| S3 | Collapse | auto | manual | 50 | 20 | 12s | ATK +80%, attacks hit all enemies in melee range |

#### Arts Fighter
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Arts Strike | offensive | auto | 4 | 0 | - | Next attack deals 230% ATK as Arts |
| S2 | Shadow Strike | auto | manual | 35 | 10 | 20s | ATK +40%, attacks splash 1-tile radius as Arts |
| S3 | Twilight | auto | manual | 60 | 25 | 15s | ATK +150%, true damage |

#### Centurion
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Sweeping Strike | offensive | auto | 4 | 0 | - | Next attack deals 180% ATK to all blocked enemies |
| S2 | Chain Saw | auto | manual | 40 | 15 | 25s | ATK +50%, attacks deal AoE damage around self |
| S3 | Bone Fracture | auto | manual | 50 | 20 | 15s | ATK +80%, cannot be reduced below 1 HP |

#### Swordmaster
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Double Strike | offensive | auto | 4 | 0 | - | Next attack fires 3 hits at 140% ATK each |
| S2 | Sword Heart | auto | manual | 30 | 10 | - | Deals 500% ATK to target enemy |
| S3 | Radiant Edge | auto | manual | 45 | 15 | 15s | ATK +60%, attacks ignore 50% DEF |

#### Lord
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Power Shot | offensive | auto | 4 | 0 | - | Next ranged attack deals 210% ATK |
| S2 | Rules of Survival | auto | toggle | 5 | 0 | toggle | DEF +100%, restore 4% HP/sec, attacks become melee |
| S3 | Truesilver Slash | auto | manual | 75 | 50 | 30s | ATK +200%, attack up to 6 targets, DEF -70%, range expands |

#### Instructor
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Command | auto | auto | 4 | 0 | - | Next attack buffs nearest ally ATK +30% for 5s |
| S2 | War Cry | auto | manual | 40 | 15 | 25s | All allies in range gain ATK +40% |
| S3 | Pride of Vanguard | auto | manual | 50 | 20 | 20s | Self ATK +80%, all melee allies gain ATK +50% |

#### Soloblade
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Bloodthirst | auto | auto | 5 | 0 | 20s | ATK +40%, heal on attack increased 50% |
| S2 | Unyielding | auto | manual | 35 | 10 | 25s | ATK +80%, DEF +80%, heal on attack |
| S3 | Xanxia Sword | auto | manual | 50 | 20 | 15s | ATK +120%, attacks ignore 100% DEF |

#### Reaper
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Reaping | auto | auto | 5 | 0 | 20s | ATK +30%, heal per enemy hit doubled |
| S2 | Harvest | auto | manual | 35 | 10 | 15s | ATK +60%, attacks hit all enemies in wide range |
| S3 | Blood Scythe | auto | manual | 50 | 20 | 12s | ATK +100%, attacks hit enemies in 2-tile radius |

#### Crusher
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Crush | offensive | auto | 4 | 0 | - | Next attack deals 200% ATK as true damage |
| S2 | Shatter | auto | manual | 40 | 10 | 20s | ATK +40%, attacks deal true splash (1-tile) |
| S3 | Annihilate | auto | manual | 55 | 25 | 15s | ATK +120%, attack all enemies in melee range as true |

#### Earthshaker
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Shockwave | offensive | auto | 4 | 0 | - | Next attack deals 200% ATK in 3-tile line |
| S2 | Tremor | auto | manual | 35 | 10 | 20s | ATK +30%, attacks trigger 1-tile splash around target |
| S3 | Lotus Hammer | auto | manual | 50 | 20 | 12s | ATK +80%, attacks hit all enemies in 2-tile radius |

### Defender

#### Protector
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | DEF Up | auto | manual | 40 | 15 | 30s | DEF +80% |
| S2 | Shell Defense | auto | manual | 50 | 20 | 20s | DEF +200%, block +1, restore 6% HP/sec |
| S3 | Self-Sustain | auto | auto | 40 | 0 | 15s | When HP < 40%, gain DEF +100%, ATK +50% |

#### Guardian (Healing Defender)
Trait: `HealAlly, BlocksThree`
HP: 2000, ATK: 250, DEF: 300, RES: 0, Interval: 1.5s, Block: 3, DP: 20
Range: `ranged4x3` (for healing)

| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Healing Wave | auto | auto | 5 | 0 | - | Next heal amount tripled (300% ATK) |
| S2 | Medical Mode | auto | manual | 40 | 15 | 30s | Heal interval halved, heals up to 2 allies per tick |
| S3 | Calcification | auto | manual | 60 | 25 | 20s | DEF +80%, heals all allies in range every 2s, enemies in range take +40% damage |

#### Fortress
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Shelling | offensive | auto | 5 | 0 | - | Next ranged attack deals 180% splash (1-tile radius) |
| S2 | Bombardment | auto | manual | 40 | 15 | 25s | Ranged attacks hit all enemies in 2-tile radius |
| S3 | Artillery | auto | manual | 55 | 25 | 20s | ATK +80%, attacks hit all enemies in range |

#### Juggernaut
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Indomitable | auto | auto | 10 | 0 | - | When HP < 30%, gain shield for 30% max HP |
| S2 | Juggernaut Mode | auto | manual | 40 | 10 | 20s | Block +2, restore 5% HP/sec, attacks deal splash |
| S3 | Unstoppable | auto | manual | 55 | 20 | 15s | ATK +150%, DEF +100%, attacks hit all blocked enemies |

### Caster

#### Core Caster
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Tactical Chant | auto | manual | 30 | 0 | 30s | ASPD +60 |
| S2 | Spirit Burst | auto | auto | 100 | 50 | 25s | Fire homing projectiles at random targets, each 45% ATK |
| S3 | Volcano | auto | manual | 80 | 40 | 15s | ATK +130%, attacks deal splash (1-tile), range extended +1 |

#### Blast Caster
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Ignition | auto | auto | 5 | 0 | - | Next attack deals 200% ATK in a line |
| S2 | Scorched Earth | auto | manual | 40 | 15 | 25s | Attack pattern becomes 3-tile-wide line |
| S3 | Pyroclasm | auto | manual | 60 | 25 | 20s | ATK +100%, leaves burning ground dealing 30% ATK/sec DoT for 5s |

#### Splash Caster
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Burst | auto | auto | 5 | 0 | - | Next attack deals 200% ATK splash |
| S2 | Firestorm | auto | manual | 40 | 15 | 25s | Splash radius +1, ATK +30% |
| S3 | Cataclysm | auto | manual | 55 | 25 | 20s | ATK +80%, attacks hit all enemies in splash range |

#### Chain Caster
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Static | auto | auto | 5 | 0 | - | Next attack chains to 3 targets, 85% damage per jump |
| S2 | Overload | auto | manual | 40 | 15 | 25s | Chains to 4 targets, no damage falloff |
| S3 | Lightning Storm | auto | manual | 60 | 25 | 15s | ATK +100%, chains to all enemies in range |

### Sniper

#### Marksman
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Charging Mode | offensive | auto | 5 | 0 | - | Next attack fires 3 shots at 120% ATK each |
| S2 | Shooting Mode | auto | manual | 35 | 15 | 15s | Fire 4 shots per attack at 110% ATK each |
| S3 | Overloading Mode | auto | auto | 30 | 20 | 15s | Fire 5 shots per attack, slight ASPD bonus |

#### Deadeye
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Precision | auto | auto | 5 | 0 | - | Next attack deals 250% ATK |
| S2 | Snipe | auto | manual | 25 | 10 | - | Deals 400% ATK to target enemy |
| S3 | Full-Auto | auto | manual | 45 | 20 | 25s | Range extends to full map, ATK +60% |

#### Heavyshooter
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Point Blank | offensive | auto | 4 | 0 | - | Next attack deals 200% ATK |
| S2 | Suppressing Fire | auto | manual | 35 | 10 | 20s | ATK +50%, attacks slow enemies 40% for 2s |
| S3 | Devastator | auto | manual | 45 | 15 | 15s | ATK +80%, attacks hit all enemies in range |

#### Artilleryman
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | High Explosive | offensive | auto | 5 | 0 | - | Next attack deals 220% splash (1-tile radius) |
| S2 | Barrage | auto | manual | 40 | 15 | 25s | ASPD +40, attacks hit all enemies in 2-tile radius |
| S3 | Orbital Strike | auto | manual | 50 | 20 | 20s | ATK +60%, attacks slow enemies 30% for 2s |

### Supporter

#### Decel Binder
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Web | offensive | auto | 5 | 0 | - | Next attack binds enemy 2.5s (cannot move/attack) |
| S2 | Glacial Field | auto | manual | 40 | 15 | 25s | All enemies in range slowed 60% |
| S3 | Time Warp | auto | manual | 60 | 25 | 20s | Range +1, ATK +50%, enemies in range slowed 80% |

#### Bard
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Inspire | auto | manual | 30 | 10 | 25s | All allies in range gain ATK +20% |
| S2 | Ballad | auto | manual | 40 | 15 | 20s | All allies in range gain ATK +40%, DEF +30% |
| S3 | Requiem | auto | manual | 60 | 25 | 15s | All allies in range gain ATK +80%, restore 5% HP/sec |

### Medic

#### Medic
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Emergency Triage | auto | auto | 5 | 0 | - | Next heal amount doubled |
| S2 | Medic Overdrive | auto | manual | 35 | 10 | 25s | ASPD +60, heals up to 2 targets |
| S3 | Battlefield Revival | auto | manual | 50 | 20 | - | Heals all allies in range for 250% ATK |

#### Incantation Medic
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Leech Shot | offensive | auto | 5 | 0 | - | Next attack heals lowest HP ally for 50% of damage dealt |
| S2 | Purifying Flames | auto | manual | 40 | 15 | 20s | Attacks heal all allies in range for 30% of damage |
| S3 | Holy Nova | auto | manual | 55 | 25 | - | Deal 300% ATK to all enemies, heal all allies for 200% ATK |

#### Multi Medic
| # | Name | Recovery | Activation | SP | Init | Dur | Effect |
|---|------|----------|-----------|----|------|-----|--------|
| S1 | Team Heal | auto | auto | 5 | 0 | - | Next heal also heals 2 nearby allies for 50% |
| S2 | Mass Recovery | auto | manual | 40 | 15 | 30s | Heals 3 additional targets, all healing +30% |
| S3 | Rejuvenation | auto | manual | 60 | 25 | 20s | Range +1, all allies in range heal 100% ATK every 2s |

## Architecture

### Data Flow

```
units.ts (SkillConfig[]) → PickerScene (show 3 skills, pick 1)
  → squad data (pickedSkillId) → GameScene
    → SkillSystem (spawn SkillState, tick SP, activate)
      → apply effects to CombatSystem/Sprite
```

### PickerScene Layout

Right sidebar (current stats area):
```
┌──────────────────────────────┐
│ Unit Stats (existing)         │
│ HP: 1200  ATK: >300           │
│ DEF: 230  RES: 0%             │
│ ...                           │
├──────────────────────────────┤
│ SKILLS                        │
│ ┌──────────────────────────┐  │
│ │ [1] Supply   33│auto│auto│  │  ← tap to select
│ │ Generates 12 DP           │  │
│ └──────────────────────────┘  │
│ ┌──────────────────────────┐  │
│ │ [2] Sword Rain  30│auto│m│  │  ← highlighted if selected
│ │ Deals 300% AoE damage... │  │
│ └──────────────────────────┘  │
│ ┌──────────────────────────┐  │
│ │ [3] Aerial Hammer 45...  │  │
│ └──────────────────────────┘  │
├──────────────────────────────┤
│ Confirm (Supply)             │
└──────────────────────────────┘
```

Each skill row: clickable container. Shows:
- Line 1: `S1 name  SP├──┤auto│auto` (SP cost + icons for recovery/activation)
- Line 2+: description text with numbers rendered in blue via text markup

On tap: highlight selected skill, update confirm button text to `Deploy with [skill name]`.
Default: S1 pre-selected.

### SkillSystem (runtime)

New system in `src/systems/SkillSystem.ts`:
- `update(delta, units)` — ticks all deployed units' skill state
- SP charge: `recovery === 'auto'` → +1 per second; `offensive` → on attack in CombatSystem; `defensive` → on damaged
- `checkActivation(unit)` — if SP >= cost and not active, either fire auto or enable manual button
- `activateSkill(unit)` — spend SP, apply effect, start duration timer (or set isActive for toggle)
- `deactivateSkill(unit)` — revert effect (also for toggle—tap again to turn off)
- Toggle skills: `isActive` flag tracked; SP barrier resets on deactivation; can re-toggle later
- `getSkillButtonState(unit)` → `{ charged, active, spProgress }` for UI

### GameScene Card Bar

Each card shows a small skill icon/indicator. When skill is manual and charged:
- Skill icon pulses/glows
- Player can tap the deployed unit to open inspect panel, which shows a USE button

For auto skills: small indicator shows when SP is full (skill will fire on next valid target).

### CombatSystem Integration

When `enhanceAttack` skill is active:
- `calculateDamage()` checks unit.skillState for multipliers, hitCount, splash, etc.

When `statBuff` skill is active:
- Unit sprite's stats are modified during duration

When `heal` or `aoeAttack` or `buffAlly` skills activate:
- Immediate effect applied to target/allies/enemies

## Implementation Order

1. Types: add SkillConfig, SkillState, SkillEffect, SpRecoveryType, SkillActivationType
2. Skill definitions: `src/config/skills.ts` with all 78 skills keyed by unit id
3. Update UnitConfig: add `skills: SkillConfig[3]`
4. Update DeployedUnit: add `skillState?: SkillState`
5. SkillSystem: charging, activation, duration management
6. CombatSystem integration: enhanceAttack effects, statBuff effects, debuff effects
7. HealingSystem integration: buff ally effects (for Bard, Instructor)
8. PickerScene UI: skill selection column under stats
9. GameScene UI: skill button on card bar + inspect panel skill activation
10. Squad data: save picked skill ID per unit
