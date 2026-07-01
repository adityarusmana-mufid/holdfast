import { Direction, TileType, Position, Route, FlowDirection, Tile } from '../../types/index'

export const ROUTE_COLORS = [
  0xff4444, 0x4488ff, 0x44dd44, 0xffaa00,
  0xcc44ff, 0x00cccc, 0xff66aa, 0x888888,
]

export function tileColor(type: TileType): number {
  switch (type) {
    case TileType.Ground: return 0xb0b8c4
    case TileType.Floor: return 0x5a5a5a
    case TileType.Ranged: return 0xd4d8dc
    case TileType.Wall: return 0x1a1a1a
    case TileType.Spawn: return 0xcc4444
    case TileType.Goal: return 0x4444cc
    case TileType.RepairNode: return 0xb0b8c4
    case TileType.ArmorGrid: return 0xb0b8c4
    case TileType.StnGen: return 0xffd700
    case TileType.Hole: return 0x1a0030
    default: return 0xb0b8c4
  }
}

export function tileBorderColor(type: TileType): number {
  switch (type) {
    case TileType.Ground: return 0x555555
    case TileType.Floor: return 0x7a7a7a
    case TileType.Ranged: return 0xffa000
    case TileType.Wall: return 0x333333
    case TileType.Spawn: return 0xff6666
    case TileType.Goal: return 0x6666ff
    case TileType.RepairNode: return 0x44cc55
    case TileType.ArmorGrid: return 0x4488cc
    case TileType.StnGen: return 0xff8f00
    case TileType.Hole: return 0x000000
    default: return 0x555555
  }
}

export function tileTextColor(type: TileType): string {
  switch (type) {
    case TileType.Spawn: return '#ff6666'
    case TileType.Goal: return '#6666ff'
    case TileType.RepairNode: return '#44cc55'
    case TileType.ArmorGrid: return '#4488cc'
    default: return '#888888'
  }
}

export function tileLabel(_type: TileType): string {
  return ''
}

export function isDeployable(type: TileType): boolean {
  return type === TileType.Ground || type === TileType.Ranged || type === TileType.RepairNode || type === TileType.ArmorGrid
}

export function isStnGen(type: TileType): boolean {
  return type === TileType.StnGen
}

export function isHole(type: TileType): boolean {
  return type === TileType.Hole
}

export function isWalkable(type: TileType): boolean {
  return type === TileType.Floor || type === TileType.Spawn || type === TileType.Goal ||
    type === TileType.RepairNode || type === TileType.ArmorGrid || type === TileType.Hole
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
  }).map(([r, c]) => [r + 0, c + 0])
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
  meleeWide3: [[-1, -1], [-1, 0], [-1, 1], [0, 0]],
  ranged4x3: (() => {
    const tiles: number[][] = []
    for (let r = -3; r <= 0; r++) {
      for (let c = -1; c <= 1; c++) {
        tiles.push([r, c])
      }
    }
    return tiles
  })(),
  pointBlank: [[-1, 0]],
  line4: [[-1, 0], [-2, 0], [-3, 0], [-4, 0]],
  // Fortress Defender: self tile + 3×2 block at distance 3-4 + 1×1 extension at distance 5
  // (matches wiki: 2×2 minimum range gap, 2×3 ahead, 1×1 extension at E2)
  fortressRanged: [[-5, 0], [-4, -1], [-4, 0], [-4, 1], [-3, -1], [-3, 0], [-3, 1], [0, 0]],
  // Sentry Protector: self tile + 2 tiles ahead (long-range melee hybrid)
  sentryRanged: [[-2, 0], [-1, 0], [0, 0]],
  meleeCross: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
  meleeExtended: [[-2, -1], [-2, 0], [-2, 1], [-1, -1], [-1, 0], [-1, 1], [0, 0]],
  surrounding8: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
  ranged5x3: (() => {
    const tiles: number[][] = []
    for (let r = -4; r <= 0; r++) {
      for (let c = 0; c <= 2; c++) {
        tiles.push([r, c])
      }
    }
    return tiles
  })(),
  // ponytail: Core Caster — 3-wide × 4-deep rectangle. Unit at back-center, range extends forward.
  coreCaster: [
    [-3, 0],
    [-2, -1], [-2, 0], [-2, 1],
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 0], [0, 1],
  ],
  // ponytail: Bard — diamond shape, range 2 in all directions. 13 tiles total (incl. unit).
  bard: [
    [-2, 0],
    [-1, -1], [-1, 0], [-1, 1],
    [0, -2], [0, -1], [0, 0], [0, 1], [0, 2],
    [1, -1], [1, 0], [1, 1],
    [2, 0],
  ],
deadeyeCross: [
    [0, -2], [0, -1], [0, 0], [0, 1], [0, 2],
    [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2],
    [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2],
    [-3, -1], [-3, 0], [-3, 1],
    [-4, 0],
  ],
}

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`
}

export function keyToPos(key: string): Position {
  const [row, col] = key.split(',').map(Number)
  return { row, col }
}

export function directionToPos(dir: FlowDirection, from: Position): Position {
  switch (dir) {
    case 'up':    return { row: from.row - 1, col: from.col }
    case 'down':  return { row: from.row + 1, col: from.col }
    case 'left':  return { row: from.row, col: from.col - 1 }
    case 'right': return { row: from.row, col: from.col + 1 }
    default:      return from
  }
}

export function posToDirection(from: Position, to: Position): FlowDirection {
  const dr = to.row - from.row
  const dc = to.col - from.col
  if (dr === -1 && dc === 0) return 'up'
  if (dr === 1 && dc === 0) return 'down'
  if (dr === 0 && dc === -1) return 'left'
  if (dr === 0 && dc === 1) return 'right'
  return null
}

export interface FlowFieldResult {
  directions: Map<string, FlowDirection>
  reachable: Set<string>
}

export function computeFlowFieldToRoute(
  routes: Route[],
  grid: Tile[][],
  blockedTiles: Set<string>,
  rows: number,
  cols: number
): FlowFieldResult {
  const directions = new Map<string, FlowDirection>()
  const reachable = new Set<string>()
  const queue: Position[] = []

  for (const route of routes) {
    const waypoints = [route.spawn, ...route.waypoints, route.goal]
    for (const wp of waypoints) {
      const key = posKey(wp)
      if (!blockedTiles.has(key)) {
        directions.set(key, null)
        reachable.add(key)
        queue.push({ row: wp.row, col: wp.col })
      }
    }
  }

  while (queue.length > 0) {
    const pos = queue.shift()!
    const key = posKey(pos)
    const currentDir = directions.get(key)

    const neighbors = getNeighbors(pos, rows, cols, false)
    for (const nb of neighbors) {
      const nbKey = posKey(nb)
      if (blockedTiles.has(nbKey)) continue
      if (directions.has(nbKey)) continue

      const tile = grid[nb.row]?.[nb.col]
      if (!tile || !isWalkable(tile.type)) continue

      const dirToCurrent = posToDirection(nb, pos)
      if (dirToCurrent) {
        directions.set(nbKey, dirToCurrent)
        reachable.add(nbKey)
        queue.push(nb)
      }
    }
  }

  return { directions, reachable }
}
