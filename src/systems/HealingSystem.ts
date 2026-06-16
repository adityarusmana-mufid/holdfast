import { Grid } from '../entities/Grid'
import { UnitSprite } from '../entities/Unit'
import { UnitTrait, Position } from '../types/index'
import { positionsInRange } from '../shared/utils/GridMath'

export class HealingSystem {
  private grid: Grid
  private healAccumulators: Map<string, number> = new Map()

  constructor(grid: Grid) {
    this.grid = grid
  }

  update(delta: number, units: UnitSprite[], onHeal: (target: UnitSprite, amount: number, source: UnitSprite) => void): void {
    for (const unit of units) {
      if (!unit.isAlive()) continue

      if (this.hasTrait(unit, UnitTrait.HealAlly)) {
        this.tickSingleHeal(unit, units, delta, onHeal)
      }

      if (this.hasTrait(unit, UnitTrait.AoEHoT)) {
        this.tickAoEHoT(unit, units, delta, onHeal)
      }
    }
  }

  private tickSingleHeal(unit: UnitSprite, allies: UnitSprite[], delta: number, onHeal: (target: UnitSprite, amount: number, source: UnitSprite) => void): void {
    const key = `heal_${unit.row}_${unit.col}`
    const dt = delta / 1000
    const acc = (this.healAccumulators.get(key) ?? 0) + dt
    const interval = unit.config.attackInterval

    if (acc < interval) {
      this.healAccumulators.set(key, acc)
      return
    }
    this.healAccumulators.set(key, acc - interval)

    const inRange = this.getAlliesInRange(unit, allies)
    if (inRange.length === 0) return

    const target = this.findLowestHpAlly(inRange)
    if (!target) return

    const healed = target.heal(unit.config.atk)
    if (healed > 0) {
      onHeal(target, unit.config.atk, unit)
    }
  }

  private tickAoEHoT(unit: UnitSprite, allies: UnitSprite[], delta: number, onHeal: (target: UnitSprite, amount: number, source: UnitSprite) => void): void {
    const key = `hot_${unit.row}_${unit.col}`
    const dt = delta / 1000
    const acc = (this.healAccumulators.get(key) ?? 0) + dt
    const interval = unit.config.attackInterval

    if (acc < interval) {
      this.healAccumulators.set(key, acc)
      return
    }
    this.healAccumulators.set(key, acc - interval)

    const traitConfig = unit.config.traits.find(t => t.traitId === UnitTrait.AoEHoT)
    const radius = traitConfig?.radius ?? 2
    const healAmount = traitConfig?.value ?? 50

    const unitPos: Position = { row: unit.row, col: unit.col }
    for (const ally of allies) {
      if (!ally.isAlive() || ally === unit) continue
      const dr = Math.abs(ally.row - unitPos.row)
      const dc = Math.abs(ally.col - unitPos.col)
      if (dr <= radius && dc <= radius) {
        const healed = ally.heal(healAmount)
        if (healed > 0) {
          onHeal(ally, healAmount, unit)
        }
      }
    }
  }

  private getAlliesInRange(unit: UnitSprite, allies: UnitSprite[]): UnitSprite[] {
    const unitPos: Position = { row: unit.row, col: unit.col }
    const rangeTiles = positionsInRange(unitPos, unit.config.rangePattern, this.grid.rows, this.grid.cols, unit.facing)
    const rangeSet = new Set(rangeTiles.map(p => `${p.row},${p.col}`))

    return allies.filter(a => {
      if (!a.isAlive() || a === unit) return false
      return rangeSet.has(`${a.row},${a.col}`)
    })
  }

  private findLowestHpAlly(allies: UnitSprite[]): UnitSprite | null {
    let best: UnitSprite | null = null
    let lowestPct = 1
    for (const a of allies) {
      const pct = a.currentHp / a.config.hp
      if (pct < lowestPct) {
        lowestPct = pct
        best = a
      }
    }
    return best
  }

  getHealForUnit(row: number, col: number): number {
    const key = `heal_${row}_${col}`
    this.healAccumulators.delete(key)
    const key2 = `hot_${row}_${col}`
    this.healAccumulators.delete(key2)
    return 0
  }

  private hasTrait(unit: UnitSprite, traitId: UnitTrait): boolean {
    return unit.config.traits?.some(t => t.traitId === traitId) ?? false
  }
}
