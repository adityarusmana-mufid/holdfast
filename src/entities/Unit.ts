import Phaser from 'phaser'
import { Direction, UnitConfig, DeployedUnit } from '../types/index'
import { Grid, TILE_SIZE } from './Grid'
import { FONT_SIZE } from '../ui/Constants'
import { drawCoreCasterIcon, drawSplashCasterIcon, drawBlastCasterIcon, drawChainCasterIcon, drawMechAccordCasterIcon, drawProtectorIcon, drawGuardianIcon, drawJuggernautIcon, drawFortressIcon, drawArtsProtectorIcon, drawSentryProtectorIcon, drawPioneerIcon, drawChargerIcon, drawCenturionGuardIcon, drawLordGuardIcon, drawArtsFighterIcon, drawInstructorGuardIcon, drawFighterIcon, drawSwordmasterIcon, drawSolobladeIcon, drawReaperIcon, drawEarthshakerIcon, drawCrusherIcon, drawMedicIcon } from '../ui/Components'

export class UnitSprite {
  private scene: Phaser.Scene
  container: Phaser.GameObjects.Container
  private body: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private hpBg: Phaser.GameObjects.Graphics
  private spBar: Phaser.GameObjects.Graphics
  private spBg: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text
  private chargeText: Phaser.GameObjects.Text

  lastAttackTime: number = 0
  config: UnitConfig
  row: number
  col: number
  currentHp: number
  facing: Direction
  spProgress: number = 0
  deployedUnit: DeployedUnit | null = null

