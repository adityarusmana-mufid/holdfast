# Enemy Archetype Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand from 5 enemy families to 13 (26 configs total) with 6 new behaviors: exploder, stealth, healer, buffer, shielded, summoner.

**Architecture:** Data-driven configs. EnemySprite gets shape rendering + behavior state. CombatSystem gets shielded absorption + exploder trigger. EnemyManager gets `updateBehaviors()` loop. GameScene wires explosion callback.

**Tech Stack:** Phaser 3, TypeScript, Vitest

---

### Task 1: EnemyConfig — add `behavior` field + `EnemyBehavior` union

**Files:**
- Modify: `src/types/index.ts` (line 173 add field, line 174 add type)
- Modify: `src/systems/CombatSystem.test.ts` (update `makeEnemy`)

- [ ] **Step 1: Add `EnemyBehavior` type** in `src/types/index.ts`, after `EnemyConfig` (line 173), before `SpRecoveryType` (line 175):

```typescript
export type EnemyBehavior =
  | { type: 'standard' }
  | { type: 'exploder'; explosionDamage: number; explosionRadius: number; damageType: DamageType }
  | { type: 'stealth'; detectionRange: number }
  | { type: 'healer'; healAmount: number; healInterval: number; healRange: number }
  | { type: 'buffer'; buffAtk: number; buffRange: number }
  | { type: 'shielded'; shieldHp: number }
  | { type: 'summoner'; spawnType: string; spawnInterval: number; spawnCount: number }
```

Add `behavior: EnemyBehavior` field to `EnemyConfig`, after `description?`:

```typescript
  behavior: EnemyBehavior
```

- [ ] **Step 2: Verify typecheck errors**

Run: `npx tsc --noEmit`
Expected: Errors about existing EnemyConfig objects missing `behavior` (fixed in Task 2)

- [ ] **Step 3: Update test `makeEnemy`** in `src/systems/CombatSystem.test.ts` — add behavior to config defaults:

In `makeEnemy()`, add to the `config` object:
```typescript
      behavior: { type: 'standard' } as const,
```

And add `behavior` as a top-level field on the returned object:
```typescript
    behavior: { type: 'standard' } as const,
    bonusAtk: 0,
```

Also add `bonusAtk: 0` to the returned object (needed for buffer behavior later).

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/systems/CombatSystem.test.ts
git commit -m "feat: add EnemyBehavior union type to EnemyConfig"
```

---

### Task 2: Full enemy config roster (26 entries)

**Files:**
- Overwrite: `src/config/enemies.ts`

- [ ] **Step 1: Write complete file** — `src/config/enemies.ts`:

```typescript
import { EnemyConfig } from '../types/index'

