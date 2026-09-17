import Phaser from 'phaser'
import { EnemyConfig, EnemyBehavior, Position, StatusEffect, FlowDirection } from '../types/index'
import { Grid, TILE_SIZE } from '../entities/Grid'

const AERIAL_ELEVATION = 40

let nextEnemyId = 0

export class EnemySprite {
  readonly id: number
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container

  getContainer(): Phaser.GameObjects.Container { return this.container }
  private body: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private hpBg: Phaser.GameObjects.Graphics
  private dirIndicator: Phaser.GameObjects.Graphics
  private shieldGraphic: Phaser.GameObjects.Graphics
  private shadow: Phaser.GameObjects.Graphics | null = null
  private shadowGlow: Phaser.GameObjects.Graphics | null = null

  config: EnemyConfig
  currentHp: number
  currentWaypoint: number
  path: Position[]
  x: number
  y: number
  blocked: boolean = false
  alive: boolean = true
  blockerUnitKey: string | null = null
  visualOffsetX: number = 0
  visualOffsetY: number = 0
  statusEffects: StatusEffect[] = []

  behavior: EnemyBehavior
  currentShieldHp: number = 0
  isDetected: boolean = false
  bonusAtk: number = 0

  routingState: 'route' | 'reroute' = 'route'
  rerouteTargetWaypoint: number = -1

  private grid: Grid

  constructor(scene: Phaser.Scene, grid: Grid, config: EnemyConfig, path: Position[]) {
    this.id = nextEnemyId++
    this.scene = scene
    this.grid = grid
    this.config = config
    this.behavior = config.behavior
    if (config.behavior.type === 'shielded') {
      this.currentShieldHp = config.behavior.shieldHp
    }
    this.currentHp = config.hp
    this.path = path
    this.currentWaypoint = 0

    const startPos = grid.tileToPixel(path[0].row, path[0].col)
    this.x = startPos.x
    this.y = startPos.y

    const size = TILE_SIZE * 0.6
    const half = size / 2

    if (config.isAerial) {
      this.visualOffsetY = -AERIAL_ELEVATION
      const sw = size * 1.2
      const sh = size * 0.35
      this.shadowGlow = scene.add.graphics()
      this.shadowGlow.fillStyle(0x000000, 0.08)
      this.shadowGlow.fillEllipse(0, 0, sw * 1.2, sh * 1.2)
      this.shadowGlow.setDepth(8)
      this.shadow = scene.add.graphics()
      this.shadow.fillStyle(0x000000, 0.3)
      this.shadow.fillEllipse(0, 0, sw, sh)
      this.shadow.setDepth(8)
    }

    this.shieldGraphic = scene.add.graphics()

    const glow = scene.add.graphics()
    glow.fillStyle(config.color, 0.1)
    glow.fillCircle(0, 0, size * 0.7)

    this.body = scene.add.graphics()
    this.body.fillStyle(config.color, 1)
    this.body.lineStyle(2, 0xd32f2f, 0.4)

    const shape = this.getShapeId()
    switch (shape) {
      case 'triangle':
        this.body.fillTriangle(-half, half, half, half, 0, -half)
        this.body.strokeTriangle(-half, half, half, half, 0, -half)
        break
      case 'diamond':
        this.body.fillPoints([
          new Phaser.Geom.Point(0, -half),
          new Phaser.Geom.Point(half, 0),
          new Phaser.Geom.Point(0, half),
          new Phaser.Geom.Point(-half, 0),
        ], true)
        break
      case 'hexagon':
        this.drawHexagon(this.body, 0, 0, half)
        break
      case 'square':
        this.body.fillRect(-half * 0.7, -half * 0.7, size * 0.7, size * 0.7)
        this.body.strokeRect(-half * 0.7, -half * 0.7, size * 0.7, size * 0.7)
        break
      default:
        this.body.fillCircle(0, 0, half)
        this.body.strokeCircle(0, 0, half)
    }

    this.dirIndicator = scene.add.graphics()
    this.dirIndicator.fillStyle(0xffffff, 0.7)
    if (shape === 'circle') {
      this.dirIndicator.fillTriangle(half * 0.5, 0, -half * 0.3, -half * 0.4, -half * 0.3, half * 0.4)
    } else {
      this.dirIndicator.fillCircle(0, -half * 0.8, 3)
    }

    const initialAngle = path.length > 1
      ? Math.atan2(path[1].row - path[0].row, path[1].col - path[0].col)
      : 0
    this.dirIndicator.rotation = initialAngle

    this.hpBg = scene.add.graphics()
    this.hpBg.fillStyle(0xcfd8dc, 0.6)
    this.hpBg.fillRect(-half, -half - 10, size, 3)

    this.hpBar = scene.add.graphics()
    this.drawHp(size)

    this.container = scene.add.container(this.x, this.y, [glow, this.shieldGraphic, this.body, this.dirIndicator, this.hpBg, this.hpBar])
    this.container.setDepth(config.isAerial ? 15 : 9)
    this.drawShield()
  }

