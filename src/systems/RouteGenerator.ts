import { TileType } from '../types/index'
import { Position, getNeighbors, positionsEqual } from '../shared/utils/GridMath'

export function generateRoute(
  tiles: TileType[][],
  spawn: Position,
  goal: Position,
  rows: number,
  cols: number,
): Position[] {
  const wallSet = new Set<string>()
  const routeSet = new Set<string>()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`
      if (tiles[r][c] === TileType.Wall) wallSet.add(key)
      if (tiles[r][c] === TileType.Route) routeSet.add(key)
    }
  }

  if (routeSet.size === 0) return []

  const visited = new Set<string>()
  const queue: { pos: Position; path: Position[] }[] = [{ pos: spawn, path: [spawn] }]
  visited.add(`${spawn.row},${spawn.col}`)

  while (queue.length > 0) {
    const current = queue.shift()!
    if (positionsEqual(current.pos, goal)) {
      return current.path
    }
    const neighbors = getNeighbors(current.pos, rows, cols, true)
    for (const n of neighbors) {
      const key = `${n.row},${n.col}`
      if (visited.has(key)) continue
      if (wallSet.has(key)) continue
      if (!routeSet.has(key) && !positionsEqual(n, spawn) && !positionsEqual(n, goal)) continue
      visited.add(key)
      queue.push({ pos: n, path: [...current.path, n] })
    }
  }

  return []
}
