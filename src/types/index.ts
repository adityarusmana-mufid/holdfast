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
  RepairNode = 'repair_node',
  ArmorGrid = 'armor_grid',
  StnGen = 'stn_gen',
  Hole = 'hole',
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
  tutorial?: boolean
  guideText?: string[]
}

export type Direction = 'up' | 'down' | 'left' | 'right'
export type DamageType = 'kinetic' | 'thermal' | 'true'

export enum UnitTrait {
  BlocksTwo = 'blocks_two',
  BlocksThree = 'blocks_three',
  DPOnKill = 'dp_on_kill',
  FullRefundRetreat = 'full_refund_retreat',
  RangedAttack80 = 'ranged_attack_80',
  RangedAttack120 = 'ranged_attack_120',
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
  AoEMelee = 'aoe_melee',
  AoEMeleeBlockCapped = 'aoe_melee_block_capped',
  TargetingLowestDef = 'targeting_lowest_def',
  TargetingAerial = 'targeting_aerial',
  RangedWhenNotBlocking = 'ranged_when_not_blocking',
  RangedAoEWhenNotBlocking = 'ranged_aoe_when_not_blocking',
  SpreadAttack = 'spread_attack',
  ConditionalDamage120 = 'conditional_damage_120',
  TakesTrueDamage = 'takes_true_damage',
  HealAlly = 'heal_ally',
  HealMulti = 'heal_multi',
  ChainHeal = 'chain_heal',
  AttackHealsAlly = 'attack_heals_ally',
  AoEHoT = 'aoe_hot',
  LongRangeAttack = 'long_range_attack',
  PassiveDPRegen = 'passive_dp_regen',
  DeployAnywhere = 'deploy_anywhere',
  DroneRamp = 'drone_ramp',
}

export interface UnitTraitConfig {
  traitId: UnitTrait
  value?: number
  duration?: number
  radius?: number
  maxTargets?: number
  damageFalloff?: number
  healFalloff?: number
  damageMultiplier?: number
  rampBasePercent?: number
  rampIncrement?: number
  rampMaxPercent?: number
}

export type StatusEffectType = 'slow' | 'stun' | 'root'

export interface StatusEffect {
  type: StatusEffectType
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
  res: number
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
  skills: SkillConfig[]
}

export type EnemyBehavior =
  | { type: 'standard' }
  | { type: 'exploder'; explosionDamage: number; explosionRadius: number; damageType: DamageType }
  | { type: 'stealth'; detectionRange: number }
  | { type: 'healer'; healAmount: number; healInterval: number; healRange: number }
  | { type: 'buffer'; buffAtk: number; buffRange: number }
  | { type: 'shielded'; shieldHp: number }
  | { type: 'summoner'; spawnType: string; spawnInterval: number; spawnCount: number }

export interface EnemyConfig {
  id: string
  name: string
  hp: number
  atk: number
  armor: number
  res: number
  speed: number
  color: number
  dpOnKill: number
  attackInterval: number
  damageType: DamageType
  isAerial?: boolean
  attackRange?: number
  description?: string
  behavior: EnemyBehavior
}

export type SpRecoveryType = 'auto' | 'offensive' | 'defensive'
export type SkillActivationType = 'auto' | 'manual' | 'toggle' | 'passive'
export type SkillDurationType = 'instant' | 'duration' | 'toggle' | 'unlimited' | 'ammunition'

export type SkillEffect =
  | { type: 'generateDP'; amount: number }
  | { type: 'enhanceAttack'; atkMultiplier?: number; hitCount?: number; aspdBonus?: number;
      trueDamage?: boolean; splash?: { radius: number; damageMultiplier: number };
      defIgnore?: number; targetCount?: number; binds?: boolean; slowFactor?: number }
  | { type: 'statBuff'; atkMultiplier?: number; defMultiplier?: number; aspdBonus?: number;
      blockBonus?: number; hpRegenPerSecond?: number | { percent: number };
      healOnAttackMultiplier?: number }
  | { type: 'heal'; amountMultiplier?: number; isPercent?: boolean; targetCount?: number;
      range?: 'self' | 'ally' | 'allies' }
  | { type: 'aoeAttack'; radius: number; damageMultiplier: number; damageType?: DamageType }
  | { type: 'buffAlly'; atkMultiplier?: number; defMultiplier?: number; aspdBonus?: number;
      hpRegen?: number; duration: number }
  | { type: 'debuffEnemies'; slowFactor?: number; duration: number; fragile?: number; radius?: number }
  | { type: 'statToggle'; defMultiplier?: number; atkMultiplier?: number;
      blockBonus?: number; attackAllBlocked?: boolean; hpRegenPerSecond?: number | { percent: number };
      meleeOnly?: boolean }
  | { type: 'survival'; minHp?: boolean; shieldPercent?: number; duration?: number }
  | { type: 'special'; description: string }
  | { type: 'displace'; direction: 'away' | 'toward'; tiles: number; radius: number }

export interface SkillConfig {
  id: string
  name: string
  description: string
  spRecovery: SpRecoveryType
  activation: SkillActivationType
  spCost: number
  spInitial: number
  durationType: SkillDurationType
  duration?: number
  charges?: number
  effect: SkillEffect
  skillRangePattern?: number[][]
}

export interface SkillState {
  config: SkillConfig
  currentSp: number
  isActive: boolean
  remainingDuration: number
  charges: number
  spLocked: boolean
}

export interface DeployedUnit {
  config: UnitConfig
  instanceId: number
  row: number
  col: number
  currentHp: number
  dpCostPaid: number
  lastAttackTime: number
  blocking: number[]
  facing: Direction
  skillState?: SkillState
  effectiveBlockCount?: number
  nextAttackPushStunWall?: boolean
  nextAttackPullArts?: boolean
  maelstromActive?: boolean
  maelstromCenter?: { row: number; col: number }
  maelstromEndTime?: number
}

export type FlowDirection = 'up' | 'down' | 'left' | 'right' | null

export type RouteMode = 'fixed' | 'dynamic'

export interface FlowField {
  directions: Map<string, FlowDirection>
  goalTiles: Position[]
  blockedTiles: Set<string>
}

export interface RouteState {
  mode: RouteMode
  flowField?: FlowField
  fixedRoutes?: Route[]
}
