import { describe, expect, it } from 'vitest'
import { SKILLS } from './skills'

describe('specialist skill defaults', () => {
  it('starts Hookmaster S1 ready to demonstrate its pull on deployment', () => {
    const skill = SKILLS.puller.find(({ id }) => id === 'puller_s1')

    expect(skill).toMatchObject({
      activation: 'auto',
      spCost: 4,
      spInitial: 4,
      charges: 3,
    })
  })
})
