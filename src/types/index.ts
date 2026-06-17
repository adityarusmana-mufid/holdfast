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
export type DamageType = 'kinetic' | 'thermal' | 'true'

export enum UnitTrait {
  BlocksTwo = 'blocks_two',
  BlocksThree = 'blocks_three',
  DPOnKill = 'dp_on_kill',
  FullRefundRetreat = 'full_refund_retreat',
  RangedAttack80 = 'ranged_attack_80',
  AoESplash = 'aoe_splash',
  ArtsDamage = 'arts_damage',
  FastAttack = 'fast_attack',
  DoubleHit = 'double_hit',
  HealOnAttack = 'heal_on_attack',
  HealPerHitCapped = 'heal_per_hit_capped',
  CannotBeHealed = 'cannot_be_healed',
  SlowOnHit = 'slow_on_hit',
  ChainJump = 'chain_jump',
  LinearAoE = 'linear_aoe',
  TargetingLowestDef = 'targeting_lowest_def',
  RangedWhenNotBlocking = 'ranged_when_not_blocking',
  RangedAoEWhenNotBlocking = 'ranged_aoe_when_not_blocking',
  ConditionalDamage120 = 'conditional_damage_120',
  TakesTrueDamage = 'takes_true_damage',
  HealAlly = 'heal_ally',
  AttackHealsAlly = 'attack_heals_ally',
  AoEHoT = 'aoe_hot',
  LongRangeAttack = 'long_range_attack',
  PassiveDPRegen = 'passive_dp_regen',
}

export interface UnitTraitConfig {
  traitId: UnitTrait
  value?: number
  duration?: number
  radius?: number
  maxTargets?: number
  damageFalloff?: number
  damageMultiplier?: number
}

export interface StatusEffect {
  type: 'slow'
  remainingDuration: number
  factor: number
}

export interface SplashConfig {
  radius: number
  damageMultiplier: number
  damageType?: DamageType
}

export interface UnitConfig {
  id: string
  name: string
  archetype: string
  subtypeLabel: string
  type: 'ground' | 'ranged'
  hp: number
  atk: number
  def: number
  insulation: number
  damageType: DamageType
  attackInterval: number
  rangePattern: number[][]
  altRangePattern?: number[][]
  blockCount: number
  dpCost: number
  redeployTime: number
  color: number
  traits: UnitTraitConfig[]
  splashConfig?: SplashConfig
  canBeHealed?: boolean
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
  dpCostPaid: number
  lastAttackTime: number
  blocking: number[]
  facing: Direction
}