export const ENEMY_CONFIGS: EnemyConfig[] = [
  {
    id: 'soldier', name: 'Scout Car',
    description: 'Light scout. Low DEF — focus ranged fire to clear quickly.',
    hp: 2200, atk: 280, armor: 100, res: 0, speed: 60,
    color: 0xe74c3c, dpOnKill: 1, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'soldier_elite', name: 'Scout Car Elite',
    description: 'Hardened scout vehicle.',
    hp: 3300, atk: 360, armor: 130, res: 0, speed: 60,
    color: 0x808080, dpOnKill: 2, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'trooper', name: 'APC',
    description: 'Armored transport. Moderate DEF and RES.',
    hp: 3000, atk: 350, armor: 150, res: 5, speed: 42,
    color: 0xc0392b, dpOnKill: 2, attackInterval: 2.5, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'trooper_elite', name: 'APC Elite',
    description: 'Upgraded APC with reinforced armor.',
    hp: 4500, atk: 450, armor: 200, res: 10, speed: 42,
    color: 0x707070, dpOnKill: 3, attackInterval: 2.5, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'heavy', name: 'Tank',
    description: 'Heavy assault vehicle. Very high DEF.',
    hp: 8000, atk: 600, armor: 400, res: 10, speed: 30,
    color: 0x8e44ad, dpOnKill: 3, attackInterval: 2.5, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'heavy_elite', name: 'Tank Elite',
    description: 'Colossus-class heavy armor.',
    hp: 12000, atk: 800, armor: 520, res: 15, speed: 30,
    color: 0x606060, dpOnKill: 4, attackInterval: 2.5, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'drone', name: 'Drone',
    description: 'Aerial recon — flies over ground blockers.',
    hp: 1500, atk: 200, armor: 50, res: 0, speed: 72,
    color: 0xf39c12, dpOnKill: 1, attackInterval: 1.5, damageType: 'kinetic',
    isAerial: true, attackRange: 2.5,
    behavior: { type: 'standard' },
  },
  {
    id: 'drone_elite', name: 'Drone Elite',
    description: 'Fast aerial threat.',
    hp: 2200, atk: 260, armor: 80, res: 0, speed: 72,
    color: 0x909090, dpOnKill: 2, attackInterval: 1.5, damageType: 'kinetic',
    isAerial: true, attackRange: 2.5,
    behavior: { type: 'standard' },
  },
  {
    id: 'caster', name: 'Artillery Caster',
    description: 'Indirect fire — thermal damage bypasses DEF.',
    hp: 2500, atk: 250, armor: 80, res: 0, speed: 36,
    color: 0x9b59b6, dpOnKill: 2, attackInterval: 3.5, damageType: 'thermal',
    attackRange: 2.5,
    behavior: { type: 'standard' },
  },
  {
    id: 'caster_elite', name: 'Artillery Caster Elite',
    description: 'Heavy ordnance platform.',
    hp: 3800, atk: 330, armor: 100, res: 0, speed: 36,
    color: 0x808080, dpOnKill: 3, attackInterval: 3.5, damageType: 'thermal',
    attackRange: 2.5,
    behavior: { type: 'standard' },
  },
  {
    id: 'rusher', name: 'Rusher',
    description: 'Fast recon buggy — covers ground quickly.',
    hp: 1800, atk: 220, armor: 50, res: 0, speed: 85,
    color: 0xe67e22, dpOnKill: 1, attackInterval: 1.8, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'rusher_elite', name: 'Assault Rusher Elite',
    description: 'Up-armored fast assault vehicle.',
    hp: 2800, atk: 300, armor: 80, res: 0, speed: 95,
    color: 0xa0a0a0, dpOnKill: 2, attackInterval: 1.8, damageType: 'kinetic',
    behavior: { type: 'standard' },
  },
  {
    id: 'marksman', name: 'Marksman',
    description: 'Ranged kinetic attacker — threatens backline.',
    hp: 2400, atk: 350, armor: 80, res: 0, speed: 38,
    color: 0x27ae60, dpOnKill: 2, attackInterval: 2.8, damageType: 'kinetic',
    attackRange: 2.5,
    behavior: { type: 'standard' },
  },
  {
    id: 'marksman_elite', name: 'Marksman Elite',
    description: 'Long-range precision fire.',
    hp: 3600, atk: 480, armor: 120, res: 0, speed: 42,
    color: 0x808080, dpOnKill: 3, attackInterval: 2.8, damageType: 'kinetic',
    attackRange: 3.0,
    behavior: { type: 'standard' },
  },
  {
    id: 'gunship', name: 'Gunship',
    description: 'Heavy aerial platform.',
    hp: 5000, atk: 350, armor: 150, res: 15, speed: 45,
    color: 0xf1c40f, dpOnKill: 3, attackInterval: 2.2, damageType: 'kinetic',
    isAerial: true, attackRange: 2.0,
    behavior: { type: 'standard' },
  },
  {
    id: 'gunship_elite', name: 'Gunship Elite',
    description: 'Command gunship — boosts nearby ally ATK.',
    hp: 7000, atk: 450, armor: 200, res: 20, speed: 50,
    color: 0x808080, dpOnKill: 4, attackInterval: 2.2, damageType: 'kinetic',
    isAerial: true, attackRange: 2.0,
    behavior: { type: 'buffer', buffAtk: 20, buffRange: 2.0 },
  },
  {
    id: 'breacher', name: 'Breacher',
    description: 'Suicide RC car — explodes on death.',
    hp: 2500, atk: 150, armor: 30, res: 0, speed: 52,
    color: 0xd35400, dpOnKill: 2, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'exploder', explosionDamage: 400, explosionRadius: 1.5, damageType: 'thermal' },
  },
  {
    id: 'breacher_elite', name: 'Breacher Elite',
    description: 'Heavy demolition unit. Larger blast.',
    hp: 4000, atk: 200, armor: 50, res: 0, speed: 55,
    color: 0x909090, dpOnKill: 3, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'exploder', explosionDamage: 600, explosionRadius: 2.0, damageType: 'thermal' },
  },
  {
    id: 'phantom', name: 'Phantom',
    description: 'Stealth drone — invisible until detected.',
    hp: 3800, atk: 450, armor: 50, res: 15, speed: 48,
    color: 0x2c3e50, dpOnKill: 2, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'stealth', detectionRange: 2.0 },
  },
  {
    id: 'phantom_elite', name: 'Phantom Elite',
    description: 'Advanced stealth unit. Harder to detect.',
    hp: 5500, atk: 600, armor: 80, res: 25, speed: 52,
    color: 0x505050, dpOnKill: 3, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'stealth', detectionRange: 1.5 },
  },
  {
    id: 'repair', name: 'Repair Vehicle',
    description: 'Field repair — heals nearby damaged allies.',
    hp: 3500, atk: 200, armor: 100, res: 0, speed: 34,
    color: 0x1abc9c, dpOnKill: 2, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'healer', healAmount: 200, healInterval: 3.5, healRange: 1.5 },
  },
  {
    id: 'repair_elite', name: 'Repair Elite',
    description: 'Advanced repair platform.',
    hp: 5000, atk: 250, armor: 150, res: 0, speed: 38,
    color: 0x808080, dpOnKill: 3, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'healer', healAmount: 350, healInterval: 3.0, healRange: 2.0 },
  },
  {
    id: 'shielded', name: 'Shielded Transport',
    description: 'Protected transport — shield absorbs damage before HP.',
    hp: 5000, atk: 300, armor: 100, res: 0, speed: 36,
    color: 0x2980b9, dpOnKill: 2, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'shielded', shieldHp: 2500 },
  },
  {
    id: 'shielded_elite', name: 'Shielded Elite',
    description: 'Heavy shielded assault.',
    hp: 7000, atk: 400, armor: 150, res: 0, speed: 38,
    color: 0x666666, dpOnKill: 3, attackInterval: 2.0, damageType: 'kinetic',
    behavior: { type: 'shielded', shieldHp: 4000 },
  },
  {
    id: 'carrier', name: 'Carrier Drone',
    description: 'Aerial carrier — spawns Rushers periodically.',
    hp: 3500, atk: 150, armor: 100, res: 10, speed: 28,
    color: 0xe91e63, dpOnKill: 3, attackInterval: 2.5, damageType: 'kinetic',
    isAerial: true,
    behavior: { type: 'summoner', spawnType: 'rusher', spawnInterval: 10, spawnCount: 1 },
  },
  {
    id: 'carrier_elite', name: 'Carrier Elite',
    description: 'Advanced carrier — spawns more enemies faster.',
    hp: 5000, atk: 200, armor: 150, res: 15, speed: 30,
    color: 0x808080, dpOnKill: 4, attackInterval: 2.5, damageType: 'kinetic',
    isAerial: true,
    behavior: { type: 'summoner', spawnType: 'rusher', spawnInterval: 7, spawnCount: 2 },
  },
]
```

- [ ] **Step 2: Run typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Both pass

- [ ] **Step 3: Commit**

```bash
git add src/config/enemies.ts
git commit -m "feat: expand enemy roster to 13 families (26 configs)"
```

---

### Task 3: EnemySprite — shape rendering, shield, stealth, buffer state

**Files:**
- Modify: `src/entities/Enemy.ts`

- [ ] **Step 1: Update imports** — add `EnemyBehavior`:

```typescript
import { EnemyConfig, EnemyBehavior, Position, StatusEffect, FlowDirection } from '../types/index'
```

- [ ] **Step 2: Add class fields** after `grid` field (line 38):

```typescript
  behavior: EnemyBehavior
  currentShieldHp: number = 0
  isDetected: boolean = false
  bonusAtk: number = 0
