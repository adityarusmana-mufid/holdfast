import { LevelData, TileType } from '../../types/index'
import { ENEMY_CONFIGS } from '../../config/enemies'

const VALID_TYPES = new Set(Object.values(TileType))
// Shipped level JSON predates the internal TileType names. Grid migrates these
// values at load time, so validation must accept the serialized representation.
const SERIALIZED_TILE_TYPES = new Set(['deploy_ground', 'deploy_ranged', 'route'])

export interface ValidationError {
  field: string
  message: string
}

export function validateLevelData(data: LevelData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.name || typeof data.name !== 'string')
    errors.push({ field: 'name', message: 'missing or invalid name' })

  if (!Number.isInteger(data.cols) || data.cols < 1)
    errors.push({ field: 'cols', message: 'must be positive integer' })

  if (!Number.isInteger(data.rows) || data.rows < 1)
    errors.push({ field: 'rows', message: 'must be positive integer' })

  if (!Array.isArray(data.tiles) || data.tiles.length !== data.rows)
    errors.push({ field: 'tiles', message: `expected ${data.rows} rows, got ${data.tiles?.length}` })
  else {
    let spawnCount = 0
    let goalCount = 0
    for (let r = 0; r < data.tiles.length; r++) {
      const row = data.tiles[r]
      if (!Array.isArray(row) || row.length !== data.cols) {
        errors.push({ field: 'tiles', message: `row ${r}: expected ${data.cols} cols, got ${row?.length}` })
        continue
      }
      for (let c = 0; c < row.length; c++) {
        const tile = row[c]
        if (!tile || tile.row !== r || tile.col !== c)
          errors.push({ field: 'tiles', message: `(${r},${c}): row/col mismatch` })
        if (!VALID_TYPES.has(tile.type) && !SERIALIZED_TILE_TYPES.has(tile.type))
          errors.push({ field: 'tiles', message: `(${r},${c}): invalid type ${tile.type}` })
        if (tile.type === 'spawn') spawnCount++
        if (tile.type === 'goal') goalCount++
      }
    }
    if (spawnCount === 0) errors.push({ field: 'tiles', message: 'no spawn tile' })
    if (goalCount === 0) errors.push({ field: 'tiles', message: 'no goal tile' })
  }

  if (!Array.isArray(data.routes) || data.routes.length === 0)
    errors.push({ field: 'routes', message: 'must have at least one route' })
  else {
    for (let i = 0; i < data.routes.length; i++) {
      const route = data.routes[i]
      if (!Array.isArray(route.waypoints) || route.waypoints.length < 2)
        errors.push({ field: 'routes', message: `route ${i}: need >=2 waypoints` })
      else {
        for (let w = 0; w < route.waypoints.length; w++) {
          const wp = route.waypoints[w]
          if (wp.row < 0 || wp.row >= data.rows || wp.col < 0 || wp.col >= data.cols)
            errors.push({ field: 'routes', message: `route ${i} waypoint ${w} out of bounds` })
        }
        for (let w = 1; w < route.waypoints.length; w++) {
          const dr = Math.abs(route.waypoints[w].row - route.waypoints[w - 1].row)
          const dc = Math.abs(route.waypoints[w].col - route.waypoints[w - 1].col)
          if (dr + dc !== 1)
            errors.push({ field: 'routes', message: `route ${i} waypoints ${w - 1}-${w} not adjacent` })
        }
      }
    }
  }

  if (!Array.isArray(data.waves) || data.waves.length === 0)
    errors.push({ field: 'waves', message: 'must have at least one wave' })
  else {
    for (let i = 0; i < data.waves.length; i++) {
      const wave = data.waves[i]
      if (wave.routeIndex === undefined || wave.routeIndex < 0)
        errors.push({ field: 'waves', message: `wave ${i}: missing or invalid routeIndex` })
      if (!Array.isArray(wave.entries) || wave.entries.length === 0)
        errors.push({ field: 'waves', message: `wave ${i}: no entries` })
      else {
        for (let j = 0; j < wave.entries.length; j++) {
          const entry = wave.entries[j]
          if (!ENEMY_CONFIGS.find(e => e.id === entry.enemyType))
            errors.push({ field: 'waves', message: `wave ${i} entry ${j}: unknown enemy ${entry.enemyType}` })
          if (entry.count < 1)
            errors.push({ field: 'waves', message: `wave ${i} entry ${j}: count < 1` })
          if (entry.spawnInterval <= 0)
            errors.push({ field: 'waves', message: `wave ${i} entry ${j}: spawnInterval <= 0` })
        }
      }
    }
  }

  return errors
}
