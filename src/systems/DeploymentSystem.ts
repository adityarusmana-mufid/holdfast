import { Direction, UnitConfig, DeployedUnit, TileType, UnitTrait } from '../types/index'
import { Grid } from '../entities/Grid'

export class DeploymentSystem {
  currentDP: number
  dpRegenRate: number
  dpCap: number
  deploymentLimit: number
  activeUnits: Map<string, DeployedUnit>
  redeployTimers: Map<number, number>
  deployCostMultiplier: Map<number, number>
  private grid: Grid
  private dpAccumulator: number = 0

  constructor(grid: Grid, startingDP: number = 10, dpRegenRate: number = 1, dpCap: number = 99, deploymentLimit: number = 8) {
    this.grid = grid
    this.currentDP = startingDP
    this.dpRegenRate = dpRegenRate
    this.dpCap = dpCap
    this.deploymentLimit = deploymentLimit
    this.activeUnits = new Map()
    this.redeployTimers = new Map()
    this.deployCostMultiplier = new Map()
  }

  getCurrentCost(instanceId: number, unit: UnitConfig): number {
    const base = unit.dpCost
    const mult = this.deployCostMultiplier.get(instanceId) ?? 1.0
    return Math.floor(base * mult)
  }

  isOnCooldown(instanceId: number): boolean {
    return (this.redeployTimers.get(instanceId) ?? 0) > 0
  }

  getCooldownRemaining(instanceId: number): number {
    return this.redeployTimers.get(instanceId) ?? 0
  }

  canDeploy(unit: UnitConfig, row: number, col: number, instanceId: number): { ok: boolean; reason?: string } {
    const tile = this.grid.getTile(row, col)
    if (!tile) return { ok: false, reason: 'Out of bounds' }

    if (this.activeUnits.has(`${row},${col}`)) return { ok: false, reason: 'Tile occupied' }

    if (this.activeUnits.size >= this.deploymentLimit) return { ok: false, reason: 'Deployment limit reached' }

    if (this.isOnCooldown(instanceId)) return { ok: false, reason: 'Unit on redeploy cooldown' }

    const cost = this.getCurrentCost(instanceId, unit)
    if (this.currentDP < cost) return { ok: false, reason: `Need ${cost} DP, have ${this.currentDP}` }

    if (unit.type === 'ground') {
      if (tile.type !== TileType.Ground && tile.type !== TileType.RepairNode && tile.type !== TileType.ArmorGrid) {
        return { ok: false, reason: 'Ground units need ground tiles' }
      }
    } else {
      if (tile.type !== TileType.Ranged) {
        return { ok: false, reason: 'Ranged units need ranged tiles' }
      }
    }

    return { ok: true }
  }

  deployUnit(unit: UnitConfig, row: number, col: number, facing: Direction = 'up', instanceId: number): DeployedUnit | null {
    const check = this.canDeploy(unit, row, col, instanceId)
    if (!check.ok) return null

    const cost = this.getCurrentCost(instanceId, unit)
    this.currentDP -= cost
    const deployed: DeployedUnit = {
      config: unit,
      instanceId,
      row,
      col,
      currentHp: unit.hp,
      dpCostPaid: cost,
      lastAttackTime: 0,
      blocking: [],
      facing,
    }
    this.activeUnits.set(`${row},${col}`, deployed)
    this.redeployTimers.delete(instanceId)
    return deployed
  }

  retreatUnit(row: number, col: number): number {
    const key = `${row},${col}`
    const unit = this.activeUnits.get(key)
    if (!unit) return 0

    const isFullRefund = unit.config.traits?.some(t => t.traitId === UnitTrait.FullRefundRetreat)
    const refund = isFullRefund ? unit.dpCostPaid : Math.floor(unit.dpCostPaid / 2)
    this.currentDP = Math.min(this.currentDP + refund, this.dpCap)

    this.removeUnit(row, col)
    return refund
  }

  removeUnit(row: number, col: number): number | undefined {
    const key = `${row},${col}`
    const unit = this.activeUnits.get(key)
    if (!unit) return

    const instId = unit.instanceId
    this.activeUnits.delete(key)

    const currentMult = this.deployCostMultiplier.get(instId) ?? 1.0
    let nextMult: number
    if (currentMult < 1.5) {
      nextMult = 1.5
    } else {
      nextMult = Math.min(2.0, currentMult * 2)
    }
    this.deployCostMultiplier.set(instId, nextMult)
    this.redeployTimers.set(instId, unit.config.redeployTime)
    return instId
  }

  updateTimers(dt: number): void {
    for (const [instId, remaining] of this.redeployTimers) {
      const newTime = remaining - dt
      if (newTime <= 0) {
        this.redeployTimers.delete(instId)
      } else {
        this.redeployTimers.set(instId, newTime)
      }
    }
  }

  getDPProgress(): number {
    return this.dpAccumulator
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
    this.redeployTimers.clear()
    this.deployCostMultiplier.clear()
    this.dpAccumulator = 0
  }
}
