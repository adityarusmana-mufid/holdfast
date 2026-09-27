import { describe, expect, it } from 'vitest'
import { getShiftDistance } from './Shift'

describe('getShiftDistance', () => {
  it('moves a target one tile when force meets its weight', () => {
    expect(getShiftDistance(1, 1)).toBe(1)
    expect(getShiftDistance(3, 3)).toBe(1)
  })

  it('does not shift targets heavier than the available force', () => {
    expect(getShiftDistance(1, 2)).toBe(0)
    expect(getShiftDistance(3, 4)).toBe(0)
  })

  it('converts excess force into up to three tiles of movement', () => {
    expect(getShiftDistance(1, 0)).toBe(2)
    expect(getShiftDistance(2, 0)).toBe(3)
    expect(getShiftDistance(5, 0)).toBe(3)
  })
})
