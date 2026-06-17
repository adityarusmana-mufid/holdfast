import { Direction, UnitConfig, DeployedUnit, TileType, UnitTrait } from '../types/index'
import { Grid } from '../entities/Grid'

export class DeploymentSystem {
  currentDP: number
  dpRegenRate: number
  dpCap: number
  deploymentLimit: number
  activeUnits: Map<string, DeployedUnit>
  deployedUnitIds: Set<string>
  redeployTimers: Map<string, number>
  deployCostMultiplier: Map<string, number>
  private grid: Grid
  private dpAccumulator: number = 0

  constructor(grid: Grid, startingDP: number = 10, dpRegenRate: number = 1, dpCap: number = 99, deploymentLimit: number = 8) {
    this.grid = grid
    this.currentDP = startingDP
    this.dpRegenRate = dpRegenRate
    this.dpCap = dpCap
    this.deploymentLimit = deploymentLimit
    this.activeUnits = new Map()
    this.deployedUnitIds = new Set()
    this.redeployTimers = new Map()
    this.deployCostMultiplier = new Map()
  }

  getCurrentCost(unit: UnitConfig): number {
    const base = unit.dpCost
    const mult = this.deployCostMultiplier.get(unit.id) ?? 1.0
    return Math.floor(base * mult)
  }

  isDeployed(unitId: string): boolean {
    return this.deployedUnitIds.has(unitId)
  }

  isOnCooldown(unitId: string): boolean {
    return (this.redeployTimers.get(unitId) ?? 0) > 0
  }

  getCooldownRemaining(unitId: string): number {
    return this.redeployTimers.get(unitId) ?? 0
  }

  canDeploy(unit: UnitConfig, row: number, col: number): { ok: boolean; reason?: string } {
    const tile = this.grid.getTile(row, col)
    if (!tile) return { ok: false, reason: 'Out of bounds' }

    if (this.activeUnits.has(`${row},${col}`)) return { ok: false, reason: 'Tile occupied' }

    if (this.activeUnits.size >= this.deploymentLimit) return { ok: false, reason: 'Deployment limit reached' }

    const cost = this.getCurrentCost(unit)
    if (this.currentDP < cost) return { ok: false, reason: `Need ${cost} DP, have ${this.currentDP}` }

    if (unit.type === 'ground') {
      if (tile.type !== TileType.Ground) {
        return { ok: false, reason: 'Ground units need ground tiles' }
      }
    } else {
      if (tile.type !== TileType.Ranged) {
        return { ok: false, reason: 'Ranged units need ranged tiles' }
      }
    }

    return { ok: true }
  }

  deployUnit(unit: UnitConfig, row: number, col: number, facing: Direction = 'up'): DeployedUnit | null {
    const check = this.canDeploy(unit, row, col)
    if (!check.ok) return null

    const cost = this.getCurrentCost(unit)
    this.currentDP -= cost
    const deployed: DeployedUnit = {
      config: unit,
      row,
      col,
      currentHp: unit.hp,
      dpCostPaid: cost,
      lastAttackTime: 0,
      blocking: [],
      facing,
    }
    this.activeUnits.set(`${row},${col}`, deployed)
    this.deployedUnitIds.add(unit.id)
    return deployed
  }

  retreatUnit(row: number, col: number): number {
    const key = `${row},${col}`
    const unit = this.activeUnits.get(key)
    if (!unit) return 0

    const isFullRefund = unit.config.traits?.some(t => t.traitId === UnitTrait.FullRefundRetreat)
    const refund = isFullRefund ? unit.dpCostPaid : Math.floor(unit.dpCostPaid / 2)
    this.currentDP = Math.min(this.currentDP + refund, this.dpCap)

    const unitId = unit.config.id
    this.activeUnits.delete(key)
    this.deployedUnitIds.delete(unitId)

    const currentMult = this.deployCostMultiplier.get(unitId) ?? 1.0
    let nextMult: number
    if (currentMult < 1.5) {
      nextMult = 1.5
    } else {
      nextMult = Math.min(2.0, currentMult * 2)
    }
    this.deployCostMultiplier.set(unitId, nextMult)
    this.redeployTimers.set(unitId, unit.config.redeployTime)

    return refund
  }

  updateTimers(dt: number): void {
    for (const [unitId, remaining] of this.redeployTimers) {
      const newTime = remaining - dt
      if (newTime <= 0) {
        this.redeployTimers.delete(unitId)
      } else {
        this.redeployTimers.set(unitId, newTime)
      }
    }
  }

  getRefund(unit: UnitConfig): number {
    const isFullRefund = unit.traits?.some(t => t.traitId === UnitTrait.FullRefundRetreat)
    return isFullRefund ? unit.dpCost : Math.floor(unit.dpCost / 2)
  }

  getUnitAt(row: number, col: number): DeployedUnit | undefined {
    return this.activeUnits.get(`${row},${col}`)
  }

  getAllUnits(): DeployedUnit[] {
    return Array.from(this.activeUnits.values())
  }

  addDP(amount: number): void {
    this.currentDP = Math.min(this.currentDP + amount, this.dpCap)
  }

  update(delta: number): void {
    this.dpAccumulator += delta * this.dpRegenRate
    const gained = Math.floor(this.dpAccumulator)
    if (gained > 0) {
      this.dpAccumulator -= gained
      this.currentDP = Math.min(this.currentDP + gained, this.dpCap)
    }
    this.updateTimers(delta)
  }

  reset(startingDP: number, dpRegenRate: number, dpCap: number, deploymentLimit: number): void {
    this.currentDP = startingDP
    this.dpRegenRate = dpRegenRate
    this.dpCap = dpCap
    this.deploymentLimit = deploymentLimit
    this.activeUnits.clear()
    this.deployedUnitIds.clear()
    this.redeployTimers.clear()
    this.deployCostMultiplier.clear()
    this.dpAccumulator = 0
  }
}
