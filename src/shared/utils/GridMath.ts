import { TileType } from '../../types/index'

export interface Position {
  row: number
  col: number
}

export function tileColor(type: TileType): number {
  switch (type) {
    case TileType.Floor: return 0xebeff5
    case TileType.Wall: return 0xd5dbe3
    case TileType.Route: return 0xdce3ed
    case TileType.Spawn: return 0xf5d4d4
    case TileType.Goal: return 0xd4f5de
    case TileType.DeployGround: return 0xd4edda
    case TileType.DeployRanged: return 0xd4e4ed
  }
}

export function tileBorderColor(type: TileType): number {
  switch (type) {
    case TileType.Spawn: return 0xd32f2f
    case TileType.Goal: return 0x00c853
    case TileType.Route: return 0xb0bec5
    default: return 0xcfd8dc
  }
}

export function tileTextColor(type: TileType): string {
  switch (type) {
    case TileType.Wall: return '#8a8a9a'
    case TileType.DeployGround: return '#4caf50'
    case TileType.DeployRanged: return '#2196f3'
    case TileType.Spawn: return '#d32f2f'
    case TileType.Goal: return '#00c853'
    default: return '#8a8a9a'
  }
}

export function tileLabel(type: TileType): string {
  switch (type) {
    case TileType.Floor: return ''
    case TileType.Wall: return 'W'
    case TileType.Route: return ''
    case TileType.Spawn: return 'S'
    case TileType.Goal: return 'G'
    case TileType.DeployGround: return 'G'
    case TileType.DeployRanged: return 'R'
  }
}

export function isDeployable(type: TileType): boolean {
  return type === TileType.DeployGround || type === TileType.DeployRanged || type === TileType.Route
}

export function isWalkable(type: TileType): boolean {
  return type === TileType.Route
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

export function positionsInRange(
  center: Position,
  rangePattern: number[][],
  rows: number,
  cols: number,
): Position[] {
  const result: Position[] = []
  for (const [dr, dc] of rangePattern) {
    const r = center.row + dr
    const c = center.col + dc
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      result.push({ row: r, col: c })
    }
  }
  return result
}

export const RANGE_PATTERNS: Record<string, number[][]> = {
  melee: [[0, 0]],
  cross1: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
  cross2: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]],
  square1: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
  diamond2: [
    [0, 0],
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-2, 0], [2, 0], [0, -2], [0, 2],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ],
}