  constructor(scene: Phaser.Scene, grid: Grid, config: UnitConfig, row: number, col: number, hp: number, facing: Direction = 'up') {
    this.scene = scene
    this.config = config
    this.row = row
    this.col = col
    this.currentHp = hp
    this.facing = facing

    const pos = grid.tileToPixel(row, col)
    const size = TILE_SIZE * 0.7
    const half = size / 2

    this.body = scene.add.graphics()
    this.drawBody(config, size, facing)

    const glow = scene.add.graphics()
    glow.fillStyle(config.color, 0.12)
    glow.fillCircle(0, 0, size * 0.9)

    this.hpBg = scene.add.graphics()
    this.hpBg.fillStyle(0xcfd8dc, 0.6)
    this.hpBg.fillRect(-half, -half - 8, size, 4)

    this.hpBar = scene.add.graphics()
    this.drawHp(size)

    this.spBg = scene.add.graphics()
    this.spBg.fillStyle(0x424242, 0.6)
    this.spBg.fillRect(-half, -half - 3, size, 3)

    this.spBar = scene.add.graphics()
    this.drawSp(size)

    this.chargeText = scene.add.text(0, -half - 16, '', {
      fontSize: '11px',
      color: '#ffd700',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false)

    this.label = scene.add.text(0, half + 6, `${config.subtypeLabel}`, {
      fontSize: FONT_SIZE.xs,
      color: '#4a4a5a',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.label.setOrigin(0.5)

    this.container = scene.add.container(pos.x, pos.y, [glow, this.body, this.hpBg, this.hpBar, this.spBg, this.spBar, this.chargeText, this.label])
    this.container.setDepth(20)
    this.chargeText.setDepth(22)
  }

  private drawBody(config: UnitConfig, size: number, facing: Direction): void {
    const half = size / 2

    if (config.id === 'core_caster') {
      this.drawCoreCasterIcon(size, facing)
      return
    }
    if (config.id === 'splash_caster') {
      drawSplashCasterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'blast_caster') {
      drawBlastCasterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'chain_caster') {
      drawChainCasterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'mech_accord_caster') {
      drawMechAccordCasterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'protector') {
      drawProtectorIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'guardian') {
      drawGuardianIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'juggernaut') {
      drawJuggernautIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'fortress_defender') {
      drawFortressIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'arts_protector') {
      drawArtsProtectorIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'sentry_protector') {
      drawSentryProtectorIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'centurion_guard') {
      drawCenturionGuardIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'lord_guard') {
      drawLordGuardIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'arts_fighter') {
      drawArtsFighterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'instructor_guard') {
      drawInstructorGuardIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'fighter') {
      drawFighterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'swordmaster') {
      drawSwordmasterIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'soloblade') {
      drawSolobladeIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'reaper') {
      drawReaperIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'earthshaker') {
      drawEarthshakerIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'crusher') {
      drawCrusherIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'medic_st') {
      drawMedicIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'pioneer') {
      drawPioneerIcon(this.body, 0, 0, size, config.color)
      return
    }
    if (config.id === 'charger') {
      drawChargerIcon(this.body, 0, 0, size, config.color)
      return
    }

    this.body.fillStyle(config.color, 1)

    if (config.type === 'ground') {
      this.body.fillRect(-half, -half, size, size)
      this.body.lineStyle(2, 0x00a2ff, 0.4)
      this.body.strokeRect(-half, -half, size, size)

      const indSize = 4
      this.body.fillStyle(0xffffff, 0.7)
      switch (facing) {
        case 'up':
          this.body.fillRect(-indSize / 2, -half - indSize - 1, indSize, indSize)
          break
        case 'down':
          this.body.fillRect(-indSize / 2, half + 1, indSize, indSize)
          break
        case 'right':
          this.body.fillRect(half + 1, -indSize / 2, indSize, indSize)
          break
        case 'left':
          this.body.fillRect(-half - indSize - 1, -indSize / 2, indSize, indSize)
          break
      }

      if (config.blockCount > 1) {
        const inner = size * 0.25
        this.body.fillStyle(0x00a2ff, 0.3)
        for (let i = 0; i < config.blockCount - 1; i++) {
          this.body.fillRect(-half + 4 + i * (inner + 2), half - inner - 4, inner, inner)
        }
      }
    } else {
      const faces = {
        up:    [{ x: 0, y: -half }, { x: -half, y: half }, { x: half, y: half }],
        down:  [{ x: 0, y: half }, { x: -half, y: -half }, { x: half, y: -half }],
        right: [{ x: half, y: 0 }, { x: -half, y: -half }, { x: -half, y: half }],
        left:  [{ x: -half, y: 0 }, { x: half, y: -half }, { x: half, y: half }],
      }
      const tri = faces[facing]
      this.body.fillTriangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y)
      this.body.lineStyle(2, 0x00a2ff, 0.4)
      this.body.strokeTriangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y)
    }
  }

  private drawCoreCasterIcon(size: number, _facing: Direction): void {
    drawCoreCasterIcon(this.body, 0, 0, size, this.config.color, 0x00a2ff, 0.4)
  }

  private drawHp(size: number): void {
    this.hpBar.clear()
    const half = size / 2
    const ratio = Math.max(0, this.currentHp / this.config.hp)
    const hpColor = ratio > 0.5 ? 0x00c853 : ratio > 0.25 ? 0xff9100 : 0xd32f2f
    this.hpBar.fillStyle(hpColor, 1)
    this.hpBar.fillRect(-half, -half - 8, size * ratio, 4)
  }

  private drawSp(size: number): void {
    this.spBar.clear()
    const half = size / 2
    const ratio = Math.max(0, Math.min(1, this.spProgress))
    const spColor = ratio >= 1 ? 0xffd700 : 0xff9100
    this.spBar.fillStyle(spColor, 1)
    this.spBar.fillRect(-half, -half - 3, size * ratio, 3)
  }

  updateCharges(current: number, max: number): void {
    if (current <= 0 || max <= 0) {
      this.chargeText.setVisible(false)
      return
    }
    const size = TILE_SIZE * 0.7
    const half = size / 2
    this.chargeText.setPosition(0, -half - 16)
    this.chargeText.setText(current.toString())
    this.chargeText.setVisible(true)
  }

  updateSp(progress: number): void {
    this.spProgress = progress
    this.drawSp(TILE_SIZE * 0.7)
  }

  updateHp(newHp: number): void {
    this.currentHp = newHp
    this.drawHp(TILE_SIZE * 0.7)
  }

  heal(amount: number): number {
    const canBeHealed = this.config.canBeHealed ?? true
    if (canBeHealed) {
      this.currentHp = Math.min(this.currentHp + amount, this.config.hp)
      this.drawHp(TILE_SIZE * 0.7)
    }
    return this.currentHp
  }

  takeDamage(amount: number): number {
    this.currentHp = Math.max(0, this.currentHp - amount)
    this.drawHp(TILE_SIZE * 0.7)
    if (this.container.scene) {
      this.container.scene.tweens.add({
        targets: this.container,
        alpha: 0.4,
        duration: 40,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
    }
    return this.currentHp
  }

  isAlive(): boolean {
    return this.currentHp > 0
  }

  destroy(): void {
    const scene = this.container.scene
    if (scene) {
      if (!scene.textures.exists('particle')) {
        const g = scene.make.graphics()
        g.fillStyle(0xffffff)
        g.fillRect(0, 0, 8, 8)
        g.generateTexture('particle', 8, 8)
        g.destroy()
      }

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

  setPosition(row: number, col: number, grid: Grid): void {
    this.row = row
    this.col = col
    const pos = grid.tileToPixel(row, col)
    this.container.setPosition(pos.x, pos.y)
  }
}
