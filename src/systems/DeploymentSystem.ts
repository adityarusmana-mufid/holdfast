import { UnitConfig, DeployedUnit, TileType } from '../types/index'
import { Grid } from '../entities/Grid'

export class DeploymentSystem {
  currentDP: number
  dpRegenRate: number
  dpCap: number
  deploymentLimit: number
  activeUnits: Map<string, DeployedUnit>
  private grid: Grid
  private dpAccumulator: number = 0

  constructor(grid: Grid, startingDP: number = 10, dpRegenRate: number = 1, dpCap: number = 99, deploymentLimit: number = 8) {
    this.grid = grid
    this.currentDP = startingDP
    this.dpRegenRate = dpRegenRate
    this.dpCap = dpCap
    this.deploymentLimit = deploymentLimit
    this.activeUnits = new Map()
  }

  canDeploy(unit: UnitConfig, row: number, col: number): { ok: boolean; reason?: string } {
    const tile = this.grid.getTile(row, col)
    if (!tile) return { ok: false, reason: 'Out of bounds' }

    if (this.activeUnits.has(`${row},${col}`)) return { ok: false, reason: 'Tile occupied' }

    if (this.activeUnits.size >= this.deploymentLimit) return { ok: false, reason: 'Deployment limit reached' }

    if (this.currentDP < unit.dpCost) return { ok: false, reason: `Need ${unit.dpCost} DP, have ${this.currentDP}` }

    if (unit.type === 'ground') {
      if (tile.type !== TileType.Route && tile.type !== TileType.DeployGround) {
        return { ok: false, reason: 'Ground units need route/ground tiles' }
      }
    } else {
      if (tile.type !== TileType.DeployRanged && tile.type !== TileType.Floor) {
        return { ok: false, reason: 'Ranged units need deploy_ranged/floor tiles' }
      }
    }

    return { ok: true }
  }

  deployUnit(unit: UnitConfig, row: number, col: number): DeployedUnit | null {
    const check = this.canDeploy(unit, row, col)
    if (!check.ok) return null

    this.currentDP -= unit.dpCost
    const deployed: DeployedUnit = {
      config: unit,
      row,
      col,
      currentHp: unit.hp,
      lastAttackTime: 0,
      blocking: [],
    }
    this.activeUnits.set(`${row},${col}`, deployed)
    return deployed
  }

  retreatUnit(row: number, col: number): number {
    const key = `${row},${col}`
    const unit = this.activeUnits.get(key)
    if (!unit) return 0

    const refund = Math.floor(unit.config.dpCost / 2)
    this.currentDP = Math.min(this.currentDP + refund, this.dpCap)
    this.activeUnits.delete(key)
    return refund
  }

  getRefund(unit: UnitConfig): number {
    return Math.floor(unit.dpCost / 2)
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
  }

  reset(startingDP: number, dpRegenRate: number, dpCap: number, deploymentLimit: number): void {
    this.currentDP = startingDP
    this.dpRegenRate = dpRegenRate
    this.dpCap = dpCap
    this.deploymentLimit = deploymentLimit
    this.activeUnits.clear()
    this.dpAccumulator = 0
  }
}
