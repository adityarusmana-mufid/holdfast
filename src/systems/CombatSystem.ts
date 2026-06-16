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

      if (this.hasTrait(unit, UnitTrait.LinearAoE)) {
        this.executeLinearAoEAttack(unit, enemies)
      } else {
        const target = this.findTarget(unit, enemies)
        if (!target || !target.alive) continue

        const hitCount = this.hasTrait(unit, UnitTrait.DoubleHit) ? 2 : 1
        for (let i = 0; i < hitCount; i++) {
          if (!target.alive) break
          this.applyDamage(unit, target)
        }
      }
    }
  }

  private executeLinearAoEAttack(unit: UnitSprite, enemies: EnemySprite[]): void {
    const targets = this.getEnemiesInRange(unit, enemies)
    for (const target of targets) {
      if (!target.alive) continue
      this.applyDamage(unit, target)
    }
  }

  private findTarget(unit: UnitSprite, enemies: EnemySprite[]): EnemySprite | null {
    const inRange = this.getEnemiesInRange(unit, enemies)
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

  private getEnemiesInRange(unit: UnitSprite, enemies: EnemySprite[]): EnemySprite[] {
    const unitPos: Position = { row: unit.row, col: unit.col }
    const rangeTiles = positionsInRange(unitPos, unit.config.rangePattern, this.grid.rows, this.grid.cols, unit.facing)
    const rangeSet = new Set(rangeTiles.map(p => `${p.row},${p.col}`))

    return enemies.filter(e => {
      if (!e.alive) return false
      const tile = e.getCurrentTile()
      return tile !== null && rangeSet.has(`${tile.row},${tile.col}`)
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

  private applyDamage(unit: UnitSprite, target: EnemySprite): void {
    const damage = this.calculateDamage(unit, target)
    target.takeDamage(damage)

    if (damage > 0) {
      this.events.onDamageDealt(damage, target, unit.config.damageType)
    }
    if (!target.alive) {
      this.events.onEnemyKilled(target, unit)
    }
  }

  private calculateDamage(unit: UnitSprite, target: EnemySprite): number {
    const atk = unit.config.atk
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
