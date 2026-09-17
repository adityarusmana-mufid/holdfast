import { describe, expect, it } from 'vitest'
import { TutorialSystem } from './TutorialSystem'

describe('TutorialSystem', () => {
  it('only advances when the required action and unit match', () => {
    const tutorial = new TutorialSystem([
      { action: 'deploy', unitId: 'sniper', text: 'Deploy a Sniper.' },
      { action: 'retreat', unitId: 'sniper', text: 'Retreat the Sniper.' },
    ])

    expect(tutorial.record('deploy', 'fighter')).toBe(false)
    expect(tutorial.current?.unitId).toBe('sniper')
    expect(tutorial.record('deploy', 'sniper')).toBe(true)
    expect(tutorial.record('retreat', 'sniper')).toBe(true)
    expect(tutorial.complete).toBe(true)
  })
})
