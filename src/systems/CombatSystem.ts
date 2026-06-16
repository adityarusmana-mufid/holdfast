import { Grid } from '../entities/Grid'
import { EnemySprite } from '../entities/Enemy'
import { UnitSprite } from '../entities/Unit'
import { Position } from '../types/index'
import { positionsInRange } from '../shared/utils/GridMath'

export interface CombatEvents {
  onEnemyKilled: (enemy: EnemySprite) => void
  onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => void
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

      const target = this.findTarget(unit, enemies)
      if (!target) continue

      const dt = delta / 1000
      unit.lastAttackTime += dt

      if (unit.lastAttackTime >= unit.config.attackInterval) {
        const damage = this.performAttack(unit, target)
        unit.lastAttackTime = 0
        if (damage > 0) {
          this.events.onDamageDealt(damage, target, unit.config.damageType)
        }
        if (!target.alive) {
          this.events.onEnemyKilled(target)
        }
      }
    }
  }

  private findTarget(unit: UnitSprite, enemies: EnemySprite[]): EnemySprite | null {
    const inRange = this.getEnemiesInRange(unit, enemies)
    if (inRange.length === 0) return null

    if (unit.config.type === 'ground') {
      const blockedTarget = this.findBlockedTarget(unit, inRange)
      if (blockedTarget) return blockedTarget
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

  private performAttack(unit: UnitSprite, target: EnemySprite): number {
    const atk = unit.config.atk
    let def: number
    if (unit.config.damageType === 'kinetic') {
      def = target.config.armor
    } else {
      def = target.config.insulation
    }
    const damage = Math.max(Math.floor(atk * 0.05), atk - def)
    target.takeDamage(damage)
    return damage
  }
}
