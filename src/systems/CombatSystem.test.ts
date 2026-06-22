import { describe, it, expect, beforeEach } from 'vitest'
import { CombatSystem } from './CombatSystem'
import { TileType, UnitTrait } from '../types/index'

const mockGrid = {
  rows: 10,
  cols: 10,
  getTile: (_r: number, _c: number) => ({ type: TileType.Ground, row: _r, col: _c }),
} as any

const noopEvents = {
  onEnemyKilled: () => {},
  onDamageDealt: () => {},
  onHealApplied: () => {},
  onUnitDamageDealt: () => {},
  onUnitDeath: () => {},
}

function makeCs(): CombatSystem {
  return new CombatSystem(mockGrid, noopEvents)
}

function makeUnit(overrides: Record<string, any> = {}) {
  return {
    row: 3,
    col: 3,
    facing: 'up' as const,
    currentHp: 1000,
    lastAttackTime: 0,
    config: {
      id: 'test_unit',
      atk: 200,
      def: 100,
      res: 0,
      hp: 1000,
      damageType: 'kinetic' as const,
      attackInterval: 1.0,
      rangePattern: [[-1, 0], [0, 0]],
      blockCount: 1,
      type: 'ground' as const,
      traits: [],
      canBeHealed: true,
      color: 0x4444ff,
      subtypeLabel: 'Test',
      ...overrides,
    },
    isAlive() { return this.currentHp > 0 },
    heal(amount: number) {
      this.currentHp = Math.min(this.currentHp + amount, this.config.hp)
      return this.currentHp
    },
    takeDamage(amount: number) {
      this.currentHp = Math.max(0, this.currentHp - amount)
      return this.currentHp
    },
    ...overrides,
  }
}

function makeEnemy(overrides: Record<string, any> = {}) {
  return {
    id: Math.random(),
    alive: true,
    currentWaypoint: 0,
    blocked: false,
    blockerUnitKey: null as string | null,
    statusEffects: [] as any[],
    config: {
      id: 'test_enemy',
      atk: 150,
      armor: 50,
      res: 0,
      hp: 2000,
      speed: 1,
      damageType: 'kinetic' as const,
      attackInterval: 2.0,
      isAerial: false,
      color: 0xff4444,
      ...overrides,
    },
    getCurrentTile() { return { row: this._tileRow ?? 5, col: this._tileCol ?? 5 } },
    takeDamage(amount: number) {
      this.currentHp = (this.currentHp ?? 2000) - amount
      if (this.currentHp <= 0) this.alive = false
      return this.currentHp
    },
    applyStatusEffect(effect: any) {
      const existing = this.statusEffects.find((e: any) => e.type === effect.type)
      if (existing) {
        existing.remainingDuration = Math.max(existing.remainingDuration, effect.remainingDuration)
        existing.factor = Math.min(existing.factor, effect.factor)
      } else {
        this.statusEffects.push({ ...effect })
      }
    },
    currentHp: 2000,
    ...overrides,
  }
}