```

Add shield graphic field near other graphic fields (line 19):
```typescript
  private shieldGraphic: Phaser.GameObjects.Graphics
```

- [ ] **Step 3: Store behavior + init shield + create shieldGraphic in constructor**

After `this.config = config` (line 45), add:
```typescript
    this.behavior = config.behavior
    if (config.behavior.type === 'shielded') {
      this.currentShieldHp = config.behavior.shieldHp
    }
```

Before `this.body = scene.add.graphics()` (line 74), add:
```typescript
    this.shieldGraphic = scene.add.graphics()
```

- [ ] **Step 4: Replace circle rendering with shape dispatch**

Replace lines 74-78:
```typescript
    this.body = scene.add.graphics()
    this.body.fillStyle(config.color, 1)
    this.body.fillCircle(0, 0, half)
    this.body.lineStyle(2, 0xd32f2f, 0.4)
    this.body.strokeCircle(0, 0, half)
```

With:
```typescript
    this.body = scene.add.graphics()
    this.body.fillStyle(config.color, 1)
    this.body.lineStyle(2, 0xd32f2f, 0.4)

    const shape = this.getShapeId()
    switch (shape) {
      case 'triangle':
        this.body.fillTriangle(-half, half, half, half, 0, -half)
        this.body.strokeTriangle(-half, half, half, half, 0, -half)
        break
      case 'diamond':
        this.body.fillPoints([
          new Phaser.Geom.Point(0, -half),
          new Phaser.Geom.Point(half, 0),
          new Phaser.Geom.Point(0, half),
          new Phaser.Geom.Point(-half, 0),
        ], true)
        break
      case 'hexagon':
        this.drawHexagon(this.body, 0, 0, half)
        break
      case 'square':
        this.body.fillRect(-half * 0.7, -half * 0.7, size * 0.7, size * 0.7)
        this.body.strokeRect(-half * 0.7, -half * 0.7, size * 0.7, size * 0.7)
        break
      default:
        this.body.fillCircle(0, 0, half)
        this.body.strokeCircle(0, 0, half)
    }
