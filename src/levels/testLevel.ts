import { LevelData, TileType } from '../types/index'

export const TEST_LEVEL: LevelData = {
  name: 'Combat Test',
  cols: 12,
  rows: 8,
  tiles: (() => {
    const tiles: LevelData['tiles'] = []
    for (let r = 0; r < 8; r++) {
      const row: LevelData['tiles'][number] = []
      for (let c = 0; c < 12; c++) {
        let type = TileType.Ground
        if (r === 0 || r === 7 || c === 0 || c === 11) {
          type = TileType.Wall
        } else if (r === 3) {
          if (c === 1) type = TileType.Spawn
          else if (c === 10) type = TileType.Goal
          else type = TileType.Ground
        } else if (r >= 1 && r <= 2 && c >= 1 && c <= 10) {
          type = TileType.Ranged
        } else if (r >= 4 && r <= 5 && c >= 1 && c <= 10) {
          type = TileType.Ranged
        }
        row.push({ row: r, col: c, type })
      }
      tiles.push(row)
    }
    return tiles
  })(),
  routes: [
    {
      color: 0xff4444,
      spawn: { row: 3, col: 1 },
      goal: { row: 3, col: 10 },
      waypoints: (() => {
        const wps = []
        for (let c = 2; c <= 9; c++) {
          wps.push({ row: 3, col: c })
        }
        return wps
      })(),
    },
  ],
  waves: [
    {
      routeIndex: 0,
      entries: [
        { enemyType: 'soldier', count: 6, spawnInterval: 1 },
      ],
      preludeDuration: 3,
    },
    {
      routeIndex: 0,
      entries: [
        { enemyType: 'trooper', count: 3, spawnInterval: 2 },
      ],
      preludeDuration: 8,
    },
    {
      routeIndex: 0,
      entries: [
        { enemyType: 'heavy', count: 2, spawnInterval: 3 },
      ],
      preludeDuration: 8,
    },
  ],
  startingDP: 30,
  dpRegenRate: 1,
  dpCap: 99,
  deploymentLimit: 8,
  lives: 10,
}
