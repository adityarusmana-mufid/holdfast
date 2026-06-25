import { DeployedUnit } from '../types/index'

const AUTO_SP_RATE = 1

export interface SkillEvents {
  onSkillActivated?: (unit: DeployedUnit) => void
  onSkillDeactivated?: (unit: DeployedUnit) => void
}

export class SkillSystem {
  private events: SkillEvents

  constructor(events: SkillEvents) {
    this.events = events
  }

  initSkillState(unit: DeployedUnit, skillId: string): void {
    const skill = unit.config.skills.find(s => s.id === skillId)
    if (!skill) return
    unit.skillState = {
      config: skill,
      currentSp: skill.spInitial,
      isActive: false,
      remainingDuration: 0,
      charges: skill.charges ?? 0,
      spLocked: false,
    }
  }

  update(delta: number, units: DeployedUnit[]): void {
    const dt = delta / 1000

    for (const unit of units) {
      if (!unit.skillState) continue
      const state = unit.skillState
      const config = state.config

      if (state.isActive) {
        if (config.durationType === 'duration') {
          state.remainingDuration -= dt
          if (state.remainingDuration <= 0) {
            this.deactivateSkill(unit)
          }
        }
        continue
      }

      if (state.spLocked) continue

      if (config.spRecovery === 'auto') {
        state.currentSp = Math.min(config.spCost, state.currentSp + AUTO_SP_RATE * dt)

        if (config.activation === 'auto' && state.currentSp >= config.spCost) {
          this.activateSkill(unit)
        }
      }
    }
  }

  offensiveSPGain(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive || state.spLocked) return
    if (state.config.spRecovery !== 'offensive') return

    state.currentSp = Math.min(state.config.spCost, state.currentSp + 1)

    if (state.config.activation === 'auto' && state.currentSp >= state.config.spCost) {
      this.activateSkill(unit)
    }
  }

  defensiveSPGain(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive || state.spLocked) return
    if (state.config.spRecovery !== 'defensive') return

    state.currentSp = Math.min(state.config.spCost, state.currentSp + 1)

    if (state.config.activation === 'auto' && state.currentSp >= state.config.spCost) {
      this.activateSkill(unit)
    }
  }

  activateSkill(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive) return

    const config = state.config
    state.currentSp -= config.spCost
    state.isActive = true
    state.spLocked = true

    if (config.durationType === 'duration') {
      state.remainingDuration = config.duration ?? 5
    } else if (config.durationType === 'toggle') {
      state.remainingDuration = -1
    }

    this.events.onSkillActivated?.(unit)
  }

  deactivateSkill(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || !state.isActive) return

    state.isActive = false
    state.remainingDuration = 0
    state.spLocked = false

    this.events.onSkillDeactivated?.(unit)
  }

  canActivateSkill(unit: DeployedUnit): boolean {
    const state = unit.skillState
    if (!state) return false
    return !state.isActive && !state.spLocked && state.currentSp >= state.config.spCost
  }

  getSpProgress(unit: DeployedUnit): number {
    const state = unit.skillState
    if (!state) return 0
    return state.currentSp / state.config.spCost
  }

  getSpCurrent(unit: DeployedUnit): number {
    return unit.skillState?.currentSp ?? 0
  }
}
