import { UnitConfig } from '../../types/index'
import { UNIT_CONFIGS } from '../../config/units'

export function tutorialSquad(): UnitConfig[] {
  const ids = ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
  return ids.map(id => UNIT_CONFIGS.find(u => u.id === id)).filter((u): u is UnitConfig => u !== undefined)
}
