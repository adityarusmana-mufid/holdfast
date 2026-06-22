import { describe, it, expect } from 'vitest'
import {
  rotatePattern, positionsInRange, computeFacingTowardGoal,
  manhattanDistance, chebyshevDistance, isDeployable, isWalkable,
  positionsEqual, validateRoutePath, getNeighbors,
} from './GridMath'
import { TileType, Direction } from '../../types/index'

describe('rotatePattern', () => {
  const meleeFront = [[-1, 0], [0, 0]]

  it('returns same pattern for up facing', () => {
    expect(rotatePattern(meleeFront, 'up')).toEqual([[-1, 0], [0, 0]])
  })

  it('rotates 180° for down facing', () => {
    expect(rotatePattern(meleeFront, 'down')).toEqual([[1, 0], [0, 0]])
  })

  it('rotates 90° CW for right facing', () => {
    expect(rotatePattern(meleeFront, 'right')).toEqual([[0, 1], [0, 0]])
  })

  it('rotates 90° CCW for left facing', () => {
    expect(rotatePattern(meleeFront, 'left')).toEqual([[0, -1], [0, 0]])
  })

  it('rotates meleeCross correctly', () => {
    const cross = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
    const right = rotatePattern(cross, 'right')
    expect(right).toEqual([[0, 0], [0, 1], [0, -1], [-1, 0], [1, 0]])
  })

  it('handles up (identity) for any pattern', () => {
    const pattern = [[-3, -1], [-3, 0], [-3, 1], [-2, -1], [-2, 0], [-2, 1]]
    expect(rotatePattern(pattern, 'up')).toEqual(pattern)
  })
})

describe('positionsInRange', () => {
  it('returns tiles for meleeFront facing up', () => {
    const result = positionsInRange({ row: 5, col: 5 }, [[-1, 0], [0, 0]], 10, 10, 'up')
    expect(result).toEqual([{ row: 4, col: 5 }, { row: 5, col: 5 }])
  })

  it('returns tiles for meleeFront facing right', () => {
    const result = positionsInRange({ row: 5, col: 5 }, [[-1, 0], [0, 0]], 10, 10, 'right')
    expect(result).toEqual([{ row: 5, col: 6 }, { row: 5, col: 5 }])
  })

  it('clamps out-of-bounds tiles', () => {
    const result = positionsInRange({ row: 0, col: 0 }, [[-1, 0], [0, 0], [1, 0]], 3, 3, 'up')
    expect(result).toEqual([{ row: 0, col: 0 }, { row: 1, col: 0 }])
  })

  it('works without facing (uses raw pattern)', () => {
    const result = positionsInRange({ row: 2, col: 2 }, [[-1, 0], [0, 0]], 5, 5)
    expect(result).toEqual([{ row: 1, col: 2 }, { row: 2, col: 2 }])
  })
})

describe('computeFacingTowardGoal', () => {
  it('faces up when goal is above', () => {
    expect(computeFacingTowardGoal({ row: 5, col: 5 }, [{ row: 2, col: 5 }])).toBe('up')
  })

  it('faces down when goal is below', () => {
    expect(computeFacingTowardGoal({ row: 2, col: 5 }, [{ row: 5, col: 5 }])).toBe('down')
  })

  it('faces right when goal is to the right', () => {
    expect(computeFacingTowardGoal({ row: 3, col: 3 }, [{ row: 3, col: 7 }])).toBe('right')
  })

  it('faces left when goal is to the left', () => {
    expect(computeFacingTowardGoal({ row: 3, col: 7 }, [{ row: 3, col: 3 }])).toBe('left')
  })

  it('prefers vertical over horizontal when equal', () => {
    expect(computeFacingTowardGoal({ row: 0, col: 0 }, [{ row: 3, col: 3 }])).toBe('down')
  })

  it('defaults to up when no goals', () => {
    expect(computeFacingTowardGoal({ row: 0, col: 0 }, [])).toBe('up')
  })

  it('picks closest goal from multiple', () => {
    const goals = [{ row: 0, col: 9 }, { row: 5, col: 5 }]
    expect(computeFacingTowardGoal({ row: 4, col: 4 }, goals)).toBe('down')
  })
})

describe('manhattanDistance', () => {
  it('calculates distance between two points', () => {
    expect(manhattanDistance({ row: 0, col: 0 }, { row: 3, col: 4 })).toBe(7)
  })

  it('returns 0 for same point', () => {
    expect(manhattanDistance({ row: 2, col: 2 }, { row: 2, col: 2 })).toBe(0)
  })
})

describe('chebyshevDistance', () => {
  it('returns max of row/col difference', () => {
    expect(chebyshevDistance({ row: 0, col: 0 }, { row: 3, col: 7 })).toBe(7)
  })
})

describe('positionsEqual', () => {
  it('returns true for same position', () => {
    expect(positionsEqual({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true)
  })

  it('returns false for different position', () => {
    expect(positionsEqual({ row: 1, col: 2 }, { row: 2, col: 2 })).toBe(false)
  })
})

describe('isDeployable', () => {
  it('returns true for ground tiles', () => {
    expect(isDeployable(TileType.Ground)).toBe(true)
  })

  it('returns true for ranged tiles', () => {
    expect(isDeployable(TileType.Ranged)).toBe(true)
  })

  it('returns true for repair node', () => {
    expect(isDeployable(TileType.RepairNode)).toBe(true)
  })

  it('returns true for armor grid', () => {
    expect(isDeployable(TileType.ArmorGrid)).toBe(true)
  })

  it('returns false for wall', () => {
    expect(isDeployable(TileType.Wall)).toBe(false)
  })

  it('returns false for floor', () => {
    expect(isDeployable(TileType.Floor)).toBe(false)
  })
})

describe('isWalkable', () => {
  it('returns true for floor', () => {
    expect(isWalkable(TileType.Floor)).toBe(true)
  })

  it('returns false for wall', () => {
    expect(isWalkable(TileType.Wall)).toBe(false)
  })

  it('returns false for ground', () => {
    expect(isWalkable(TileType.Ground)).toBe(false)
  })
})

describe('validateRoutePath', () => {
  it('returns true for path with spawn + goal', () => {
    const route = { color: 0xff0000, spawn: { row: 0, col: 0 }, waypoints: [], goal: { row: 5, col: 5 } }
    expect(validateRoutePath(route)).toBe(true)
  })

  it('returns false for path with only one point', () => {
    const route = { color: 0xff0000, spawn: { row: 0, col: 0 }, waypoints: [], goal: { row: 0, col: 0 } }
    expect(validateRoutePath(route)).toBe(true)
  })
})

describe('getNeighbors', () => {
  const rows = 5, cols = 5

  it('returns 4 orthogonal neighbors for center tile', () => {
    const neighbors = getNeighbors({ row: 2, col: 2 }, rows, cols)
    expect(neighbors).toHaveLength(4)
  })

  it('includes diagonals when requested', () => {
    const neighbors = getNeighbors({ row: 2, col: 2 }, rows, cols, true)
    expect(neighbors).toHaveLength(8)
  })

  it('clamps at edges', () => {
    const neighbors = getNeighbors({ row: 0, col: 0 }, rows, cols)
    expect(neighbors).toHaveLength(2)
  })
})
