import { describe, it, expect, beforeEach } from 'vitest'
import { DeploymentSystem } from './DeploymentSystem'
import { UnitConfig, TileType, UnitTrait } from '../types/index'

const mockGrid = {
  getTile: () => ({ type: TileType.Ground, row: 0, col: 0 }),
} as any

const makeUnit = (overrides: Partial<UnitConfig> = {}): UnitConfig => ({
  id: 'test_unit',
  name: 'Test Unit',
  subtypeLabel: 'Test',
  archetype: 'soldier',
  type: 'ground',
  hp: 1000,
  atk: 200,
  def: 100,
  res: 0,
  blockCount: 1,
  dpCost: 10,
  redeployTime: 10,
  attackInterval: 1.0,
  rangePattern: [[-1, 0], [0, 0]],
  damageType: 'kinetic',
  color: 0x4444ff,
  traits: [],
  ...overrides,
})

describe('DeploymentSystem', () => {
  let ds: DeploymentSystem
  let unit: UnitConfig

  beforeEach(() => {
    ds = new DeploymentSystem(mockGrid, 30, 1, 99, 8)
    unit = makeUnit()
  })

  describe('getCurrentCost', () => {
    it('returns base cost when no multiplier', () => {
      expect(ds.getCurrentCost(0, unit)).toBe(10)
    })

    it('applies cost multiplier', () => {
      ds.deployCostMultiplier.set(0, 1.5)
      expect(ds.getCurrentCost(0, unit)).toBe(15)
    })

    it('caps at 2.0 multiplier', () => {
      ds.deployCostMultiplier.set(0, 2.0)
      expect(ds.getCurrentCost(0, unit)).toBe(20)
    })

    it('different instanceIds have independent costs', () => {
      ds.deployCostMultiplier.set(0, 1.5)
      ds.deployCostMultiplier.set(1, 2.0)
      expect(ds.getCurrentCost(0, unit)).toBe(15)
      expect(ds.getCurrentCost(1, unit)).toBe(20)
    })

    it('unset instanceId uses base cost', () => {
      expect(ds.getCurrentCost(99, unit)).toBe(10)
    })
  })

  describe('isOnCooldown / getCooldownRemaining', () => {
    it('returns false when no cooldown', () => {
      expect(ds.isOnCooldown(0)).toBe(false)
      expect(ds.getCooldownRemaining(0)).toBe(0)
    })

    it('returns true when cooldown active', () => {
      ds.redeployTimers.set(0, 5.0)
      expect(ds.isOnCooldown(0)).toBe(true)
      expect(ds.getCooldownRemaining(0)).toBe(5.0)
    })

    it('different instanceIds have independent cooldowns', () => {
      ds.redeployTimers.set(0, 3.0)
      expect(ds.isOnCooldown(0)).toBe(true)
      expect(ds.isOnCooldown(1)).toBe(false)
    })
  })

  describe('addDP', () => {
    it('adds DP up to cap', () => {
      ds.addDP(20)
      expect(ds.currentDP).toBe(50)
    })

    it('clamps at dpCap', () => {
      ds.addDP(200)
      expect(ds.currentDP).toBe(99)
    })
  })

  describe('removeUnit cost multiplier progression', () => {
    it('first removal sets multiplier to 1.5', () => {
      const instId = ds.removeUnit(0, 0)
      expect(instId).toBeUndefined()
    })

    it('second removal doubles from 1.5 to 2.0', () => {
      ds.deployCostMultiplier.set(0, 1.5)
      const instId = ds.removeUnit(0, 0)
      expect(instId).toBeUndefined()
    })

    it('starts cooldown on removal', () => {
      const deployed = ds.deployUnit(unit, 0, 0, 'up', 0)
      expect(deployed).not.toBeNull()
      ds.removeUnit(0, 0)
      expect(ds.redeployTimers.has(0)).toBe(true)
      expect(ds.getCooldownRemaining(0)).toBe(10)
    })
  })

  describe('updateTimers', () => {
    it('reduces cooldown over time', () => {
      ds.redeployTimers.set(0, 5.0)
      ds.updateTimers(2.0)
      expect(ds.getCooldownRemaining(0)).toBe(3.0)
    })

    it('clears cooldown when expired', () => {
      ds.redeployTimers.set(0, 1.0)
      ds.updateTimers(1.5)
      expect(ds.isOnCooldown(0)).toBe(false)
    })

    it('handles multiple instanceIds', () => {
      ds.redeployTimers.set(0, 5.0)
      ds.redeployTimers.set(1, 3.0)
      ds.updateTimers(2.0)
      expect(ds.getCooldownRemaining(0)).toBe(3.0)
      expect(ds.getCooldownRemaining(1)).toBe(1.0)
    })
  })

  describe('update DP regen', () => {
    it('gains DP over time', () => {
      ds.update(2.0) // 2 seconds at 1/sec
      expect(ds.currentDP).toBe(32)
    })

    it('respects dpCap', () => {
      ds.currentDP = 98
      ds.update(3.0)
      expect(ds.currentDP).toBe(99)
    })
  })

  describe('deployUnit', () => {
    it('deploys unit and deducts DP', () => {
      const deployed = ds.deployUnit(unit, 0, 0, 'up', 0)
      expect(deployed).not.toBeNull()
      expect(deployed!.config.id).toBe('test_unit')
      expect(ds.currentDP).toBe(20) // 30 - 10
    })

    it('returns null if already occupied', () => {
      ds.deployUnit(unit, 0, 0, 'up', 0)
      const second = ds.deployUnit(unit, 0, 0, 'up', 1)
      expect(second).toBeNull()
    })

    it('returns null if not enough DP', () => {
      ds.currentDP = 5
      const deployed = ds.deployUnit(unit, 0, 0, 'up', 0)
      expect(deployed).toBeNull()
    })

    it('respects deployment limit', () => {
      ds.deploymentLimit = 1
      ds.deployUnit(unit, 0, 0, 'up', 0)
      const second = ds.deployUnit(unit, 1, 0, 'up', 1)
      expect(second).toBeNull()
    })
  })

  describe('retreatUnit', () => {
    it('refunds half DP cost', () => {
      ds.deployUnit(unit, 0, 0, 'up', 0)
      const refund = ds.retreatUnit(0, 0)
      expect(refund).toBe(5) // half of 10
    })

    it('returns 0 if no unit at position', () => {
      expect(ds.retreatUnit(99, 99)).toBe(0)
    })

    it('FullRefundRetreat trait gives full refund', () => {
      const unitWithRefund = makeUnit({ traits: [{ traitId: UnitTrait.FullRefundRetreat }] })
      ds.deployUnit(unitWithRefund, 0, 0, 'up', 0)
      const refund = ds.retreatUnit(0, 0)
      expect(refund).toBe(10)
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      ds.deployUnit(unit, 0, 0, 'up', 0)
      ds.redeployTimers.set(0, 5.0)
      ds.reset(10, 2, 50, 6)
      expect(ds.currentDP).toBe(10)
      expect(ds.dpRegenRate).toBe(2)
      expect(ds.dpCap).toBe(50)
      expect(ds.deploymentLimit).toBe(6)
      expect(ds.activeUnits.size).toBe(0)
      expect(ds.redeployTimers.size).toBe(0)
      expect(ds.deployCostMultiplier.size).toBe(0)
    })
  })
})