  private drawHp(size: number): void {
    this.hpBar.clear()
    const half = size / 2
    const ratio = Math.max(0, this.currentHp / this.config.hp)
    const hpColor = ratio > 0.5 ? 0xd32f2f : ratio > 0.25 ? 0xff6d00 : 0x9c27b0
    this.hpBar.fillStyle(hpColor, 1)
    this.hpBar.fillRect(-half, -half - 10, size * ratio, 3)
  }

  private getShapeId(): 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'square' {
    switch (this.config.id) {
      case 'rusher': case 'rusher_elite': return 'triangle'
      case 'marksman': case 'marksman_elite': return 'diamond'
      case 'breacher': case 'breacher_elite': return 'hexagon'
      case 'repair': case 'repair_elite': return 'square'
      default: return 'circle'
    }
  }

  private drawHexagon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    const pts: Phaser.Geom.Point[] = []
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6
      pts.push(new Phaser.Geom.Point(cx + r * Math.cos(a), cy + r * Math.sin(a)))
    }
    g.fillPoints(pts, true)
    g.strokePoints(pts, true)
  }

  private drawShield(): void {
    this.shieldGraphic.clear()
    if (this.behavior.type !== 'shielded' || this.currentShieldHp <= 0) return
    const ratio = this.currentShieldHp / this.behavior.shieldHp
    const size = TILE_SIZE * 0.6
    const half = size / 2
    this.shieldGraphic.lineStyle(3, Phaser.Display.Color.GetColor(
      Math.floor(150 * (1 - ratio)),
      Math.floor(150 * ratio),
      255
    ), 0.8)
    this.shieldGraphic.strokeCircle(0, 0, half + 4)
  }

  updateDetection(units: { row: number; col: number }[]): void {
    if (this.behavior.type !== 'stealth' || !this.alive) return
    const tile = this.getCurrentTile()
    if (!tile) return
    let detected = false
    for (const u of units) {
      const dist = Math.abs(u.row - tile.row) + Math.abs(u.col - tile.col)
      if (dist <= this.behavior.detectionRange) {
        detected = true
        break
      }
    }
    this.isDetected = detected
    this.container.setAlpha(detected ? 1 : 0.2)
  }

  applyVisualPosition(): void {
    this.container.setPosition(this.x + this.visualOffsetX, this.y + this.visualOffsetY)
    if (this.shadow) {
      this.shadow.setPosition(this.x, this.y)
    }
    if (this.shadowGlow) {
      this.shadowGlow.setPosition(this.x, this.y)
    }
  }

  takeDamage(amount: number): number {
    let remaining = amount
    if (this.behavior.type === 'shielded' && this.currentShieldHp > 0) {
      if (remaining <= this.currentShieldHp) {
        this.currentShieldHp -= remaining
        remaining = 0
      } else {
        remaining -= this.currentShieldHp
        this.currentShieldHp = 0
      }
      this.drawShield()
    }
    this.currentHp = Math.max(0, this.currentHp - remaining)
    this.drawHp(TILE_SIZE * 0.6)
    if (this.container.scene) {
      this.container.scene.tweens.add({
        targets: this.container,
        alpha: 0.4,
        duration: 40,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
    }
    if (this.behavior.type === 'stealth') {
      this.isDetected = true
    }
    if (this.currentHp <= 0) {
      this.alive = false
    }
    return this.currentHp
  }

  applyStatusEffect(effect: StatusEffect): void {
    const existing = this.statusEffects.find(e => e.type === effect.type)
    if (existing) {
      existing.remainingDuration = Math.max(existing.remainingDuration, effect.remainingDuration)
      existing.factor = Math.min(existing.factor, effect.factor)
    } else {
      this.statusEffects.push({ ...effect })
    }
  }

  updateStatusEffects(delta: number): void {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      this.statusEffects[i].remainingDuration -= delta
      if (this.statusEffects[i].remainingDuration <= 0) {
        this.statusEffects.splice(i, 1)
      }
    }
  }

  getSpeedMultiplier(): number {
    let mult = 1
    for (const e of this.statusEffects) {
      if (e.type === 'slow') mult *= e.factor
    }
    return mult
  }

  isStunned(): boolean {
    return this.statusEffects.some(e => e.type === 'stun')
  }

  displaceTo(targetRow: number, targetCol: number): void {
    const pos = this.grid.tileToPixel(targetRow, targetCol)
    this.x = pos.x
    this.y = pos.y
    this.applyVisualPosition()
  }

  move(delta: number): boolean {
    if (this.blocked || !this.alive) return false
    this.updateStatusEffects(delta)
    if (this.isStunned()) return false
    if (this.currentWaypoint >= this.path.length - 1) return false

    if (this.routingState === 'reroute') {
      return this.moveReroute(delta)
    }

    const target = this.path[this.currentWaypoint + 1]
    const targetPos = this.grid.tileToPixel(target.row, target.col)
    const dx = targetPos.x - this.x
    const dy = targetPos.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const angle = Math.atan2(dy, dx)
    this.dirIndicator.rotation = angle

    const step = this.config.speed * this.getSpeedMultiplier() * delta

    if (dist <= step) {
      this.x = targetPos.x
      this.y = targetPos.y
      this.currentWaypoint++
      this.applyVisualPosition()
      return true
    } else {
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      this.applyVisualPosition()
      return false
    }
  }

  private moveReroute(delta: number): boolean {
    const currentTile = this.getCurrentTile()
    if (!currentTile) return false

    const flowDir = this.rerouteFlowDirection(currentTile)
    if (!flowDir) {
      this.resumeRoute()
      return false
    }

    const targetPos = this.grid.tileToPixel(
      currentTile.row + (flowDir === 'up' ? -1 : flowDir === 'down' ? 1 : 0),
      currentTile.col + (flowDir === 'left' ? -1 : flowDir === 'right' ? 1 : 0)
    )

    const dx = targetPos.x - this.x
    const dy = targetPos.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const angle = Math.atan2(dy, dx)
    this.dirIndicator.rotation = angle

    const step = this.config.speed * this.getSpeedMultiplier() * delta

    if (dist <= step) {
      this.x = targetPos.x
      this.y = targetPos.y
      this.applyVisualPosition()

      const nextTile = this.getCurrentTile()
      if (nextTile && this.isOnRoute(nextTile)) {
        this.resumeRoute()
      }
      return true
    } else {
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      this.applyVisualPosition()
      return false
    }
  }

  rerouteFlowDirection(tile: Position): FlowDirection {
    if (this.grid.getFlowDirection) {
      return this.grid.getFlowDirection(tile)
    }
    return null
  }

  isOnRoute(tile: Position): boolean {
    if (!this.path) return false
    for (let i = this.currentWaypoint; i < this.path.length; i++) {
      if (this.path[i].row === tile.row && this.path[i].col === tile.col) {
        this.rerouteTargetWaypoint = i
        return true
      }
    }
    return false
  }

  resumeRoute(): void {
    this.routingState = 'route'
    if (this.rerouteTargetWaypoint >= 0) {
      this.currentWaypoint = this.rerouteTargetWaypoint
      this.rerouteTargetWaypoint = -1
    }
  }

  enterRerouteMode(): void {
    this.routingState = 'reroute'
    this.rerouteTargetWaypoint = -1
  }

  getCurrentTile(): { row: number; col: number } | null {
    return this.grid.pixelToTile(this.x, this.y)
  }

  isAtObjective(): boolean {
    return this.currentWaypoint >= this.path.length - 1
  }

  destroy(): void {
    if (this.shadow) { this.shadow.destroy(); this.shadow = null }
    if (this.shadowGlow) { this.shadowGlow.destroy(); this.shadowGlow = null }
    const scene = this.container.scene
    if (scene) {
      if (!scene.textures.exists('particle')) {
        const g = scene.make.graphics()
        g.fillStyle(0xffffff)
        g.fillRect(0, 0, 8, 8)
        g.generateTexture('particle', 8, 8)
        g.destroy()
      }

      if (this.config.color) {
        const emitter = scene.add.particles(this.container.x, this.container.y, 'particle', {
          speed: { min: 40, max: 120 },
          angle: { min: 0, max: 360 },
          scale: { start: 2, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 350,
          emitting: false,
          tint: this.config.color,
        })
        emitter.explode(6)
        scene.time.delayedCall(500, () => emitter.destroy())
      }

      scene.tweens.add({
        targets: this.container,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 250,
        ease: 'Power2',
        onComplete: () => { this.container.destroy() },
      })
    } else {
      this.container.destroy()
    }
  }

  setBlocked(blocked: boolean, unitKey?: string): void {
    this.blocked = blocked
    this.blockerUnitKey = blocked ? (unitKey ?? null) : null
  }
}