```

- [ ] **Step 5: Update direction indicator** — dot for non-circles

Replace lines 81-82:
```typescript
    this.dirIndicator = scene.add.graphics()
    this.dirIndicator.fillStyle(0xffffff, 0.7)
    this.dirIndicator.fillTriangle(half * 0.5, 0, -half * 0.3, -half * 0.4, -half * 0.3, half * 0.4)
```

With:
```typescript
    this.dirIndicator = scene.add.graphics()
    this.dirIndicator.fillStyle(0xffffff, 0.7)
    if (shape === 'circle') {
      this.dirIndicator.fillTriangle(half * 0.5, 0, -half * 0.3, -half * 0.4, -half * 0.3, half * 0.4)
    } else {
      this.dirIndicator.fillCircle(0, -half * 0.8, 3)
    }
```

- [ ] **Step 6: Add shape + hexagon helpers** after constructor (after `drawHp` method):

```typescript
  private getShapeId(): 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'square' {
    switch (this.config.id) {
      case 'rusher': case 'rusher_elite': return 'triangle'
      case 'marksman': case 'marksman_elite': return 'diamond'
      case 'breacher': case 'breacher_elite': return 'hexagon'
      case 'repair': case 'repair_elite': return 'square'
      default: return 'circle'
    }
  }

  private drawHexagon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    const pts: Phaser.Geom.Point[] = []
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6
      pts.push(new Phaser.Geom.Point(cx + r * Math.cos(a), cy + r * Math.sin(a)))
    }
    g.fillPoints(pts, true)
    g.strokePoints(pts, true)
  }
