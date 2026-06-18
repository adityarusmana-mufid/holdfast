# Trait System & Squad Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add passive trait system, 24+ implementable unit subtypes, and squad selection screen to Holdfast v1.

**Architecture:** Add `TraitSystem` class as central processor routing trait effects to CombatSystem/DeploymentSystem/EnemyManager. Add `HealingSystem` for medic/hot effects. Add `SquadScene` for team pick before missions. Each subtype is a config entry in `units.ts` with a `traits[]` field referencing the `UnitTrait` enum.

**Tech Stack:** Phaser 3, TypeScript, Vite

---

### Phase 0 — Foundation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/entities/Unit.ts`
- Modify: `src/entities/Enemy.ts`
- Create: `src/systems/TraitSystem.ts`
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/shared/utils/GridMath.ts`

**Steps:**

- [ ] **Step 1: Add trait types to `src/types/index.ts`**

Add after `DamageType`:
```typescript
export type DamageType = 'kinetic' | 'thermal' | 'true'

export enum UnitTrait {
  BlocksTwo = 'blocks_two',
  BlocksThree = 'blocks_three',
  DPOnKill = 'dp_on_kill',
  FullRefundRetreat = 'full_refund_retreat',
  RangedAttack80 = 'ranged_attack_80',
  AoESplash = 'aoe_splash',
  ArtsDamage = 'arts_damage',
  FastAttack = 'fast_attack',
  DoubleHit = 'double_hit',
  HealOnAttack = 'heal_on_attack',
  HealPerHitCapped = 'heal_per_hit_capped',
  CannotBeHealed = 'cannot_be_healed',
  SlowOnHit = 'slow_on_hit',
  ChainJump = 'chain_jump',
  LinearAoE = 'linear_aoe',
  TargetingLowestDef = 'targeting_lowest_def',
  RangedWhenNotBlocking = 'ranged_when_not_blocking',
  RangedAoEWhenNotBlocking = 'ranged_aoe_when_not_blocking',
  ConditionalDamage120 = 'conditional_damage_120',
  TakesTrueDamage = 'takes_true_damage',
  HealAlly = 'heal_ally',
  AttackHealsAlly = 'attack_heals_ally',
  AoEHoT = 'aoe_hot',
  LongRangeAttack = 'long_range_attack',
  PassiveDPRegen = 'passive_dp_regen',
}

export interface UnitTraitConfig {
  traitId: UnitTrait
  value?: number
  duration?: number
  radius?: number
  maxTargets?: number
  damageFalloff?: number
}

export interface StatusEffect {
  type: 'slow'
  remainingDuration: number
  factor: number
}

export interface SplashConfig {
  radius: number
  damageMultiplier: number
  damageType?: DamageType
}
```

Add `traits`/`splashConfig`/`canBeHealed`/`altRangePattern` to `UnitConfig`:
```typescript
export interface UnitConfig {
  id: string
  name: string
  type: 'ground' | 'ranged'
  archetype: string
  subtypeLabel: string
  hp: number
  atk: number
  def: number
  insulation: number
  damageType: DamageType
  attackInterval: number
  rangePattern: number[][]
  altRangePattern?: number[][]
  blockCount: number
  dpCost: number
  redeployTime: number
  color: number
  traits: UnitTraitConfig[]
  splashConfig?: SplashConfig
  canBeHealed?: boolean
}
```

Add `archetype` field to `UnitConfig` for squad sorting.

- [ ] **Step 2: Add `heal()` to `src/entities/Unit.ts`**

```typescript
heal(amount: number): number {
  if (!this.config.canBeHealed ?? true) {
    this.currentHp = Math.min(this.currentHp + amount, this.config.hp)
    this.drawHp(TILE_SIZE * 0.7)
  }
  return this.currentHp
}
```

- [ ] **Step 3: Add status effect lifecycle to `src/entities/Enemy.ts`**

```typescript
export class EnemySprite extends Phaser.GameObjects.Container {
  // ...existing fields...
  statusEffects: StatusEffect[] = []