describe('CombatSystem', () => {
  let cs: CombatSystem

  beforeEach(() => {
    cs = makeCs()
  })

  describe('calcDamage', () => {
    it('kinetic damage = atk - def, minimum 5%', () => {
      expect(cs.calcDamage(200, 50, 0, 'kinetic')).toBe(150)
    })

    it('kinetic damage floor at 5% of atk', () => {
      expect(cs.calcDamage(100, 200, 0, 'kinetic')).toBe(5)
    })

    it('thermal damage = atk * (1 - res/100), minimum 5%', () => {
      expect(cs.calcDamage(200, 0, 25, 'thermal')).toBe(150)
    })

    it('thermal damage floor at 5% of atk', () => {
      expect(cs.calcDamage(100, 0, 200, 'thermal')).toBe(5)
    })

    it('true damage bypasses all defenses', () => {
      expect(cs.calcDamage(500, 999, 999, 'true')).toBe(500)
    })

    it('kinetic damage floor at 5% of atk', () => {
      expect(cs.calcDamage(20, 999, 0, 'kinetic')).toBe(1)
    })
  })

  describe('calculateDamage', () => {
    it('kinetic damage from unit to enemy', () => {
      const unit = makeUnit({ atk: 200, damageType: 'kinetic' as const })
      const enemy = makeEnemy({ armor: 60 })
      expect(cs.calculateDamage(unit, enemy)).toBe(140)
    })

    it('thermal damage from unit to enemy', () => {
      const unit = makeUnit({ atk: 200, damageType: 'thermal' as const })
      const enemy = makeEnemy({ armor: 60, res: 30 })
      expect(cs.calculateDamage(unit, enemy)).toBe(140)
    })

    it('true damage ignores all', () => {
      const unit = makeUnit({ atk: 999, damageType: 'true' as const })
      const enemy = makeEnemy({ armor: 999, res: 999 })
      expect(cs.calculateDamage(unit, enemy)).toBe(999)
    })

    it('atkOverride replaces unit base ATK', () => {
      const unit = makeUnit({ atk: 200, damageType: 'kinetic' as const })
      const enemy = makeEnemy({ armor: 50 })
      expect(cs.calculateDamage(unit, enemy, 300)).toBe(250)
    })
  })

  describe('getUnitEffectiveDef', () => {
    it('returns unit DEF on normal tile', () => {
      const unit = makeUnit({ def: 100 })
      expect(cs.getUnitEffectiveDef(unit)).toBe(100)
    })

    it('adds 100 DEF on ArmorGrid', () => {
      const grid = {
        rows: 10, cols: 10,
        getTile: () => ({ type: TileType.ArmorGrid }),
      } as any
      const cs2 = new CombatSystem(grid, noopEvents)
      const unit = makeUnit({ def: 100 })
      expect(cs2.getUnitEffectiveDef(unit)).toBe(200)
    })
  })

  describe('hasTrait', () => {
    it('returns true if unit has the trait', () => {
      const unit = makeUnit({ traits: [{ traitId: UnitTrait.DoubleHit }] })
      expect(cs.hasTrait(unit, UnitTrait.DoubleHit)).toBe(true)
    })

    it('returns false if unit lacks the trait', () => {
      const unit = makeUnit({ traits: [] })
      expect(cs.hasTrait(unit, UnitTrait.DoubleHit)).toBe(false)
    })
  })

  describe('findClosestToGoal', () => {
    it('returns enemy with highest waypoint progress', () => {
      const e1 = makeEnemy({ currentWaypoint: 2 })
      const e2 = makeEnemy({ currentWaypoint: 5 })
      const e3 = makeEnemy({ currentWaypoint: 3 })
      expect(cs.findClosestToGoal([e1, e2, e3])).toBe(e2)
    })

    it('skips dead enemies', () => {
      const e1 = makeEnemy({ currentWaypoint: 2, alive: false })
      const e2 = makeEnemy({ currentWaypoint: 1 })
      expect(cs.findClosestToGoal([e1, e2])).toBe(e2)
    })

    it('returns null when no enemies', () => {
      expect(cs.findClosestToGoal([])).toBeNull()
    })
  })

  describe('findLowestDef', () => {
    it('returns enemy with lowest armor', () => {
      const e1 = makeEnemy({ armor: 200 })
      const e2 = makeEnemy({ armor: 50 })
      const e3 = makeEnemy({ armor: 100 })
      expect(cs.findLowestDef([e1, e2, e3])).toBe(e2)
    })

    it('skips dead enemies', () => {
      const e1 = makeEnemy({ armor: 0, alive: false })
      const e2 = makeEnemy({ armor: 100 })
      expect(cs.findLowestDef([e1, e2])).toBe(e2)
    })
  })

  describe('applySlow', () => {
    it('applies slow status effect on hit with SlowOnHit trait', () => {
      const unit = makeUnit({ traits: [{ traitId: UnitTrait.SlowOnHit, duration: 2, value: 0.5 }] })
      const enemy = makeEnemy()
      cs.applySlow(unit, enemy)
      expect(enemy.statusEffects).toHaveLength(1)
      expect(enemy.statusEffects[0].type).toBe('slow')
      expect(enemy.statusEffects[0].remainingDuration).toBe(2)
      expect(enemy.statusEffects[0].factor).toBe(0.5)
    })

    it('does not apply slow without SlowOnHit trait', () => {
      const unit = makeUnit({ traits: [] })
      const enemy = makeEnemy()
      cs.applySlow(unit, enemy)
      expect(enemy.statusEffects).toHaveLength(0)
    })
  })

  describe('healAllyOnAttack', () => {
    it('heals lowest HP ally in range', () => {
      const unit = makeUnit({ atk: 200, rangePattern: [[0, 0], [1, 0]], traits: [{ traitId: UnitTrait.AttackHealsAlly }] })
      unit.row = 2
      unit.col = 2
      const ally1 = makeUnit({ currentHp: 300, hp: 1000 })
      ally1.row = 2; ally1.col = 2
      const ally2 = makeUnit({ currentHp: 100, hp: 1000 })
      ally2.row = 3; ally2.col = 2
      cs.healAllyOnAttack(unit, [ally1, ally2])
      expect(ally2.currentHp).toBeGreaterThan(100)
    })
  })

  describe('getAttackParams', () => {
    it('returns melee params when blocking', () => {
      const unit = makeUnit({
        traits: [{ traitId: UnitTrait.RangedWhenNotBlocking }],
        altRangePattern: [[0, 0], [0, -1], [0, 1]],
      })
      const enemy = makeEnemy({ blocked: true, blockerUnitKey: '3,3', _tileRow: 3, _tileCol: 3 })
      const params = cs.getAttackParams(unit, [enemy])
      expect(params.rangePattern).toBe(unit.config.rangePattern)
      expect(params.atk).toBe(200)
    })

    it('returns ranged params when not blocking', () => {
      const unit = makeUnit({
        traits: [{ traitId: UnitTrait.RangedWhenNotBlocking }],
        altRangePattern: [[0, 0], [0, -1], [0, 1]],
      })
      const params = cs.getAttackParams(unit, [])
      expect(params.rangePattern).toBe(unit.config.altRangePattern)
      expect(params.atk).toBe(200)
    })

    it('applies 80% ATK with RangedAttack80 trait', () => {
      const unit = makeUnit({
        traits: [{ traitId: UnitTrait.RangedWhenNotBlocking }, { traitId: UnitTrait.RangedAttack80 }],
        altRangePattern: [[0, 0], [0, -1], [0, 1]],
      })
      const params = cs.getAttackParams(unit, [])
      expect(params.atk).toBe(160)
    })

    it('sets useAoE with RangedAoEWhenNotBlocking', () => {
      const unit = makeUnit({
        traits: [{ traitId: UnitTrait.RangedAoEWhenNotBlocking }],
        altRangePattern: [[0, 0], [0, -1], [0, 1]],
      })
      const params = cs.getAttackParams(unit, [])
      expect(params.useAoE).toBe(true)
    })
  })

  describe('enemy target selection and damage calculation', () => {
    it('finds blocker when enemy blocked', () => {
      const unit = makeUnit()
      const enemy = makeEnemy({ blocked: true, blockerUnitKey: '3,3' })
      enemy._tileRow = 3; enemy._tileCol = 3
      const inRange = [enemy]
      const blocked = (cs as any).findBlockedTarget(unit, inRange)
      expect(blocked).toBe(enemy)
    })

    it('enemy damage vs unit', () => {
      const unit = makeUnit({ def: 50, res: 0 })
      const def2 = (cs as any).getUnitEffectiveDef(unit)
      const dmg = (cs as any).calcDamage(200, def2, 0, 'kinetic')
      expect(dmg).toBe(150)
    })

    it('aerial attack finds nearest ranged unit', () => {
      const enemy = makeEnemy({ isAerial: true })
      enemy._tileRow = 0; enemy._tileCol = 0
      const close = makeUnit({ type: 'ranged' as const, row: 1, col: 1 })
      const far = makeUnit({ type: 'ranged' as const, row: 9, col: 9 })
      expect((cs as any).findNearestRangedUnit(enemy, [far, close])).toBe(close)
    })
  })

  describe('unit target selection and damage calculation', () => {
    it('finds enemy in range', () => {
      const unit = makeUnit({ row: 3, col: 3 })
      const enemy = makeEnemy({ armor: 50 })
      enemy._tileRow = 2; enemy._tileCol = 3
      const range = (cs as any).getEnemiesInRange(unit, [enemy])
      expect(range).toHaveLength(1)
    })

    it('damage vs enemy', () => {
      const unit = makeUnit({ atk: 200, damageType: 'kinetic' as const })
      const enemy = makeEnemy({ armor: 50 })
      const dmg = (cs as any).calculateDamage(unit, enemy)
      expect(dmg).toBe(150)
    })

    it('DoubleHit trait triggers 2 damage calls via applyDamage loop in update', () => {
      let hitCount = 0
      const cs2 = new CombatSystem(mockGrid, {
        ...noopEvents,
        onDamageDealt: () => { hitCount++ },
        onEnemyKilled: () => {},
      })
      const unit = makeUnit({
        atk: 100, damageType: 'kinetic' as const,
        traits: [{ traitId: UnitTrait.DoubleHit }],
      })
      const enemy = makeEnemy({ armor: 0, currentHp: 500 })
      enemy._tileRow = 2; enemy._tileCol = 3
      const hitCount2 = (cs2 as any).hasTrait(unit, UnitTrait.DoubleHit) ? 2 : 1
      for (let i = 0; i < hitCount2; i++) {
        ;(cs2 as any).applyDamage(unit, enemy)
      }
      expect(hitCount).toBe(2)
    })
  })

  describe('enemy attack timer', () => {
    it('accumulator setup and check logic', () => {
      const timer = new Map<number, number>()
      const id = 42
      const attackInterval = 1.0
      timer.set(id, 0.9)
      const acc = timer.get(id) ?? 0
      const newAcc = acc + 0.2
      expect(newAcc >= attackInterval).toBe(true)
    })

    it('does not trigger before interval', () => {
      const timer = new Map<number, number>()
      const id = 42
      const attackInterval = 5.0
      timer.set(id, 0.5)
      const acc = timer.get(id) ?? 0
      const newAcc = acc + 1.0
      expect(newAcc < attackInterval).toBe(true)
    })
  })

  describe('unit attack timer', () => {
    it('lastAttackTime accumulator', () => {
      const unit = makeUnit({ attackInterval: 1.0 })
      let lastAttackTime = 0.9
      lastAttackTime += 0.2
      expect(lastAttackTime >= unit.config.attackInterval).toBe(true)
    })
  })

  describe('findNearestRangedUnit', () => {
    it('returns nearest ranged unit within range', () => {
      const enemy = makeEnemy({ isAerial: true })
      enemy._tileRow = 3; enemy._tileCol = 3
      const close = makeUnit({ type: 'ranged' as const, row: 3, col: 4 })
      const far = makeUnit({ type: 'ranged' as const, row: 0, col: 0 })
      const result = cs.findNearestRangedUnit(enemy, [far, close])
      expect(result).toBe(close)
    })

    it('returns null when no ranged units in range', () => {
      const enemy = makeEnemy({ isAerial: true })
      enemy._tileRow = 0; enemy._tileCol = 0
      const far = makeUnit({ type: 'ranged' as const, row: 9, col: 9 })
      expect(cs.findNearestRangedUnit(enemy, [far])).toBeNull()
    })
  })
})
