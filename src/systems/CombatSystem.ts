import { Grid } from '../entities/Grid'
import { EnemySprite } from '../entities/Enemy'
import { UnitSprite } from '../entities/Unit'
import { Position, UnitTrait, TileType, DamageType, DeployedUnit } from '../types/index'
import { positionsInRange } from '../shared/utils/GridMath'

export interface CombatEvents {
  onEnemyKilled: (enemy: EnemySprite, killer: UnitSprite | null) => void
  onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => void
  onHealApplied?: (target: UnitSprite, amount: number, source: UnitSprite) => void
  onUnitDamageDealt?: (damage: number, unit: UnitSprite, damageType: string) => void
  onUnitDeath?: (unit: UnitSprite, killer: EnemySprite) => void
  onUnitAttackInitiated?: (unit: UnitSprite, target: EnemySprite, damageType: string) => void
  onEnemyWindUp?: (enemy: EnemySprite, target: UnitSprite, attackId: number) => void
  onEnemyAttackLanded?: (enemy: EnemySprite, target: UnitSprite, damage: number) => void
  onEnemyAttackCancelled?: (attackId: number) => void
  onChainJump?: (unit: UnitSprite, from: EnemySprite, to: EnemySprite) => void
  onSplashAoE?: (unit: UnitSprite, center: EnemySprite, radius: number) => void
  onExplosion?: (position: { row: number; col: number }, damage: number, radius: number, damageType: DamageType) => void
  effectiveUnitAttack?: (unit: UnitSprite) => { atk: number; damageType: DamageType; hitCount: number } | null
  effectiveUnitDef?: (unit: UnitSprite) => number | null
}

interface PendingAttack {
  attackId: number
  enemy: EnemySprite
  target: UnitSprite
  damage: number
  elapsed: number
  duration: number
}

interface AttackParams {
  rangePattern: number[][]
  atk: number
  useAoE: boolean
}

const ENEMY_WIND_UP_DURATION = 0.4

export class CombatSystem {
  private grid: Grid
  private events: CombatEvents
  private enemyAttackTimers: Map<number, number> = new Map()
  private pendingAttacks: PendingAttack[] = []
  private nextAttackId = 0
  private enemiesInWindUp: Set<number> = new Set()
  private droneRampState: Map<UnitSprite, { lastEnemyId: string | null; ramp: number }> = new Map()

  constructor(grid: Grid, events: CombatEvents) {
    this.grid = grid
    this.events = events
  }

