export interface Tile {
  row: number
  col: number
  type: TileType
}

export enum TileType {
  Ground = 'ground',
  Floor = 'floor',
  Ranged = 'ranged',
  Wall = 'wall',
  Spawn = 'spawn',
  Goal = 'goal',
}

export interface Position {
  row: number
  col: number
}

export interface Waypoint {
  row: number
  col: number
  pauseDuration?: number
}

export interface Route {
  color: number
  spawn: Position
  goal: Position
  waypoints: Waypoint[]
}

export interface WaveEntry {
  enemyType: string
  count: number
  spawnInterval: number
}

export interface Wave {
  routeIndex: number
  entries: WaveEntry[]
  preludeDuration: number
}

export interface LevelData {
  name: string
  cols: number
  rows: number
  tiles: Tile[][]
  routes: Route[]
  waves: Wave[]
  startingDP: number
  dpRegenRate: number
  dpCap: number
  deploymentLimit: number
  lives: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'
export type DamageType = 'kinetic' | 'thermal'

export interface UnitConfig {
  id: string
  name: string
  type: 'ground' | 'ranged'
  hp: number
  atk: number
  def: number
  damageType: DamageType
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
  armor: number
  insulation: number
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
  blocking: number[]
  facing: Direction
}
