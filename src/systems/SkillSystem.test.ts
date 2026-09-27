import { describe, expect, it, vi } from 'vitest'
import { SKILLS } from '../config/skills'
import { DeployedUnit } from '../types/index'
import { SkillSystem } from './SkillSystem'

function makeHookmaster(): DeployedUnit {
  return {
    config: { skills: SKILLS.puller },
  } as DeployedUnit
}

describe('SkillSystem', () => {
  it("stores Hookmaster S1's opening pull charge immediately", () => {
    const onSkillActivated = vi.fn()
    const system = new SkillSystem({ onSkillActivated })
    const hookmaster = makeHookmaster()

    system.initSkillState(hookmaster, 'puller_s1')
    system.update(16, [hookmaster])

    expect(hookmaster.skillState).toMatchObject({ currentSp: 0, charges: 1, spLocked: false })
    expect(system.tryConsumeCharge(hookmaster)).toBe(true)
    expect(onSkillActivated).toHaveBeenCalledWith(hookmaster)
  })
})
