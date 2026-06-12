export interface Tile {
  row: number
  col: number
  type: TileType
}

export enum TileType {
  Floor = 'floor',
  Wall = 'wall',
  Route = 'route',
  Spawn = 'spawn',
  Goal = 'goal',
  DeployGround = 'deploy_ground',
  DeployRanged = 'deploy_ranged',
}

export interface Waypoint {
  row: number
  col: number
}

export interface WaveEntry {
  enemyType: string
  count: number
  spawnInterval: number
}

export interface Wave {
  entries: WaveEntry[]
  preludeDuration: number
}

export interface LevelData {
  name: string
  cols: number
  rows: number
  tiles: Tile[][]
  waypoints: Waypoint[]
  waves: Wave[]
  startingDP: number
  dpRegenRate: number
  dpCap: number
  deploymentLimit: number
}

export interface UnitConfig {
  id: string
  name: string
  type: 'ground' | 'ranged'
  hp: number
  atk: number
  def: number
  attackInterval: number
  rangePattern: number[][]
  blockCount: number
  dpCost: number
  redeployTime: number
  color: number
}

export interface EnemyConfig {
  id: string
  name: string
  hp: number
  atk: number
  def: number
  speed: number
  color: number
  dpOnKill: number
}

export interface DeployedUnit {
  config: UnitConfig
  row: number
  col: number
  currentHp: number
  lastAttackTime: number
  blocking: string[]
}
