import Phaser from 'phaser'
import { COLORS, FONTS, FONT_SIZE, TOP_BAR } from '../ui/Constants'
import { drawGridBg, drawCornerBrackets, makeNodeButton } from '../ui/Components'
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

    const panelW = 520
    const panelH = isVictory ? 310 : 260
    const panelX = (W - panelW) / 2
    const panelY = 72
    const panel = this.add.graphics()
    panel.fillStyle(0xf4f7fa, 0.96)
    panel.fillRect(panelX, panelY, panelW, panelH)
    panel.lineStyle(1, 0x0040ff, 0.18)
    panel.strokeRect(panelX, panelY, panelW, panelH)
    drawCornerBrackets(panel, panelX, panelY, panelW, panelH, 18, 0x0040ff, 0.42, 2)

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

    makeNodeButton(this, W / 2 - 110, H - 100, 'RETURN TO LEVELS', () => {
      this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
    }, { w: 220, h: 44, textSize: FONT_SIZE.sm, role: 'primary' })
  }
}