  applyStatusEffect(effect: StatusEffect): void {
    const existing = this.statusEffects.find(e => e.type === effect.type)
    if (existing) {
      existing.remainingDuration = Math.max(existing.remainingDuration, effect.remainingDuration)
      existing.factor = Math.min(existing.factor, effect.factor)
    } else {
      this.statusEffects.push({ ...effect })
    }
  }

  updateStatusEffects(delta: number): void {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      this.statusEffects[i].remainingDuration -= delta
      if (this.statusEffects[i].remainingDuration <= 0) {
        this.statusEffects.splice(i, 1)
      }
    }
  }

  getSpeedMultiplier(): number {
    let mult = 1
    for (const e of this.statusEffects) {
      if (e.type === 'slow') mult *= e.factor
    }
    return mult
  }

  // Modify move() to use getSpeedMultiplier()
  move(delta: number): boolean {
    if (this.blocked || !this.alive) return false
    this.updateStatusEffects(delta)
    // ...existing logic...
    const step = this.config.speed * this.getSpeedMultiplier() * delta
    // ...rest of move...
  }
}
```

- [ ] **Step 4: Create `src/systems/TraitSystem.ts`**

Central trait processor:
```typescript
import { UnitSprite, UnitTrait, UnitTraitConfig } from '../types/index'

export class TraitSystem {
  hasTrait(unit: UnitSprite, traitId: UnitTrait): boolean {
    return unit.config.traits?.some(t => t.traitId === traitId) ?? false
  }

  getTraitConfig(unit: UnitSprite, traitId: UnitTrait): UnitTraitConfig | undefined {
    return unit.config.traits?.find(t => t.traitId === traitId)
  }

  isAoeSplash(unit: UnitSprite): boolean {
    return this.hasTrait(unit, UnitTrait.AoESplash)
  }

  getSplashConfig(unit: UnitSprite): { radius: number; multiplier: number } | null {
    const config = this.getTraitConfig(unit, UnitTrait.AoESplash)
    if (!config) return null
    return { radius: config.radius ?? 1, multiplier: config.damageMultiplier ?? 0.5 }
  }
}
```

- [ ] **Step 5: Expand CombatSystem events + add `src/shared/utils/GridMath.ts` util**

```typescript
// In CombatSystem, expand:
interface CombatEvents {
  onEnemyKilled: (enemy: EnemySprite, killer: UnitSprite | null) => void
  onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => void
  onHealApplied: (target: UnitSprite, amount: number, source: UnitSprite) => void
}

// In GridMath.ts, add:
export function getAdjacentAllies(
  pos: Position,
  units: UnitSprite[],
  excludeUnit?: UnitSprite
): UnitSprite[] {
  return units.filter(u =>
    u.alive &&
    u !== excludeUnit &&
    Math.abs(u.row - pos.row) <= 1 &&
    Math.abs(u.col - pos.col) <= 1
  )
}
```

- [ ] **Step 6: Commit Phase 0**

```bash
git add src/types/index.ts src/entities/Unit.ts src/entities/Enemy.ts src/systems/TraitSystem.ts src/systems/CombatSystem.ts src/shared/utils/GridMath.ts
git commit -m "feat: trait system foundation — types, heal, status effects, TraitSystem"
```

---

### Phase 1 — Squad Selection Screen

**Files:**
- Create: `src/scenes/SquadScene.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/main.ts`
- Modify: `src/types/index.ts` (add SquadUnit type)

**Steps:**

- [ ] **Step 1: Add SquadUnit type to `src/types/index.ts`**

```typescript
export interface SquadUnit {
  config: UnitConfig
  slotIndex: number
}
```

- [ ] **Step 2: Create `src/scenes/SquadScene.ts`**

```typescript
export class SquadScene extends Phaser.Scene {
  private selectedSlots: (UnitConfig | null)[] = new Array(12).fill(null)
  private allUnits: UnitConfig[] = []
  private slotGraphics: Phaser.GameObjects.Graphics[] = []
  // ...
  
