import { UnitConfig } from '../../types/index'
import { UNIT_CONFIGS } from '../../config/units'

const TR_SQUADS: Record<string, string[]> = {
  'TR-6': ['protector', 'splash_caster', 'sniper', 'medic_st'],
  'TR-8': ['roadblock', 'sniper'],
  'TR-9': ['protector', 'core_caster', 'medic_st'],
  'TR-10': ['decel_binder', 'sniper', 'protector', 'medic_st'],
  'TR-11': ['decel_binder', 'core_caster', 'protector', 'medic_st'],
  'TR-12': ['sniper', 'core_caster', 'medic_st'],
  'TR-13': ['fighter', 'protector', 'sniper', 'medic_st'],
  'TR-14': ['pusher', 'puller', 'protector', 'sniper', 'medic_st'],
  'TR-15': ['charger', 'protector', 'sniper', 'medic_st'],
}

export function tutorialSquad(levelId?: string): UnitConfig[] {
  const ids = TR_SQUADS[levelId ?? ''] ?? ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
  return ids.map(id => UNIT_CONFIGS.find(u => u.id === id)).filter((u): u is UnitConfig => u !== undefined)
}