  update(delta: number, units: UnitSprite[], enemies: EnemySprite[]): void {
    const dt = delta / 1000

    for (const unit of units) {
      if (!unit.isAlive()) continue

      unit.lastAttackTime += dt

      if (unit.lastAttackTime < unit.config.attackInterval) continue
      unit.lastAttackTime = 0

      const params = this.getAttackParams(unit, enemies)

      if (params.useAoE) {
        this.executeAoEAttack(unit, enemies, params)
      } else if (this.hasTrait(unit, UnitTrait.LinearAoE)) {
        this.executeLinearAoEAttack(unit, enemies)
      } else if (this.hasTrait(unit, UnitTrait.AoEMelee)) {
        const hitCount = this.executeAoEMeleeAttack(unit, enemies, params)
        if (this.hasTrait(unit, UnitTrait.HealOnAttack)) {
          const traitConfig = unit.config.traits.find(t => t.traitId === UnitTrait.HealOnAttack)
          const healAmount = (traitConfig?.value ?? 50)
          const cappedHits = Math.min(hitCount, unit.config.blockCount)
          const totalHeal = healAmount * Math.max(1, cappedHits)
          const healed = unit.heal(totalHeal)
          if (healed > 0 && this.events.onHealApplied) {
            this.events.onHealApplied(unit, healed, unit)
          }
        }
      } else if (this.hasTrait(unit, UnitTrait.AoEMeleeBlockCapped)) {
        this.executeBlockCappedAttack(unit, enemies, params)
      } else {
        const target = this.findTarget(unit, enemies, params.rangePattern)
        if (!target || !target.alive) continue

        let hitCount = this.hasTrait(unit, UnitTrait.DoubleHit) ? 2 : 1
        if (this.events.effectiveUnitAttack) {
          const eff = this.events.effectiveUnitAttack(unit)
          if (eff) hitCount = eff.hitCount
        }
        for (let i = 0; i < hitCount; i++) {
          if (!target.alive) break
          this.events.onUnitAttackInitiated?.(unit, target, unit.config.damageType)
          this.applyDamage(unit, target, params.atk)
        }

        if (this.hasTrait(unit, UnitTrait.AttackHealsAlly)) {
          this.healAllyOnAttack(unit, units)
        }

        if (this.hasTrait(unit, UnitTrait.HealOnAttack)) {
          const traitConfig = unit.config.traits.find(t => t.traitId === UnitTrait.HealOnAttack)
          const healAmount = traitConfig?.value ?? 50
          const healed = unit.heal(healAmount)
          if (healed > 0 && this.events.onHealApplied) {
            this.events.onHealApplied(unit, healed, unit)
          }
        }

        if (this.hasTrait(unit, UnitTrait.AoESplash) && unit.config.splashConfig) {
          this.executeSplashDamage(unit, target, enemies, params.atk)
        }

        if (this.hasTrait(unit, UnitTrait.ChainJump)) {
          this.executeChainAttack(unit, target, enemies, params.atk)
        }
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue
      if (this.enemiesInWindUp.has(enemy.id)) continue

      const acc = this.enemyAttackTimers.get(enemy.id) ?? 0
      const newAcc = acc + dt
      if (newAcc < enemy.config.attackInterval) {
        this.enemyAttackTimers.set(enemy.id, newAcc)
        continue
      }
      this.enemyAttackTimers.set(enemy.id, newAcc - enemy.config.attackInterval)

      let target: UnitSprite | null = null
      if (enemy.config.attackRange && enemy.config.attackRange > 0) {
        target = this.findNearestUnit(enemy, units, enemy.config.attackRange)
      } else if (enemy.blocked && enemy.blockerUnitKey) {
        const [r, c] = enemy.blockerUnitKey.split(',').map(Number)
        target = units.find(u => u.row === r && u.col === c && u.isAlive()) ?? null
      }

      if (!target) continue

      const def = this.getUnitEffectiveDef(target)
      const effectiveAtk = enemy.config.atk + (enemy.bonusAtk ?? 0)
      const damage = this.calcDamage(effectiveAtk, def, target.config.res, enemy.config.damageType)
      const attackId = this.nextAttackId++
      this.enemiesInWindUp.add(enemy.id)
      this.pendingAttacks.push({ attackId, enemy, target, damage, elapsed: 0, duration: ENEMY_WIND_UP_DURATION })
      this.events.onEnemyWindUp?.(enemy, target, attackId)
    }

    this.processPendingAttacks(dt)
  }

  private getUnitEffectiveDef(unit: UnitSprite): number {
    let def = unit.config.def
    const tile = this.grid.getTile(unit.row, unit.col)
    if (tile && tile.type === TileType.ArmorGrid) {
      def += 100
    }
    if (this.events.effectiveUnitDef) {
      const eff = this.events.effectiveUnitDef(unit)
      if (eff !== null) def = eff
    }
    return def
  }

  private findNearestUnit(enemy: EnemySprite, units: UnitSprite[], range: number): UnitSprite | null {
    let best: UnitSprite | null = null
    let bestDist = Infinity
    const eTile = enemy.getCurrentTile()
    if (!eTile) return null
    for (const u of units) {
      if (!u.isAlive()) continue
      const dist = Math.abs(u.row - eTile.row) + Math.abs(u.col - eTile.col)
      if (dist <= range && dist < bestDist) {
        bestDist = dist
        best = u
      }
    }
    return best
  }

  private isBlocking(unit: UnitSprite, enemies: EnemySprite[]): boolean {
    const key = `${unit.row},${unit.col}`
    return enemies.some(e => {
      if (!e.alive || !e.blocked) return false
      const tile = e.getCurrentTile()
      return tile !== null && `${tile.row},${tile.col}` === key
    })
  }

  private getSkillRangePattern(unit: UnitSprite): number[][] | null {
    const du = unit.deployedUnit
    if (!du?.skillState?.isActive) return null
    const skillConfig = du.skillState.config
    return skillConfig.skillRangePattern ?? null
  }

  private getAttackParams(unit: UnitSprite, enemies: EnemySprite[]): AttackParams {
    const isBlocking = this.isBlocking(unit, enemies)
    const hasRangedMode = this.hasTrait(unit, UnitTrait.RangedWhenNotBlocking) ||
      this.hasTrait(unit, UnitTrait.RangedAoEWhenNotBlocking) ||
      this.hasTrait(unit, UnitTrait.SpreadAttack)

    let atk = unit.config.atk

    if (this.events.effectiveUnitAttack) {
      const eff = this.events.effectiveUnitAttack(unit)
      if (eff) {
        atk = eff.atk
      }
    }

    const skillRange = this.getSkillRangePattern(unit)

    if (!hasRangedMode || isBlocking) {
      return { rangePattern: skillRange ?? unit.config.rangePattern, atk, useAoE: false }
    }

    if (this.hasTrait(unit, UnitTrait.RangedAttack80)) {
      atk = Math.floor(atk * 0.8)
    }

    if (this.hasTrait(unit, UnitTrait.RangedAttack120)) {
      atk = Math.floor(atk * 1.2)
    }

    const rangePattern = skillRange ?? unit.config.altRangePattern ?? unit.config.rangePattern
    const useAoE = this.hasTrait(unit, UnitTrait.RangedAoEWhenNotBlocking) || this.hasTrait(unit, UnitTrait.SpreadAttack)

    return { rangePattern, atk, useAoE }
  }

  private executeAoEAttack(unit: UnitSprite, enemies: EnemySprite[], params: AttackParams): void {
    const targets = this.getEnemiesInRange(unit, enemies, params.rangePattern)
    for (const target of targets) {
      if (!target.alive) continue
      this.events.onUnitAttackInitiated?.(unit, target, unit.config.damageType)
      this.applyDamage(unit, target, params.atk)
    }
  }

  private executeLinearAoEAttack(unit: UnitSprite, enemies: EnemySprite[]): void {
    const targets = this.getEnemiesInRange(unit, enemies)
    for (const target of targets) {
      if (!target.alive) continue
      this.events.onUnitAttackInitiated?.(unit, target, unit.config.damageType)
      this.applyDamage(unit, target)
    }
  }

  private executeAoEMeleeAttack(unit: UnitSprite, enemies: EnemySprite[], params: AttackParams): number {
    const targets = this.getEnemiesInRange(unit, enemies, params.rangePattern)
    let hitCount = 0
    for (const target of targets) {
      if (!target.alive) continue
      this.events.onUnitAttackInitiated?.(unit, target, unit.config.damageType)
      this.applyDamage(unit, target, params.atk)
      hitCount++
    }
    return hitCount
  }

  private executeBlockCappedAttack(unit: UnitSprite, enemies: EnemySprite[], params: AttackParams): void {
    const targets = this.getEnemiesInRange(unit, enemies, params.rangePattern)
    const maxTargets = unit.config.blockCount
    let count = 0
    for (const target of targets) {
      if (!target.alive || count >= maxTargets) continue
      this.events.onUnitAttackInitiated?.(unit, target, unit.config.damageType)
      this.applyDamage(unit, target, params.atk)
      count++
    }
  }

  private executeSplashDamage(unit: UnitSprite, primary: EnemySprite, enemies: EnemySprite[], atkOverride?: number): void {
    const splashConfig = unit.config.splashConfig!
    const tile = primary.getCurrentTile()
    if (!tile) return

    const splashTargets = this.getEnemiesInRadius(tile, splashConfig.radius, enemies, primary)

    if (splashTargets.length > 0 && this.events.onSplashAoE) {
      this.events.onSplashAoE(unit, primary, splashConfig.radius)
    }

    for (const target of splashTargets) {
      if (!target.alive) continue
      const baseDamage = this.calculateDamage(unit, target, atkOverride)
      const splashDmg = Math.max(1, Math.floor(baseDamage * splashConfig.damageMultiplier))
      target.takeDamage(splashDmg)
      if (splashDmg > 0) {
        this.events.onDamageDealt(splashDmg, target, splashConfig.damageType ?? unit.config.damageType)
      }
      if (!target.alive) {
        this.checkExploderKill(target)
        this.events.onEnemyKilled(target, unit)
      }
      this.applySlow(unit, target)
    }
  }

  private executeChainAttack(unit: UnitSprite, primary: EnemySprite, enemies: EnemySprite[], atkOverride?: number): void {
    const traitConfig = unit.config.traits.find(t => t.traitId === UnitTrait.ChainJump)
    if (!traitConfig) return

    const maxTargets = traitConfig.maxTargets ?? 2
    const radius = traitConfig.radius ?? 2
    const falloff = traitConfig.damageFalloff ?? 0.5
    const primaryTile = primary.getCurrentTile()
    if (!primaryTile) return

    const hitEnemies = new Set<EnemySprite>([primary])
    const chain: EnemySprite[] = [primary]

    for (let jump = 0; jump < maxTargets; jump++) {
      const last = chain[chain.length - 1]
      const lastTile = last.getCurrentTile()
      if (!lastTile) break

      const candidates = this.getEnemiesInRadius(lastTile, radius, enemies, primary)
        .filter(e => !hitEnemies.has(e) && e.alive)
      if (candidates.length === 0) break

      const next = candidates[0]
      chain.push(next)
      hitEnemies.add(next)

      if (this.events.onChainJump) {
        this.events.onChainJump(unit, last, next)
      }

      const baseDmg = this.calculateDamage(unit, next, atkOverride)
      const chainDmg = Math.max(1, Math.floor(baseDmg * Math.pow(falloff, jump + 1)))
      next.takeDamage(chainDmg)
      if (chainDmg > 0) {
        this.events.onDamageDealt(chainDmg, next, unit.config.damageType)
      }
      if (!next.alive) {
        this.checkExploderKill(next)
        this.events.onEnemyKilled(next, unit)
      }
    }
  }

  private findTarget(unit: UnitSprite, enemies: EnemySprite[], rangePattern?: number[][]): EnemySprite | null {
    const inRange = this.getEnemiesInRange(unit, enemies, rangePattern)
    if (inRange.length === 0) return null

    if (unit.config.type === 'ground') {
      const blockedTarget = this.findBlockedTarget(unit, inRange)
      if (blockedTarget) return blockedTarget
    }

    if (this.hasTrait(unit, UnitTrait.TargetingLowestDef)) {
      return this.findLowestDef(inRange)
    }

    if (this.hasTrait(unit, UnitTrait.TargetingAerial)) {
      const aerial = inRange.filter(e => e.config.isAerial)
      if (aerial.length > 0) return this.findClosestToGoal(aerial)
    }

    return this.findClosestToGoal(inRange)
  }

  private getEnemiesInRange(unit: UnitSprite, enemies: EnemySprite[], rangePattern?: number[][]): EnemySprite[] {
    const pattern = rangePattern ?? unit.config.rangePattern
    const unitPos: Position = { row: unit.row, col: unit.col }
    const rangeTiles = positionsInRange(unitPos, pattern, this.grid.rows, this.grid.cols, unit.facing)
    const rangeSet = new Set(rangeTiles.map(p => `${p.row},${p.col}`))

    return enemies.filter(e => {
      if (!e.alive) return false
      const tile = e.getCurrentTile()
      return tile !== null && rangeSet.has(`${tile.row},${tile.col}`)
    })
  }

  private getEnemiesInRadius(pos: Position, radius: number, enemies: EnemySprite[], exclude?: EnemySprite): EnemySprite[] {
    const center = this.grid.tileToPixel(pos.row, pos.col)
    const radiusPx = radius * 64
    return enemies.filter(e => {
      if (!e.alive || e === exclude) return false
      const dx = e.x - center.x
      const dy = e.y - center.y
      return dx * dx + dy * dy <= radiusPx * radiusPx
    })
  }

  private findBlockedTarget(unit: UnitSprite, enemies: EnemySprite[]): EnemySprite | null {
    const unitTile = `${unit.row},${unit.col}`
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.blocked) continue
      const enemyTile = enemy.getCurrentTile()
      if (enemyTile && `${enemyTile.row},${enemyTile.col}` === unitTile) {
        return enemy
      }
    }
    return null
  }

  private findClosestToGoal(enemies: EnemySprite[]): EnemySprite | null {
    let closest: EnemySprite | null = null
    let maxWaypoint = -1

    for (const enemy of enemies) {
      if (!enemy.alive) continue
      const progress = enemy.currentWaypoint

      if (progress > maxWaypoint) {
        maxWaypoint = progress
        closest = enemy
      }
    }

    return closest
  }

  private findLowestDef(enemies: EnemySprite[]): EnemySprite | null {
    let lowest: EnemySprite | null = null
    let minDef = Infinity
    for (const enemy of enemies) {
      if (!enemy.alive) continue
      if (enemy.config.armor < minDef) {
        minDef = enemy.config.armor
        lowest = enemy
      }
    }
    return lowest
  }

  private applyDamage(unit: UnitSprite, target: EnemySprite, atkOverride?: number): void {
    const damage = this.calculateDamage(unit, target, atkOverride)
    const droneBonus = this.getDroneRampDamage(unit, target)
    const total = damage + droneBonus
    target.takeDamage(total)

    if (total > 0) {
      this.events.onDamageDealt(total, target, unit.config.damageType)
    }
    if (!target.alive) {
      this.checkExploderKill(target)
      this.events.onEnemyKilled(target, unit)
    } else {
      this.applySlow(unit, target)
    }
  }

  private healAllyOnAttack(unit: UnitSprite, allies: UnitSprite[]): void {
    const healAmount = Math.max(1, Math.floor(unit.config.atk * 0.5))
    const unitPos: Position = { row: unit.row, col: unit.col }
    const rangeTiles = positionsInRange(unitPos, unit.config.rangePattern, this.grid.rows, this.grid.cols, unit.facing)
    const rangeSet = new Set(rangeTiles.map(p => `${p.row},${p.col}`))

    const inRange = allies.filter(a => {
      if (!a.isAlive() || a === unit) return false
      return rangeSet.has(`${a.row},${a.col}`)
    })

    let best: UnitSprite | null = null
    let lowestPct = 1
    for (const a of inRange) {
      const pct = a.currentHp / a.config.hp
      if (pct < lowestPct) {
        lowestPct = pct
        best = a
      }
    }

    if (best) {
      const healed = best.heal(healAmount)
      if (healed > 0 && this.events.onHealApplied) {
        this.events.onHealApplied(best, healed, unit)
      }
    }
  }

  private applySlow(unit: UnitSprite, target: EnemySprite): void {
    if (!this.hasTrait(unit, UnitTrait.SlowOnHit)) return
    const traitConfig = unit.config.traits.find(t => t.traitId === UnitTrait.SlowOnHit)
    if (!traitConfig) return
    target.applyStatusEffect({
      type: 'slow',
      remainingDuration: traitConfig.duration ?? 2,
      factor: traitConfig.value ?? 0.5,
    })
  }

  private calculateDamage(unit: UnitSprite, target: EnemySprite, atkOverride?: number): number {
    const atk = atkOverride ?? unit.config.atk
    if (unit.config.damageType === 'true') return atk
    if (unit.config.damageType === 'kinetic') {
      return Math.max(Math.floor(atk * 0.05), atk - target.config.armor)
    }
    return Math.max(Math.floor(atk * 0.05), Math.floor(atk * (1 - target.config.res / 100)))
  }

  private getDroneRampDamage(unit: UnitSprite, target: EnemySprite): number {
    if (!this.hasTrait(unit, UnitTrait.DroneRamp)) return 0
    const traitConfig = unit.config.traits.find(t => t.traitId === UnitTrait.DroneRamp)
    if (!traitConfig) return 0

    let state = this.droneRampState.get(unit)
    if (!state) {
      state = { lastEnemyId: null, ramp: 0 }
      this.droneRampState.set(unit, state)
    }

    const targetTile = target.getCurrentTile()
    if (!targetTile) return 0
    const targetId = `${targetTile.row},${targetTile.col}`
    if (state.lastEnemyId !== targetId) {
      state.lastEnemyId = targetId
      state.ramp = 0
    }

    const base = traitConfig.rampBasePercent ?? 0.2
    const increment = traitConfig.rampIncrement ?? 0.15
    const maxPercent = traitConfig.rampMaxPercent ?? 1.1
    const currentPercent = Math.min(base + state.ramp * increment, maxPercent)
    state.ramp++

    return Math.floor(unit.config.atk * currentPercent)
  }

  private calcDamage(atk: number, def: number, res: number, type: DamageType): number {
    if (type === 'true') return atk
    if (type === 'kinetic') return Math.max(Math.floor(atk * 0.05), atk - def)
    return Math.max(Math.floor(atk * 0.05), Math.floor(atk * (1 - res / 100)))
  }

  private checkExploderKill(enemy: EnemySprite): void {
    if (!enemy.alive && enemy.behavior.type === 'exploder') {
      const tile = enemy.getCurrentTile()
      if (tile && this.events.onExplosion) {
        this.events.onExplosion(tile, enemy.behavior.explosionDamage, enemy.behavior.explosionRadius, enemy.behavior.damageType)
      }
    }
  }

  private processPendingAttacks(dt: number): void {
    const remaining: PendingAttack[] = []
    for (const pa of this.pendingAttacks) {
      pa.elapsed += dt
      if (pa.elapsed >= pa.duration) {
        this.enemiesInWindUp.delete(pa.enemy.id)
        if (pa.target.isAlive()) {
          pa.target.takeDamage(pa.damage)
          if (pa.damage > 0 && this.events.onUnitDamageDealt) {
            this.events.onUnitDamageDealt(pa.damage, pa.target, pa.enemy.config.damageType)
          }
          this.events.onEnemyAttackLanded?.(pa.enemy, pa.target, pa.damage)
          if (!pa.target.isAlive() && this.events.onUnitDeath) {
            this.events.onUnitDeath(pa.target, pa.enemy)
          }
        } else {
          this.events.onEnemyAttackCancelled?.(pa.attackId)
        }
      } else {
        remaining.push(pa)
      }
    }
    this.pendingAttacks = remaining
  }

  private hasTrait(unit: UnitSprite, traitId: UnitTrait): boolean {
    return unit.config.traits?.some(t => t.traitId === traitId) ?? false
  }
}