  // Flow:
  // 1. Load all UNIT_CONFIGS as available pool
  // 2. Render 6x2 grid of empty slots
  // 3. Click slot -> show scrollable unit panel at bottom
  // 4. Click unit -> fill slot, grey out in panel
  // 5. Click filled slot -> remove from squad
  // 6. "Auto Fill" preset -> fills 12 slots with recommended comp
  // 7. "Start Operation" -> scene.start('GameScene', { level, squad: selectedSlots.filter(Boolean) })
}
```

- [ ] **Step 3: Modify `GameScene.init()` to accept squad data**

```typescript
init(data: { level: LevelData; squad: UnitConfig[] }): void {
  this.levelData = data.level
  this.squad = data.squad ?? UNIT_CONFIGS // fallback for existing entry points
}

// Build palette from squad instead of all UNIT_CONFIGS
private buildPalette(): void {
  this.availableUnits = this.squad.filter(u => !this.deployedIds.has(u.id))
  // render from this.availableUnits
}
```

- [ ] **Step 4: Route BootScene to SquadScene, add to main.ts**

```typescript
// BootScene.ts
this.scene.start('SquadScene')

// main.ts
const config: Phaser.Types.Core.GameConfig = {
  scene: [BootScene, SquadScene, EditorScene, GameScene],
}
```

- [ ] **Step 5: Commit Phase 1**

```bash
git add src/scenes/SquadScene.ts src/scenes/GameScene.ts src/scenes/BootScene.ts src/main.ts src/types/index.ts
git commit -m "feat: squad selection screen — 12 slots, pick from pool, auto-fill"
```

---

### Phase 2 — Stats/Range Subtypes

**Files:**
- Modify: `src/config/units.ts`
- Test: `src/levels/testLevel.ts`

**Steps:**

- [ ] **Step 1: Rewrite `src/config/units.ts` with 6 subtype configs**

```typescript
export const UNIT_CONFIGS: UnitConfig[] = [
  {
    id: 'pioneer',
    name: 'Vanguard',
    archetype: 'vanguard',
    subtypeLabel: 'Pioneer',
    type: 'ground',
    hp: 1200, atk: 300, def: 230, insulation: 0,
    damageType: 'kinetic',
    attackInterval: 1.05,
    rangePattern: RANGE_PATTERNS.meleeFront,
    blockCount: 2,
    dpCost: 12,
    redeployTime: 10,
    color: 0x3498db,
    traits: [{ traitId: UnitTrait.BlocksTwo }],
  },
  {
    id: 'fighter',
    name: 'Guard',
    archetype: 'guard',
    subtypeLabel: 'Fighter',
    type: 'ground',
    hp: 1800, atk: 360, def: 220, insulation: 0,
    damageType: 'kinetic',
    attackInterval: 0.78,
    rangePattern: RANGE_PATTERNS.meleeFront,
    blockCount: 1,
    dpCost: 9,
    redeployTime: 15,
    color: 0xe74c3c,
    traits: [{ traitId: UnitTrait.FastAttack }],
  },
  {
    id: 'arts_fighter',
    name: 'Guard',
    archetype: 'guard',
    subtypeLabel: 'Arts Fighter',
    type: 'ground',
    hp: 1400, atk: 280, def: 180, insulation: 15,
    damageType: 'thermal',
    attackInterval: 1.25,
    rangePattern: RANGE_PATTERNS.meleeFront,
    blockCount: 1,
    dpCost: 12,
    redeployTime: 15,
    color: 0x9b59b6,
    traits: [{ traitId: UnitTrait.ArtsDamage }],
  },
  {
    id: 'protector',
    name: 'Defender',
    archetype: 'defender',
    subtypeLabel: 'Protector',
    type: 'ground',
    hp: 2200, atk: 280, def: 380, insulation: 0,
    damageType: 'kinetic',
    attackInterval: 1.2,
    rangePattern: RANGE_PATTERNS.selfOnly,
    blockCount: 3,
    dpCost: 19,
    redeployTime: 20,
    color: 0x2ecc71,
    traits: [{ traitId: UnitTrait.BlocksThree }],
  },
  {
    id: 'sentry_protector',
    name: 'Defender',
    archetype: 'defender',
    subtypeLabel: 'Sentry Protector',
    type: 'ground',
    hp: 2000, atk: 260, def: 350, insulation: 0,
    damageType: 'kinetic',
    attackInterval: 1.5,
    rangePattern: RANGE_PATTERNS.ranged4x3,
    blockCount: 3,
    dpCost: 20,
    redeployTime: 20,
    color: 0x27ae60,
    traits: [{ traitId: UnitTrait.BlocksThree }, { traitId: UnitTrait.LongRangeAttack }],
  },
  {
    id: 'core_caster',
    name: 'Caster',
    archetype: 'caster',
    subtypeLabel: 'Core Caster',
    type: 'ranged',
    hp: 1050, atk: 410, def: 80, insulation: 15,
    damageType: 'thermal',
    attackInterval: 1.6,
    rangePattern: RANGE_PATTERNS.ranged4x3,
    blockCount: 0,
    dpCost: 19,
    redeployTime: 20,
    color: 0x9b59b6,
    traits: [{ traitId: UnitTrait.ArtsDamage }],
  },
]
```

- [ ] **Step 2: Commit Phase 2**

```bash
git add src/config/units.ts
git commit -m "feat: 6 subtypes — Pioneer, Fighter, Arts Fighter, Core Caster, Protector, Sentry Protector"
```

---

### Phase 3 — Simple Mechanics

**Files:**
- Modify: `src/config/units.ts`
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/systems/DeploymentSystem.ts`

