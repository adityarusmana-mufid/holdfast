import Phaser from 'phaser'
import { COLORS } from '../ui/Constants'

const BTN_DEFS: {
  key: string; label: string; x: number; y: number; w: number; h: number; fontSize: string;
}[] = [
  { key: 'terminal', label: 'TERMINAL', x: 810, y: 261, w: 450, h: 98, fontSize: '20px' },
  { key: 'squad', label: 'SQUAD PRESET', x: 810, y: 375, w: 218, h: 84, fontSize: '18px' },
  { key: 'editor', label: 'LEVEL EDITOR', x: 1042, y: 375, w: 218, h: 84, fontSize: '18px' },
]

export class HomeBridgeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeBridgeScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.cameras.main.fadeIn(300, 255, 255, 255)

    const bg = this.add.graphics()
    bg.fillGradientStyle(0xffffff, 0xffffff, 0xf0f2f5, 0xe8ecf0)
    bg.fillRect(0, 0, W, H)

    const title = this.add.text(40, 60, 'HOLDFAST', {
      fontSize: '36px',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
      color: '#1a1a2e',
    })
    title.setAlpha(0)
    this.tweens.add({
      targets: title,
      x: 60,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeOut',
    })

    const accent = this.add.graphics()
    accent.lineStyle(1, 0xcfd8dc, 1)
    accent.lineBetween(60, 105, 340, 105)

    for (const def of BTN_DEFS) {
      const colors = {
        top: COLORS.nodeButton.primaryTop,
        bottom: COLORS.nodeButton.primaryBottom,
        pressedTop: COLORS.nodeButton.primaryTopPressed,
        pressedBottom: COLORS.nodeButton.primaryBottomPressed,
      }

      const c = this.add.container(def.x, def.y)
      const shadow = this.add.graphics()
      const gfx = this.add.graphics()
      c.add([shadow, gfx])

      const txt = this.add.text(def.w / 2, def.h / 2, def.label, {
        fontSize: def.fontSize,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5)
      c.add(txt)

      const draw = (pressed: boolean): void => {
        shadow.clear()
        gfx.clear()

        if (!pressed) {
          const layers = [
            { off: 2, a: 0.08 }, { off: 4, a: 0.06 }, { off: 6, a: 0.04 },
            { off: 8, a: 0.03 }, { off: 10, a: 0.02 }, { off: 12, a: 0.01 },
          ]
          for (const l of layers) {
            shadow.fillStyle(0x000000, l.a)
            shadow.fillRect(l.off, l.off, def.w, def.h)
          }
        } else {
          shadow.fillStyle(0x000000, 0.06)
          shadow.fillRect(2, 2, def.w, def.h)
          shadow.fillStyle(0x000000, 0.03)
          shadow.fillRect(4, 4, def.w, def.h)
        }

        gfx.fillGradientStyle(
          pressed ? colors.pressedTop : colors.top,
          pressed ? colors.pressedTop : colors.top,
          pressed ? colors.pressedBottom : colors.bottom,
          pressed ? colors.pressedBottom : colors.bottom,
        )
        gfx.fillRect(0, 0, def.w, def.h)
        gfx.lineStyle(1, pressed ? colors.pressedTop : colors.top, 0.3)
        gfx.strokeRect(0, 0, def.w, def.h)
      }

      draw(false)
      c.setSize(def.w, def.h)
      c.setInteractive(new Phaser.Geom.Rectangle(0, 0, def.w, def.h), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      c.on('pointerover', () => {
        this.tweens.add({ targets: c, scaleX: 1.04, scaleY: 1.04, duration: 150, ease: 'Sine.easeOut' })
      })

      c.on('pointerout', () => {
        const wasPressed = c.getData('pressed')
        if (wasPressed) return
        this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, x: def.x, y: def.y, duration: 150, ease: 'Sine.easeOut' })
      })

      c.on('pointerdown', () => {
        c.setData('pressed', true)
        draw(true)
        c.setPosition(def.x + 2, def.y + 2)
        this.tweens.add({ targets: c, scaleX: 0.98, scaleY: 0.98, duration: 80, ease: 'Sine.easeOut' })
      })

      c.on('pointerup', () => {
        c.setData('pressed', false)
        draw(false)
        c.setPosition(def.x, def.y)
        this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80, ease: 'Sine.easeOut' })
        switch (def.key) {
          case 'terminal': this.scene.start('ChapterSelectScene'); break
          case 'squad': this.scene.start('SquadScene', { levelId: 'menu', chapterId: 'menu', levelData: null }); break
          case 'editor': this.scene.start('EditorScene'); break
        }
      })

      const targetX = def.x
      c.x = targetX + 30
      c.setAlpha(0)
      const delay = def.key === 'terminal' ? 150 : def.key === 'squad' ? 250 : 350
      this.tweens.add({
        targets: c,
        x: targetX,
        alpha: 1,
        duration: 300,
        delay,
        ease: 'Sine.easeOut',
      })
    }
  }
}