```

- [ ] **Step 7: Add shield + detection methods** after `drawHp`:

```typescript
  private drawShield(): void {
    this.shieldGraphic.clear()
    if (this.behavior.type !== 'shielded' || this.currentShieldHp <= 0) return
    const ratio = this.currentShieldHp / this.behavior.shieldHp
    const size = TILE_SIZE * 0.6
    const half = size / 2
    this.shieldGraphic.lineStyle(3, Phaser.Display.Color.GetColor(
      Math.floor(150 * (1 - ratio)),
      Math.floor(150 * ratio),
      255
    ), 0.8)
    this.shieldGraphic.strokeCircle(0, 0, half + 4)
  }

  updateDetection(units: { row: number; col: number }[]): void {
    if (this.behavior.type !== 'stealth' || !this.alive) return
    const tile = this.getCurrentTile()
    if (!tile) return
    let detected = false
    for (const u of units) {
      const dist = Math.abs(u.row - tile.row) + Math.abs(u.col - tile.col)
      if (dist <= this.behavior.detectionRange) {
        detected = true
        break
      }
    }
    this.isDetected = detected
    this.container.setAlpha(detected ? 1 : 0.2)
  }
```

- [ ] **Step 8: Add shieldGraphic to container** — append to the container array at line 96:

```typescript
    this.container = scene.add.container(this.x, this.y, [glow, this.shieldGraphic, this.body, this.dirIndicator, this.hpBg, this.hpBar])
```

Call `this.drawShield()` after `this.container.setDepth(...)` (after line 97).

- [ ] **Step 9: Update `takeDamage`** for shield absorption + stealth detection trigger

Replace the existing `takeDamage` (lines 119-135):
```typescript
  takeDamage(amount: number): number {
    let remaining = amount
    if (this.behavior.type === 'shielded' && this.currentShieldHp > 0) {
      if (remaining <= this.currentShieldHp) {
        this.currentShieldHp -= remaining
        remaining = 0
      } else {
        remaining -= this.currentShieldHp
        this.currentShieldHp = 0
      }
      this.drawShield()
    }
    this.currentHp = Math.max(0, this.currentHp - remaining)
    this.drawHp(TILE_SIZE * 0.6)
    if (this.container.scene) {
      this.container.scene.tweens.add({
        targets: this.container,
        alpha: 0.4,
        duration: 40,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
    }
    if (this.behavior.type === 'stealth') {
      this.isDetected = true
    }
    if (this.currentHp <= 0) {
      this.alive = false
    }
    return this.currentHp
  }
```

- [ ] **Step 10: Update the `destroy` method particle tint** — use `config.color` (already works since `this.config.color` is set, no change needed)

- [ ] **Step 11: Run typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 12: Commit**

```bash
git add src/entities/Enemy.ts
git commit -m "feat: add shape rendering, shield, and stealth to EnemySprite"
```

---

### Task 4: CombatSystem — shielded damage + exploder trigger

**Files:**
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/systems/CombatSystem.test.ts`

- [ ] **Step 1: Add `onExplosion` to `CombatEvents`** (line 18, after `onChainJump`):

```typescript
  onExplosion?: (position: { row: number; col: number }, damage: number, radius: number, damageType: DamageType) => void
```

- [ ] **Step 2: Add `checkExploderKill` private method** after `calcDamage`:

```typescript
  private checkExploderKill(enemy: EnemySprite): void {
    if (!enemy.alive && enemy.behavior.type === 'exploder') {
      const tile = enemy.getCurrentTile()
      if (tile && this.events.onExplosion) {
        this.events.onExplosion(tile, enemy.behavior.explosionDamage, enemy.behavior.explosionRadius, enemy.behavior.damageType)
      }
    }
  }
```

- [ ] **Step 3: Call `checkExploderKill` before each `onEnemyKilled` emit**

Three locations:
- `applyDamage` method, before `this.events.onEnemyKilled(target, unit)` (line 444):
  ```typescript
      this.checkExploderKill(target)
  ```
- `executeSplashDamage`, before `this.events.onEnemyKilled(target, unit)` (line 299):
  ```typescript
        this.checkExploderKill(target)
  ```
- `executeChainAttack`, before `this.events.onEnemyKilled(next, unit)` (line 342):
  ```typescript
        this.checkExploderKill(next)
  ```

- [ ] **Step 4: Add enemy `bonusAtk` to enemy attack damage calc**

In the enemy attack section of `update()` (line 147), replace:
```typescript
      const damage = this.calcDamage(enemy.config.atk, def, target.config.res, enemy.config.damageType)
```
With:
```typescript
      const effectiveAtk = enemy.config.atk + (enemy.bonusAtk ?? 0)
      const damage = this.calcDamage(effectiveAtk, def, target.config.res, enemy.config.damageType)
```

- [ ] **Step 5: Update test `noopEvents`** — add `onExplosion`:

```typescript
const noopEvents = {
  onEnemyKilled: () => {},
  onDamageDealt: () => {},
  onHealApplied: () => {},
  onUnitDamageDealt: () => {},
  onUnitDeath: () => {},
  onEnemyAttackInitiated: () => {},
  onEnemyWindUp: () => {},
  onEnemyAttackLanded: () => {},
  onChainJump: () => {},
  onExplosion: () => {},
}
```

- [ ] **Step 6: Run typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add src/systems/CombatSystem.ts src/systems/CombatSystem.test.ts
git commit -m "feat: add shielded damage, exploder trigger, and buffer ATK in CombatSystem"
```

---

### Task 5: GameScene — wire explosion callback

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add `onExplosion` handler** in CombatSystem constructor options

Find the `onEnemyKilled` callback (line 161). After its closing `}` (line 177), add:

```typescript
      onExplosion: (pos, damage, radius, damageType) => {
        const units = this.unitSprites?.filter(u => {
          if (!u.isAlive()) return false
          const dist = Math.abs(u.row - pos.row) + Math.abs(u.col - pos.col)
          return dist <= radius
        }) ?? []
        for (const u of units) {
          const dealt = u.takeDamage(damage)
          if (dealt > 0) {
            this.showUnitDamageNumber(dealt, u, damageType)
          }
        }
      },
```

Make sure `onExplosion` is placed before the closing `})` of the `CombatSystem` constructor options.

- [ ] **Step 2: Run typecheck + build**

Run: `npx tsc --noEmit && npx vite build 2>&1 | tail -10`
Expected: Both pass

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: wire explosion callback in GameScene"
```

