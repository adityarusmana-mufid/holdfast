import Phaser from 'phaser'
import { EnemyConfig, Position, StatusEffect } from '../types/index'
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

  private grid: Grid

  constructor(scene: Phaser.Scene, grid: Grid, config: EnemyConfig, path: Position[]) {
    this.id = nextEnemyId++
    this.scene = scene
    this.grid = grid
    this.config = config
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

    const glow = scene.add.graphics()
    glow.fillStyle(config.color, 0.1)
    glow.fillCircle(0, 0, size * 0.7)

    this.body = scene.add.graphics()
    this.body.fillStyle(config.color, 1)
    this.body.fillCircle(0, 0, half)
    this.body.lineStyle(2, 0xd32f2f, 0.4)
    this.body.strokeCircle(0, 0, half)

    this.dirIndicator = scene.add.graphics()
    this.dirIndicator.fillStyle(0xffffff, 0.7)
    this.dirIndicator.fillTriangle(half * 0.5, 0, -half * 0.3, -half * 0.4, -half * 0.3, half * 0.4)

    const initialAngle = path.length > 1
      ? Math.atan2(path[1].row - path[0].row, path[1].col - path[0].col)
      : 0
    this.dirIndicator.rotation = initialAngle

    this.hpBg = scene.add.graphics()
    this.hpBg.fillStyle(0xcfd8dc, 0.6)
    this.hpBg.fillRect(-half, -half - 10, size, 3)

    this.hpBar = scene.add.graphics()
    this.drawHp(size)

    this.container = scene.add.container(this.x, this.y, [glow, this.body, this.dirIndicator, this.hpBg, this.hpBar])
    this.container.setDepth(config.isAerial ? 15 : 9)
  }

  private drawHp(size: number): void {
    this.hpBar.clear()
    const half = size / 2
    const ratio = Math.max(0, this.currentHp / this.config.hp)
    const hpColor = ratio > 0.5 ? 0xd32f2f : ratio > 0.25 ? 0xff6d00 : 0x9c27b0
    this.hpBar.fillStyle(hpColor, 1)
    this.hpBar.fillRect(-half, -half - 10, size * ratio, 3)
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
    this.currentHp = Math.max(0, this.currentHp - amount)
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

  move(delta: number): boolean {
    if (this.blocked || !this.alive) return false
    if (this.currentWaypoint >= this.path.length - 1) return false

    this.updateStatusEffects(delta)

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
