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
      charges: 0,
      spLocked: false,
    }
  }

  private storeCharge(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state) return
    const maxCh = state.config.charges ?? 0
    if (state.charges >= maxCh) return
    state.currentSp -= state.config.spCost
    state.charges++
  }

  private tryAutoTrigger(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive || state.spLocked) return
    if (state.config.activation !== 'auto') return
    if (state.currentSp < state.config.spCost) return

    const maxCh = state.config.charges ?? 0
    if (maxCh > 0 && state.config.durationType === 'instant') {
      if (state.charges < maxCh) {
        this.storeCharge(unit)
        state.spLocked = state.charges >= maxCh
      }
    } else {
      this.activateSkill(unit)
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
        const maxCh = config.charges ?? 0
        const cap = maxCh > 0 ? config.spCost : config.spCost
        state.currentSp = Math.min(cap, state.currentSp + AUTO_SP_RATE * dt)
        this.tryAutoTrigger(unit)
      }
    }
  }

  offensiveSPGain(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive || state.spLocked) return
    if (state.config.spRecovery !== 'offensive') return

    state.currentSp = Math.min(state.config.spCost, state.currentSp + 1)
    this.tryAutoTrigger(unit)
  }

  defensiveSPGain(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive || state.spLocked) return
    if (state.config.spRecovery !== 'defensive') return

    state.currentSp = Math.min(state.config.spCost, state.currentSp + 1)
    this.tryAutoTrigger(unit)
  }

  tryConsumeCharge(unit: DeployedUnit): boolean {
    const state = unit.skillState
    if (!state || state.charges <= 0) return false
    state.charges--
    state.spLocked = false
    this.events.onSkillActivated?.(unit)
    return true
  }

  activateSkill(unit: DeployedUnit): void {
    const state = unit.skillState
    if (!state || state.isActive) return

    const config = state.config
    const maxCh = config.charges ?? 0
    if (maxCh > 0 && state.charges > 0) {
      state.charges--
    } else {
      state.currentSp -= config.spCost
    }
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
    if (state.isActive) return false

    const isCharge = (state.config.charges ?? 0) > 0
    if (isCharge && state.config.activation === 'auto') return state.charges > 0
    return !state.spLocked && state.currentSp >= state.config.spCost
  }

  getSpProgress(unit: DeployedUnit): number {
    const state = unit.skillState
    if (!state) return 0
    const maxCh = state.config.charges ?? 0
    if (maxCh > 0) {
      const totalSp = state.charges * state.config.spCost + state.currentSp
      const maxSp = maxCh * state.config.spCost
      return totalSp / maxSp
    }
    return state.currentSp / state.config.spCost
  }

  getSpCurrent(unit: DeployedUnit): number {
    const state = unit.skillState
    if (!state) return 0
    const maxCh = state.config.charges ?? 0
    if (maxCh > 0) {
      return state.charges * state.config.spCost + state.currentSp
    }
    return state.currentSp
  }
}
