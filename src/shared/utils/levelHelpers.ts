import { UnitConfig } from '../../types/index'
import { UNIT_CONFIGS } from '../../config/units'

const TR_SQUADS: Record<string, string[]> = {
  'TR-8': ['protector', 'splash_caster', 'chain_caster', 'medic_st'],
  'TR-9': ['protector', 'fighter', 'medic_multi'],
}

export function tutorialSquad(levelId?: string): UnitConfig[] {
  const ids = TR_SQUADS[levelId ?? ''] ?? ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
  return ids.map(id => UNIT_CONFIGS.find(u => u.id === id)).filter((u): u is UnitConfig => u !== undefined)
}
