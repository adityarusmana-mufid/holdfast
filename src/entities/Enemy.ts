import Phaser from 'phaser'
import { EnemyConfig } from '../types/index'
import { Grid, TILE_SIZE } from '../entities/Grid'
import { Position } from '../shared/utils/GridMath'

let nextEnemyId = 0

export class EnemySprite {
  readonly id: number
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private body: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private hpBg: Phaser.GameObjects.Graphics
  private dirIndicator: Phaser.GameObjects.Graphics

  config: EnemyConfig
  currentHp: number
  currentWaypoint: number
  waypoints: Position[]
  x: number
  y: number
  blocked: boolean = false
  alive: boolean = true
  blockerUnitKey: string | null = null

  private grid: Grid

  constructor(scene: Phaser.Scene, grid: Grid, config: EnemyConfig, waypoints: Position[]) {
    this.id = nextEnemyId++
    this.scene = scene
    this.grid = grid
    this.config = config
    this.currentHp = config.hp
    this.waypoints = waypoints
    this.currentWaypoint = 0

    const startPos = grid.tileToPixel(waypoints[0].row, waypoints[0].col)
    this.x = startPos.x
    this.y = startPos.y

    const size = TILE_SIZE * 0.6
    const half = size / 2

    this.body = scene.add.graphics()
    this.body.fillStyle(config.color, 1)
    this.body.fillCircle(0, 0, half)
    this.body.lineStyle(2, 0xd32f2f, 0.4)
    this.body.strokeCircle(0, 0, half)

    this.dirIndicator = scene.add.graphics()
    this.dirIndicator.fillStyle(0xffffff, 0.7)
    this.dirIndicator.fillTriangle(half * 0.5, 0, -half * 0.3, -half * 0.4, -half * 0.3, half * 0.4)

    const initialAngle = waypoints.length > 1
      ? Math.atan2(waypoints[1].row - waypoints[0].row, waypoints[1].col - waypoints[0].col)
      : 0
    this.dirIndicator.rotation = initialAngle

    this.hpBg = scene.add.graphics()
    this.hpBg.fillStyle(0xcfd8dc, 0.6)
    this.hpBg.fillRect(-half, -half - 10, size, 3)

    this.hpBar = scene.add.graphics()
    this.drawHp(size)

    this.container = scene.add.container(this.x, this.y, [this.body, this.dirIndicator, this.hpBg, this.hpBar])
    this.container.setDepth(9)
  }

  private drawHp(size: number): void {
    this.hpBar.clear()
    const half = size / 2
    const ratio = Math.max(0, this.currentHp / this.config.hp)
    const hpColor = ratio > 0.5 ? 0xd32f2f : ratio > 0.25 ? 0xff6d00 : 0x9c27b0
    this.hpBar.fillStyle(hpColor, 1)
    this.hpBar.fillRect(-half, -half - 10, size * ratio, 3)
  }

  takeDamage(amount: number): number {
    this.currentHp = Math.max(0, this.currentHp - amount)
    this.drawHp(TILE_SIZE * 0.6)
    if (this.currentHp <= 0) {
      this.alive = false
    }
    return this.currentHp
  }

  move(delta: number): boolean {
    if (this.blocked || !this.alive) return false
    if (this.currentWaypoint >= this.waypoints.length - 1) return false

    const target = this.waypoints[this.currentWaypoint + 1]
    const targetPos = this.grid.tileToPixel(target.row, target.col)
    const dx = targetPos.x - this.x
    const dy = targetPos.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const angle = Math.atan2(dy, dx)
    this.dirIndicator.rotation = angle

    const step = this.config.speed * delta

    if (dist <= step) {
      this.x = targetPos.x
      this.y = targetPos.y
      this.currentWaypoint++
      this.container.setPosition(this.x, this.y)
      return true
    } else {
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      this.container.setPosition(this.x, this.y)
      return false
    }
  }

  getCurrentTile(): { row: number; col: number } {
    return this.waypoints[this.currentWaypoint]
  }

  isAtObjective(): boolean {
    return this.currentWaypoint >= this.waypoints.length - 1
  }

  destroy(): void {
    this.container.destroy()
  }

  setBlocked(blocked: boolean, unitKey?: string): void {
    this.blocked = blocked
    this.blockerUnitKey = blocked ? (unitKey ?? null) : null
  }
}
