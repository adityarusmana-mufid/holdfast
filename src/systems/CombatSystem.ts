import { Grid } from '../entities/Grid'
import { EnemySprite } from '../entities/Enemy'
import { UnitSprite } from '../entities/Unit'
import { Position, UnitTrait } from '../types/index'
import { positionsInRange } from '../shared/utils/GridMath'

export interface CombatEvents {
  onEnemyKilled: (enemy: EnemySprite, killer: UnitSprite | null) => void
  onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => void
  onHealApplied?: (target: UnitSprite, amount: number, source: UnitSprite) => void
}

interface AttackParams {
  rangePattern: number[][]
  atk: number
  useAoE: boolean
}

export class CombatSystem {
  private grid: Grid
  private events: CombatEvents

  constructor(grid: Grid, events: CombatEvents) {
    this.grid = grid
    this.events = events
  }

  update(delta: number, units: UnitSprite[], enemies: EnemySprite[]): void {
    for (const unit of units) {
      if (!unit.isAlive()) continue

      const dt = delta / 1000
      unit.lastAttackTime += dt

      if (unit.lastAttackTime < unit.config.attackInterval) continue
      unit.lastAttackTime = 0

      const params = this.getAttackParams(unit, enemies)

      if (params.useAoE) {
        this.executeAoEAttack(unit, enemies, params)
      } else if (this.hasTrait(unit, UnitTrait.LinearAoE)) {
        this.executeLinearAoEAttack(unit, enemies)
      } else {
        const target = this.findTarget(unit, enemies, params.rangePattern)
        if (!target || !target.alive) continue

        const hitCount = this.hasTrait(unit, UnitTrait.DoubleHit) ? 2 : 1
        for (let i = 0; i < hitCount; i++) {
          if (!target.alive) break
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
  }

  private isBlocking(unit: UnitSprite, enemies: EnemySprite[]): boolean {
    const key = `${unit.row},${unit.col}`
    return enemies.some(e => {
      if (!e.alive || !e.blocked) return false
      const tile = e.getCurrentTile()
      return tile !== null && `${tile.row},${tile.col}` === key
    })
  }

  private getAttackParams(unit: UnitSprite, enemies: EnemySprite[]): AttackParams {
    const isBlocking = this.isBlocking(unit, enemies)
    const hasRangedMode = this.hasTrait(unit, UnitTrait.RangedWhenNotBlocking) ||
      this.hasTrait(unit, UnitTrait.RangedAoEWhenNotBlocking)

    if (!hasRangedMode || isBlocking) {
      return { rangePattern: unit.config.rangePattern, atk: unit.config.atk, useAoE: false }
    }

    let atk = unit.config.atk
    if (this.hasTrait(unit, UnitTrait.RangedAttack80)) {
      atk = Math.floor(atk * 0.8)
    }

    const rangePattern = unit.config.altRangePattern ?? unit.config.rangePattern
    const useAoE = this.hasTrait(unit, UnitTrait.RangedAoEWhenNotBlocking)

    return { rangePattern, atk, useAoE }
  }

  private executeAoEAttack(unit: UnitSprite, enemies: EnemySprite[], params: AttackParams): void {
    const targets = this.getEnemiesInRange(unit, enemies, params.rangePattern)
    for (const target of targets) {
      if (!target.alive) continue
      this.applyDamage(unit, target, params.atk)
    }
  }

  private executeLinearAoEAttack(unit: UnitSprite, enemies: EnemySprite[]): void {
    const targets = this.getEnemiesInRange(unit, enemies)
    for (const target of targets) {
      if (!target.alive) continue
      this.applyDamage(unit, target)
    }
  }

  private executeSplashDamage(unit: UnitSprite, primary: EnemySprite, enemies: EnemySprite[], atkOverride?: number): void {
    const splashConfig = unit.config.splashConfig!
    const tile = primary.getCurrentTile()
    if (!tile) return

    const splashTargets = this.getEnemiesInRadius(tile, splashConfig.radius, enemies, primary)
    for (const target of splashTargets) {
      if (!target.alive) continue
      const baseDamage = this.calculateDamage(unit, target, atkOverride)
      const splashDmg = Math.max(1, Math.floor(baseDamage * splashConfig.damageMultiplier))
      target.takeDamage(splashDmg)
      if (splashDmg > 0) {
        this.events.onDamageDealt(splashDmg, target, splashConfig.damageType ?? unit.config.damageType)
      }
      if (!target.alive) {
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

      const baseDmg = this.calculateDamage(unit, next, atkOverride)
      const chainDmg = Math.max(1, Math.floor(baseDmg * Math.max(0.05, 1 - falloff * (jump + 1))))
      next.takeDamage(chainDmg)
      if (chainDmg > 0) {
        this.events.onDamageDealt(chainDmg, next, unit.config.damageType)
      }
      if (!next.alive) {
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
    return enemies.filter(e => {
      if (!e.alive || e === exclude) return false
      const tile = e.getCurrentTile()
      if (!tile) return false
      return Math.abs(tile.row - pos.row) <= radius && Math.abs(tile.col - pos.col) <= radius
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
    target.takeDamage(damage)

    if (damage > 0) {
      this.events.onDamageDealt(damage, target, unit.config.damageType)
    }
    if (!target.alive) {
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
    let def: number
    if (unit.config.damageType === 'kinetic') {
      def = target.config.armor
    } else {
      def = target.config.insulation
    }
    return Math.max(Math.floor(atk * 0.05), atk - def)
  }

  private hasTrait(unit: UnitSprite, traitId: UnitTrait): boolean {
    return unit.config.traits?.some(t => t.traitId === traitId) ?? false
  }
}