---

### Task 6: EnemyManager — behavior update loop (healer, buffer, summoner, stealth)

**Files:**
- Modify: `src/systems/EnemyManager.ts`

- [ ] **Step 1: Add import for EnemyBehavior type** — update existing import:

```typescript
import { EnemyConfig, Wave, Route, Position, TileType } from '../types/index'
```

- [ ] **Step 2: Add timer field declarations** after `preludeTimer` (line 37):

```typescript
  private healerTimers: Map<number, number> = new Map()
  private summonerTimers: Map<number, number> = new Map()
```

- [ ] **Step 3: Add `updateBehaviors` call** in the `update` loop

In the `update(delta)` method (line 99), add after `this.updateObjectiveCheck()` (line 117):

```typescript
    this.updateBehaviors(delta)
```

- [ ] **Step 4: Add behavior processing methods** after `removeDead` method:

```typescript
  updateBehaviors(delta: number): void {
    const units = this.depSystem.getAllUnits().map(u => ({ row: u.row, col: u.col }))
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      enemy.updateDetection(units)

      if (enemy.behavior.type === 'healer') {
        const timer = this.healerTimers.get(enemy.id) ?? 0
        const newTimer = timer + delta
        if (newTimer >= enemy.behavior.healInterval) {
          this.healerTimers.set(enemy.id, newTimer - enemy.behavior.healInterval)
          this.handleHealerTick(enemy)
        } else {
          this.healerTimers.set(enemy.id, newTimer)
        }
      }

      if (enemy.behavior.type === 'buffer') {
        this.handleBufferTick(enemy)
      }

      if (enemy.behavior.type === 'summoner') {
        const timer = this.summonerTimers.get(enemy.id) ?? 0
        const newTimer = timer + delta
        if (newTimer >= enemy.behavior.spawnInterval) {
          this.summonerTimers.set(enemy.id, newTimer - enemy.behavior.spawnInterval)
          this.handleSummonerTick(enemy)
        } else {
          this.summonerTimers.set(enemy.id, newTimer)
        }
      }
    }
  }

  private handleHealerTick(enemy: EnemySprite): void {
    if (enemy.behavior.type !== 'healer') return
    const tile = enemy.getCurrentTile()
    if (!tile) return
    let best: EnemySprite | null = null
    let lowestPct = 1
    for (const e of this.enemies) {
      if (!e.alive || e === enemy) continue
      const et = e.getCurrentTile()
      if (!et) continue
      const dist = Math.abs(et.row - tile.row) + Math.abs(et.col - tile.col)
      if (dist <= enemy.behavior.healRange) {
        const pct = e.currentHp / e.config.hp
        if (pct < lowestPct) {
          lowestPct = pct
          best = e
        }
      }
    }
    if (best) {
      best.currentHp = Math.min(best.currentHp + enemy.behavior.healAmount, best.config.hp)
    }
  }

  private handleBufferTick(enemy: EnemySprite): void {
    if (enemy.behavior.type !== 'buffer') return
    const tile = enemy.getCurrentTile()
    if (!tile) return
    for (const e of this.enemies) {
      if (!e.alive || e === enemy) continue
      const et = e.getCurrentTile()
      if (!et) continue
      const dist = Math.abs(et.row - tile.row) + Math.abs(et.col - tile.col)
      if (dist <= enemy.behavior.buffRange) {
        e.bonusAtk = enemy.behavior.buffAtk
      }
    }
  }

  private handleSummonerTick(enemy: EnemySprite): void {
    if (enemy.behavior.type !== 'summoner') return
    const route = this.currentRoute
    if (!route) return
    const spawnConfig = ENEMY_CONFIGS.find(c => c.id === enemy.behavior.spawnType)
    if (!spawnConfig) return
    for (let i = 0; i < enemy.behavior.spawnCount; i++) {
      const path: Position[] = [route.spawn, ...route.waypoints, route.goal]
      if (path.length < 2) continue
      const minion = new EnemySprite(this.scene, this.grid, spawnConfig, path)
      this.enemies.push(minion)
    }
  }
```

