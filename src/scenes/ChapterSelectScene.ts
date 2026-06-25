import Phaser from 'phaser'
import { COLORS, FONTS, FONT_SERIF } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'
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

    this.add.text(W / 2, 30, 'HOLDFAST', {
      ...FONTS.h1, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 72, 'Select a Chapter', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    const totalW = CHAPTERS.length * CARD_W + (CHAPTERS.length - 1) * 24
    const startX = (W - totalW) / 2
    const cardY = 170

    CHAPTERS.forEach((ch, i) => {
      const cx = startX + i * (CARD_W + 24) + CARD_W / 2

      const c = this.add.container(cx, cardY)
      const shadow = this.add.graphics()
      const gfx = this.add.graphics()
      c.add([shadow, gfx])

      const drawShadow = (pressed: boolean): void => {
        shadow.clear()
        if (!pressed) {
          const layers = [
            { off: 2, a: 0.08 }, { off: 4, a: 0.06 }, { off: 6, a: 0.04 },
            { off: 8, a: 0.03 }, { off: 10, a: 0.02 }, { off: 12, a: 0.01 },
          ]
          for (const l of layers) {
            shadow.fillStyle(0x000000, l.a)
            shadow.fillRect(l.off - CARD_W / 2, l.off, CARD_W, CARD_H)
          }
        } else {
          shadow.fillStyle(0x000000, 0.06)
          shadow.fillRect(2 - CARD_W / 2, 2, CARD_W, CARD_H)
          shadow.fillStyle(0x000000, 0.03)
          shadow.fillRect(4 - CARD_W / 2, 4, CARD_W, CARD_H)
        }
      }

      const draw = (pressed: boolean): void => {
        drawShadow(pressed)
        gfx.clear()
        gfx.fillGradientStyle(
          pressed ? COLORS.nodeButton.primaryTopPressed : COLORS.nodeButton.primaryTop,
          pressed ? COLORS.nodeButton.primaryTopPressed : COLORS.nodeButton.primaryTop,
          pressed ? COLORS.nodeButton.primaryBottomPressed : COLORS.nodeButton.primaryBottom,
          pressed ? COLORS.nodeButton.primaryBottomPressed : COLORS.nodeButton.primaryBottom,
        )
        gfx.fillRect(-CARD_W / 2, 0, CARD_W, CARD_H)
      }

      draw(false)

      const chNum = i
      const titleParts = ch.subtitle.split(' ')

      const numTxt = this.add.text(0, 24, `CHAPTER ${chNum}`, {
        fontSize: '12px',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        color: '#8a9aaa',
      }).setOrigin(0.5, 0)

      const titleTxt = this.add.text(0, 60, titleParts.join('\n'), {
        fontSize: '26px',
        fontFamily: FONT_SERIF,
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5, 0)

      const countTxt = this.add.text(0, CARD_H - 28, `${ch.levels.length} operation${ch.levels.length !== 1 ? 's' : ''}`, {
        fontSize: '12px',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        color: '#5d6d7d',
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
