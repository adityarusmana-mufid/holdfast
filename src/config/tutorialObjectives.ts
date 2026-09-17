import { TutorialStep } from '../systems/TutorialSystem'

export const TUTORIAL_OBJECTIVES: Record<string, TutorialStep[]> = {
  'TR-1': [{ action: 'deploy', unitId: 'protector', text: 'Deploy a Protector on the route.' }, { action: 'deploy', unitId: 'medic_st', text: 'Deploy a Medic in range of the Protector.' }],
  'TR-2': [{ action: 'deploy', text: 'Deploy a unit and confirm its facing.' }],
  'TR-3': [{ action: 'deploy', unitId: 'sniper', text: 'Deploy a Sniper to cover the drones.' }],
  'TR-4': [{ action: 'deploy', unitId: 'pioneer', text: 'Deploy the Pioneer early.' }],
  'TR-5': [{ action: 'deploy', unitId: 'core_caster', text: 'Deploy a Caster before the tank arrives.' }],
  'TR-6': [{ action: 'deploy', text: 'Deploy an area-damage unit.' }],
  'TR-8': [{ action: 'deploy', unitId: 'roadblock', text: 'Deploy the Roadblock on the route.' }],
  'TR-9': [{ action: 'activate_generator', text: 'Activate the Stun Generator when enemies cluster.' }],
  'TR-10': [{ action: 'deploy', unitId: 'decel_binder', text: 'Deploy the Decel Binder facing the route.' }],
  'TR-11': [{ action: 'deploy', unitId: 'core_caster', text: 'Deploy the Caster against armored targets.' }],
  'TR-12': [{ action: 'deploy', unitId: 'medic_st', text: 'Deploy the Medic to support the frontline.' }],
  'TR-13': [{ action: 'deploy', unitId: 'protector', text: 'Deploy the Protector to establish the frontline.' }, { action: 'deploy', unitId: 'fighter', text: 'Deploy the Fighter behind the frontline.' }],
  'TR-14': [{ action: 'deploy', unitId: 'pusher', text: 'Deploy the Push Stroker beside the route.' }],
  'TR-15': [{ action: 'deploy', unitId: 'charger', text: 'Deploy the Charger early.' }, { action: 'retreat', unitId: 'charger', text: 'Retreat the Charger to reclaim its DP.' }],
}
