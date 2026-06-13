import Phaser from 'phaser'
import { UnitConfig } from '../types/index'
import { Grid, TILE_SIZE } from './Grid'

export class UnitSprite {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private body: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private hpBg: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text

  lastAttackTime: number = 0
  config: UnitConfig
  row: number
  col: number
  currentHp: number

  constructor(scene: Phaser.Scene, grid: Grid, config: UnitConfig, row: number, col: number, hp: number) {
    this.scene = scene
    this.config = config
    this.row = row
    this.col = col
    this.currentHp = hp

    const pos = grid.tileToPixel(row, col)
    const size = TILE_SIZE * 0.7
    const half = size / 2

    this.body = scene.add.graphics()
    this.drawBody(config, size)

    this.hpBg = scene.add.graphics()
    this.hpBg.fillStyle(0xcfd8dc, 0.6)
    this.hpBg.fillRect(-half, -half - 8, size, 4)

    this.hpBar = scene.add.graphics()
    this.drawHp(size)

    this.label = scene.add.text(0, half + 6, `${config.name}`, {
      fontSize: '10px',
      color: '#4a4a5a',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.label.setOrigin(0.5)

    this.container = scene.add.container(pos.x, pos.y, [this.body, this.hpBg, this.hpBar, this.label])
    this.container.setDepth(10)
  }

  private drawBody(config: UnitConfig, size: number): void {
    const half = size / 2
    this.body.fillStyle(config.color, 1)

    if (config.type === 'ground') {
      this.body.fillRoundedRect(-half, -half, size, size, 4)
      this.body.lineStyle(2, 0x00a2ff, 0.4)
      this.body.strokeRoundedRect(-half, -half, size, size, 4)

      if (config.blockCount > 1) {
        const inner = size * 0.25
        this.body.fillStyle(0x00a2ff, 0.3)
        for (let i = 0; i < config.blockCount - 1; i++) {
          this.body.fillRect(-half + 4 + i * (inner + 2), half - inner - 4, inner, inner)
        }
      }
    } else {
      this.body.fillTriangle(0, -half, -half, half, half, half)
      this.body.lineStyle(2, 0x00a2ff, 0.4)
      this.body.strokeTriangle(0, -half, -half, half, half, half)
    }
  }

  private drawHp(size: number): void {
    this.hpBar.clear()
    const half = size / 2
    const ratio = Math.max(0, this.currentHp / this.config.hp)
    const hpColor = ratio > 0.5 ? 0x00c853 : ratio > 0.25 ? 0xff9100 : 0xd32f2f
    this.hpBar.fillStyle(hpColor, 1)
    this.hpBar.fillRect(-half, -half - 8, size * ratio, 4)
  }

  updateHp(newHp: number): void {
    this.currentHp = newHp
    this.drawHp(TILE_SIZE * 0.7)
  }

  takeDamage(amount: number): number {
    this.currentHp = Math.max(0, this.currentHp - amount)
    this.drawHp(TILE_SIZE * 0.7)
    return this.currentHp
  }

  isAlive(): boolean {
    return this.currentHp > 0
  }

  destroy(): void {
    this.container.destroy()
  }

  setPosition(row: number, col: number, grid: Grid): void {
    this.row = row
    this.col = col
    const pos = grid.tileToPixel(row, col)
    this.container.setPosition(pos.x, pos.y)
  }
}
