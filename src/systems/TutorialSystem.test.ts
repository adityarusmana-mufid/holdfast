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

  it('requires the specified placement and facing when a step defines them', () => {
    const tutorial = new TutorialSystem([
      {
        action: 'deploy', unitId: 'puller', facing: 'down',
        positions: [{ row: 0, col: 2 }, { row: 0, col: 6 }],
        text: 'Deploy the Hookmaster on an upper perch and face it downward.',
      },
    ])

    expect(tutorial.record('deploy', 'puller', { row: 0, col: 2, facing: 'up' })).toBe(false)
    expect(tutorial.record('deploy', 'puller', { row: 1, col: 2, facing: 'down' })).toBe(false)
    expect(tutorial.record('deploy', 'puller', { row: 0, col: 6, facing: 'down' })).toBe(true)
    expect(tutorial.complete).toBe(true)
  })
})