- [ ] **Step 5: Reset timers on `cleanup`** — add in `cleanup()` (after line 349):

```typescript
    this.healerTimers.clear()
    this.summonerTimers.clear()
```

- [ ] **Step 6: Reset timers on `setWaves`** — add in `setWaves()` (after line 55):

```typescript
    this.healerTimers.clear()
    this.summonerTimers.clear()
```

- [ ] **Step 7: Run typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add src/systems/EnemyManager.ts
git commit -m "feat: add behavior update loop for healer, buffer, summoner, stealth"
```

---

### Task 7: EnemyManager tests — behavior processing

**Files:**
- Create: `src/systems/EnemyManager.test.ts`

- [ ] **Step 1: Write test file** — `src/systems/EnemyManager.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { EnemySprite } from '../entities/Enemy'
import { EnemyConfig, EnemyBehavior, TileType } from '../types/index'

function makeEnemyConfig(overrides: Partial<EnemyConfig> & { behavior: EnemyBehavior }): EnemyConfig {
  return {
    id: 'test', name: 'Test', hp: 1000, atk: 100, armor: 50, res: 0,
    speed: 60, color: 0xff0000, dpOnKill: 1, attackInterval: 2,
    damageType: 'kinetic' as const,
    ...overrides,
  }
}

