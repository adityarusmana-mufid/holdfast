import { Direction, TileType, Position, Route } from '../../types/index'

export const ROUTE_COLORS = [
  0xff4444, 0x4488ff, 0x44dd44, 0xffaa00,
  0xcc44ff, 0x00cccc, 0xff66aa, 0x888888,
]

export function tileColor(type: TileType): number {
  switch (type) {
    case TileType.Ground: return 0x3a3a3a
    case TileType.Floor: return 0x2a2a2a
    case TileType.Ranged: return 0x4a4a3a
    case TileType.Wall: return 0x1a1a1a
    case TileType.Spawn: return 0x4a1a1a
    case TileType.Goal: return 0x1a1a4a
    default: return 0x3a3a3a
  }
}

export function tileBorderColor(type: TileType): number {
  switch (type) {
    case TileType.Ground: return 0x555555
    case TileType.Floor: return 0x444444
    case TileType.Ranged: return 0x666655
    case TileType.Wall: return 0x333333
    case TileType.Spawn: return 0x883333
    case TileType.Goal: return 0x333388
    default: return 0x555555
  }
}

export function tileTextColor(type: TileType): string {
  switch (type) {
    case TileType.Spawn: return '#ff6666'
    case TileType.Goal: return '#6666ff'
    default: return '#888888'
  }
}

export function tileLabel(type: TileType): string {
  switch (type) {
    case TileType.Ground: return ''
    case TileType.Floor: return '//'
    case TileType.Ranged: return '⬆'
    case TileType.Wall: return '▤'
    case TileType.Spawn: return 'S'
    case TileType.Goal: return 'G'
    default: return ''
  }
}

export function isDeployable(type: TileType): boolean {
  return type === TileType.Ground || type === TileType.Ranged
}

export function isWalkable(type: TileType): boolean {
  return type === TileType.Floor || type === TileType.Spawn || type === TileType.Goal
}

export function validateRoutePath(route: Route): boolean {
  const path = [route.spawn, ...route.waypoints, route.goal]
  return path.length >= 2
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

export function chebyshevDistance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col))
}

export function getNeighbors(pos: Position, rows: number, cols: number, diagonal: boolean = false): Position[] {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  if (diagonal) {
    dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1])
  }
  const result: Position[] = []
  for (const [dr, dc] of dirs) {
    const r = pos.row + dr
    const c = pos.col + dc
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      result.push({ row: r, col: c })
    }
  }
  return result
}

export function isAdjacent8(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1
}

export function rotatePattern(pattern: number[][], facing: Direction): number[][] {
  return pattern.map(([dr, dc]) => {
    switch (facing) {
      case 'up':    return [dr, dc]
      case 'down':  return [-dr, -dc]
      case 'right': return [dc, -dr]
      case 'left':  return [-dc, dr]
    }
  })
}

export function computeFacingTowardGoal(unit: Position, goals: Position[]): Direction {
  if (goals.length === 0) return 'up'
  let closest = goals[0]
  let minDist = Infinity
  for (const g of goals) {
    const d = Math.abs(g.row - unit.row) + Math.abs(g.col - unit.col)
    if (d < minDist) { minDist = d; closest = g }
  }
  const dr = closest.row - unit.row
  const dc = closest.col - unit.col
  if (Math.abs(dr) >= Math.abs(dc)) {
    return dr > 0 ? 'down' : 'up'
  } else {
    return dc > 0 ? 'right' : 'left'
  }
}

export function positionsInRange(
  center: Position,
  rangePattern: number[][],
  rows: number,
  cols: number,
  facing?: Direction,
): Position[] {
  const pattern = facing ? rotatePattern(rangePattern, facing) : rangePattern
  const result: Position[] = []
  for (const [dr, dc] of pattern) {
    const r = center.row + dr
    const c = center.col + dc
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      result.push({ row: r, col: c })
    }
  }
  return result
}

export const RANGE_PATTERNS: Record<string, number[][]> = {
  selfOnly: [[0, 0]],
  meleeFront: [[-1, 0], [0, 0]],
  ranged4x3: (() => {
    const tiles: number[][] = []
    for (let r = -3; r <= 0; r++) {
      for (let c = -1; c <= 1; c++) {
        tiles.push([r, c])
      }
    }
    return tiles
  })(),
}
