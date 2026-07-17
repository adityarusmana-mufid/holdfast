import Phaser from 'phaser'
import { COLORS, FONTS, FONT_SERIF, FONT_SIZE, TOP_BAR } from '../ui/Constants'
import { makeNodeButton, drawGridBg, drawCornerBrackets } from '../ui/Components'
import { CHAPTERS } from '../config/chapters'

const CARD_W = 200
const CARD_H = 260

export class ChapterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChapterSelectScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.cameras.main.fadeIn(300, 245, 245, 245)

    const bg = this.add.graphics()
    bg.fillGradientStyle(0xF5F5F5, 0xF5F5F5, 0xF0F0F0, 0xE8E8E8)
    bg.fillRect(0, 0, W, H)
    bg.setDepth(-100)

    drawGridBg(this, W, H, 2)

    this.add.text(W / 2, TOP_BAR + 12, 'Select a Chapter', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    const totalW = CHAPTERS.length * CARD_W + (CHAPTERS.length - 1) * 24
    const startX = (W - totalW) / 2
    const cardY = 160

    CHAPTERS.forEach((ch, i) => {
      const cx = startX + i * (CARD_W + 24) + CARD_W / 2

      const c = this.add.container(cx, cardY)
      const shadow = this.add.graphics()
      const gfx = this.add.graphics()
      const brackets = this.add.graphics()
      drawCornerBrackets(brackets, -CARD_W / 2, 0, CARD_W, CARD_H, 18, 0x0040FF, 0.20, 2)
      c.add([shadow, gfx, brackets])

      const draw = (pressed: boolean): void => {
        shadow.clear()
        gfx.clear()
        gfx.fillStyle(pressed ? 0xe8ecf0 : 0xF4F7FA, 1)
        gfx.fillRect(-CARD_W / 2, 0, CARD_W, CARD_H)
        gfx.lineStyle(1, 0x0040FF, 0.08)
        gfx.strokeRect(-CARD_W / 2, 0, CARD_W, CARD_H)
      }

      draw(false)

      const chNum = i
      const titleParts = ch.subtitle.split(' ')

      const numTxt = this.add.text(0, 24, `CHAPTER ${chNum}`, {
        fontSize: '12px',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        color: '#8E9AAF',
      }).setOrigin(0.5, 0)

      const titleTxt = this.add.text(0, 60, titleParts.join('\n'), {
        fontSize: '26px',
        fontFamily: FONT_SERIF,
        fontStyle: 'bold',
        color: COLORS.text.primary,
        align: 'center',
      }).setOrigin(0.5, 0)

      const countTxt = this.add.text(0, CARD_H - 28, `${ch.levels.length} operation${ch.levels.length !== 1 ? 's' : ''}`, {
        fontSize: '12px',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        color: '#4B5563',
      }).setOrigin(0.5, 0)

      c.add([numTxt, titleTxt, countTxt])
      c.setSize(CARD_W, CARD_H)
      c.setInteractive(new Phaser.Geom.Rectangle(-CARD_W / 2, 0, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      c.on('pointerover', () => {
        this.tweens.add({ targets: c, scaleX: 1.04, scaleY: 1.04, duration: 150, ease: 'Sine.easeOut' })
      })

      c.on('pointerout', () => {
        this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' })
        c.setPosition(cx, cardY)
      })

      c.on('pointerdown', () => {
        draw(true)
        c.setPosition(cx + 2, cardY + 2)
        this.tweens.add({ targets: c, scaleX: 0.98, scaleY: 0.98, duration: 80, ease: 'Sine.easeOut' })
      })

      c.on('pointerup', () => {
        draw(false)
        c.setPosition(cx, cardY)
        this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80, ease: 'Sine.easeOut' })
        this.scene.start('LevelSelectScene', { chapterId: ch.id })
      })
    })

    makeNodeButton(this, 16, 16, '< BACK', () => {
      this.scene.start('HomeBridgeScene')
    }, { w: 72, h: 32, textSize: '11px' })
    makeNodeButton(this, 94, 16, 'HOME', () => {
      this.scene.start('HomeBridgeScene')
    }, { w: 72, h: 32, textSize: '11px' })

    const isDev = new URLSearchParams(window.location.search).has('dev')
    if (isDev) {
      makeNodeButton(this, 20, H - 52, 'Editor', () => {
        this.scene.start('EditorScene')
      }, { w: 100 })
    }
  }
}