function makeEnemySprite(config: EnemyConfig): EnemySprite {
  const mockScene = {
    add: {
      graphics: () => ({
        fillStyle: () => {},
        fillCircle: () => {},
        fillTriangle: () => {},
        fillPoints: () => {},
        strokeTriangle: () => {},
        strokeCircle: () => {},
        strokePoints: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        clear: () => {},
        lineStyle: () => {},
        setDepth: () => {},
        destroy: () => {},
      }),
      container: (x: number, y: number, children: any[]) => ({
        x, y, setDepth: () => {}, setAlpha: () => {}, alpha: 1,
        setPosition: () => {}, destroy: () => {}, scene: null,
      }),
      particles: (x: number, y: number, tex: string, cfg: any) => ({
        explode: () => {}, destroy: () => {},
      }),
    },
    textures: { exists: () => false },
    time: { delayedCall: () => {} },
    tweens: { add: () => {} },
    make: { graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, generateTexture: () => {}, destroy: () => {} }) },
  } as any

  const mockGrid = {
    rows: 5, cols: 5,
    tileToPixel: (_r: number, _c: number) => ({ x: _c * 64 + 32, y: _r * 64 + 32 }),
    pixelToTile: (_x: number, _y: number) => ({ row: Math.floor(_y / 64), col: Math.floor(_x / 64) }),
    getTile: () => ({ type: TileType.Ground, row: 0, col: 0 }),
    getFlowDirection: () => null,
    setPathSystem: () => {},
    tiles: [],
  } as any

  const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }]
  return new EnemySprite(mockScene, mockGrid, config, path)
}

describe('EnemySprite behavior', () => {
  it('has standard behavior by default from config', () => {
    const config = makeEnemyConfig({ id: 'soldier', behavior: { type: 'standard' } })
    const enemy = makeEnemySprite(config)
    expect(enemy.behavior.type).toBe('standard')
  })

  it('initializes shieldHp for shielded enemy', () => {
    const config = makeEnemyConfig({ id: 'shielded_test', behavior: { type: 'shielded', shieldHp: 2500 } })
    const enemy = makeEnemySprite(config)
    expect(enemy.currentShieldHp).toBe(2500)
  })

  it('shield absorbs damage before HP', () => {
    const config = makeEnemyConfig({ id: 'shielded_test', hp: 5000, behavior: { type: 'shielded', shieldHp: 1000 } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(600)
    expect(enemy.currentShieldHp).toBe(400)
    expect(enemy.currentHp).toBe(5000)
  })

  it('shield overkill rolls over to HP', () => {
    const config = makeEnemyConfig({ id: 'shielded_test', hp: 5000, behavior: { type: 'shielded', shieldHp: 1000 } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(1500)
    expect(enemy.currentShieldHp).toBe(0)
    expect(enemy.currentHp).toBe(4500)
  })

  it('stealth alpha is reduced by default', () => {
    // Can't easily test alpha without Phaser scene, verify behavior type is set
    const config = makeEnemyConfig({ id: 'phantom_test', behavior: { type: 'stealth', detectionRange: 2.0 } })
    const enemy = makeEnemySprite(config)
    expect(enemy.behavior.type).toBe('stealth')
    expect(enemy.isDetected).toBe(false)
  })

  it('takeDamage sets isDetected on stealth enemy', () => {
    const config = makeEnemyConfig({ id: 'phantom_test', behavior: { type: 'stealth', detectionRange: 2.0 } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(1)
    expect(enemy.isDetected).toBe(true)
  })

  it('sets alive=false when HP reaches 0', () => {
    const config = makeEnemyConfig({ id: 'test', hp: 100, behavior: { type: 'standard' } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(200)
    expect(enemy.alive).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/systems/EnemyManager.test.ts`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/systems/EnemyManager.test.ts
git commit -m "test: add EnemySprite behavior tests"
```

---

### Task 8: Level validation — no changes needed (auto-validates via ENEMY_CONFIGS)

**No code changes.** `LevelValidation.ts` already uses `ENEMY_CONFIGS.find(e => e.id === entry.enemyType)` to validate wave entries. Adding new configs to `enemies.ts` automatically makes them valid.

- [ ] **Step 1: Verify existing level files still validate**

Run: `npx vitest run` — all tests pass (including any level validation tests)

- [ ] **Step 2: Commit (if any levels updated)**

```bash
git add -A && git commit -m "chore: update level validation for expanded enemy roster"
```

Only if level JSONs need updating to reference new enemy types.

---

### Task 9: Verify — full build + test suite

- [ ] **Step 1: Run full verification gate**

Run: `npx tsc --noEmit && npx vitest run && npx vite build`
Expected: All three pass with zero errors

- [ ] **Step 2: Commit any remaining changes**

```bash
git add -A && git commit -m "chore: post-expansion cleanup"
```
