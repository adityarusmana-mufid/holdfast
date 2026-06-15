import { LevelData } from '../types/index'

export const TEST_LEVEL: LevelData = {
  name: 'Combat Test',
  cols: 12,
  rows: 8,
  tiles: (() => {
    const tiles: LevelData['tiles'] = []
    for (let r = 0; r < 8; r++) {
      const row: LevelData['tiles'][number] = []
      for (let c = 0; c < 12; c++) {
        let type: string = 'floor'
        if (r === 0 || r === 7 || c === 0 || c === 11) {
          type = 'floor'
        } else if (r === 3) {
          type = 'route'
          if (c === 0) type = 'spawn'
          if (c === 11) type = 'goal'
        } else if (r >= 1 && r <= 2 && c >= 1 && c <= 10) {
          type = 'deploy_ranged'
        } else if (r >= 4 && r <= 5 && c >= 1 && c <= 10) {
          type = 'deploy_ranged'
        }
        row.push({ row: r, col: c, type: type as any })
      }
      tiles.push(row)
    }
    return tiles
  })(),
  waypoints: (() => {
    const wps: { row: number; col: number }[] = []
    for (let c = 1; c <= 10; c++) {
      wps.push({ row: 3, col: c })
    }
    return wps
  })(),
  waves: [
    {
      entries: [
        { enemyType: 'soldier', count: 6, spawnInterval: 1 },
      ],
      preludeDuration: 3,
    },
    {
      entries: [
        { enemyType: 'trooper', count: 3, spawnInterval: 2 },
      ],
      preludeDuration: 8,
    },
    {
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
