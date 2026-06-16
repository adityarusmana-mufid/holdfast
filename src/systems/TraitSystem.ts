import { UnitSprite } from '../entities/Unit'
import { UnitTrait, UnitTraitConfig, Position } from '../types/index'

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

  static getAdjacentAllies(pos: Position, units: UnitSprite[], excludeUnit?: UnitSprite): UnitSprite[] {
    return units.filter(u =>
      u.isAlive() &&
      u !== excludeUnit &&
      Math.abs(u.row - pos.row) <= 1 &&
      Math.abs(u.col - pos.col) <= 1
    )
  }
}