**Subtypes:** Swordmaster (double-hit), Deadeye (lowest DEF priority), Charger (DP on kill + full refund), Heavyshooter (point-blank range pattern), Blast Caster (linear AoE range pattern)

**Steps:** Add configs + implement each mechanic in CombatSystem/DeploymentSystem. Commit per mechanic.

---

### Phase 4 — Splash + Slow Systems

**Files:**
- Modify: `src/config/units.ts`
- Modify: `src/systems/CombatSystem.ts`

**Subtypes:** Earthshaker Guard, Artilleryman Sniper, Splash Caster, Chain Caster, Decel Binder Supporter

**Steps:** Add AoE splash damage distribution + slow status application. Commit per mechanic.

---

### Phase 5 — Dynamic Modes

**Files:**
- Modify: `src/config/units.ts`
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/systems/TraitSystem.ts`

**Subtypes:** Lord Guard, Fortress Defender, Instructor Guard

**Steps:** Dynamic range/damage mode switching based on blocking state. Commit per subtype.

---

### Phase 6 — Healing System

**Files:**
- Create: `src/systems/HealingSystem.ts`
- Modify: `src/config/units.ts`
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/scenes/GameScene.ts`

**Subtypes:** Medic ST, Incantation Medic, Bard Supporter

**Steps:** Build HealingSystem with target selection + heal application + HoT ticks. Commit per subtype.

---

### Phase 7 — Self-Heal + Flags

**Files:**
- Modify: `src/config/units.ts`
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/systems/HealingSystem.ts`

**Subtypes:** Soloblade Guard, Reaper Guard, Juggernaut Defender, Crusher Guard

**Steps:** Self-heal on attack, canBeHealed flag check in healing pipeline, true damage type. Commit per subtype.

---

### Phase 8 — Polish

**Files:**
- Modify: `src/scenes/SquadScene.ts`
- Modify: `src/scenes/GameScene.ts`

**Steps:** Preset fills, info tooltips, deploy animations, additional subtypes from the extras list.

---

## Verification Gate (After Each Phase)

```bash
npx tsc --noEmit && npm run build
```

No new errors allowed beyond established baseline. Commit after verification.
