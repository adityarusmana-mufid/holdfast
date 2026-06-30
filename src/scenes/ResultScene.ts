import Phaser from 'phaser'
import { COLORS, FONTS, FONT_SIZE, TOP_BAR } from '../ui/Constants'
import { drawGridBg } from '../ui/Components'
import { getLevelDef } from '../config/chapters'

export class ResultScene extends Phaser.Scene {
  private chapterId!: string
  private levelId!: string
  private outcome!: 'victory' | 'defeat'
  private stars!: number
  private livesRemaining!: number
  private enemiesDefeated!: number

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: {
    chapterId: string
    levelId: string
    outcome: 'victory' | 'defeat'
    stars: number
    livesRemaining: number
    enemiesDefeated: number
  }): void {
    this.chapterId = data.chapterId
    this.levelId = data.levelId
    this.outcome = data.outcome
    this.stars = data.stars
    this.livesRemaining = data.livesRemaining
    this.enemiesDefeated = data.enemiesDefeated
  }

  create(): void {
    const W = 1280
    const H = 720
    const isVictory = this.outcome === 'victory'
    const levelDef = getLevelDef(this.levelId)

    this.cameras.main.setBackgroundColor('#f4f7fa')
    drawGridBg(this, W, H)

    this.cameras.main.flash(isVictory ? 300 : 600, isVictory ? 0 : 200, isVictory ? 200 : 0, isVictory ? 83 : 50)

    this.add.text(W / 2, TOP_BAR + 36, isVictory ? 'SYNC COMPLETE' : 'SYNC FAILED', {
      ...FONTS.h1,
      color: isVictory ? '#00c853' : '#d32f2f',
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 160, levelDef?.name ?? this.levelId, {
      ...FONTS.h3, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    if (isVictory) {
      const starStr = '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars)
      this.add.text(W / 2, 210, starStr, {
        fontSize: '36px', color: '#b07000',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5, 0)
    }

    const statsY = isVictory ? 270 : 220
    const statsLines = [
      `Lives remaining: ${this.livesRemaining}`,
      `Enemies defeated: ${this.enemiesDefeated}`,
    ]
    statsLines.forEach((line, i) => {
      this.add.text(W / 2, statsY + i * 26, line, {
        ...FONTS.body, color: COLORS.text.secondary,
      }).setOrigin(0.5, 0)
    })

    this.add.text(W / 2, H - 60, 'Tap anywhere to return', {
      ...FONTS.small, color: COLORS.text.dim,
    }).setOrigin(0.5, 0)

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0)
    overlay.fillRect(0, 0, W, H)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains)
    overlay.on('pointerdown', () => {
      this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
    })
  }
}
