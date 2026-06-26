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

    this.cameras.main.fadeIn(300, 5, 0, 26)

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x05001A, 0x05001A, 0x0D0D30, 0x0D0D30)
    bg.fillRect(0, 0, W, H)

    const title = this.add.text(40, 60, 'HOLDFAST', {
      fontSize: '36px',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
      color: '#ffffff',
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
    accent.lineStyle(1, 0x4488FF, 1)
    accent.lineBetween(60, 105, 340, 105)

    for (const def of BTN_DEFS) {
      const c = this.add.container(def.x, def.y)
      const gfx = this.add.graphics()
      c.add(gfx)

      const txt = this.add.text(def.w / 2, def.h / 2, def.label, {
        fontSize: def.fontSize,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5)
      c.add(txt)

      const draw = (pressed: boolean): void => {
        gfx.clear()
        gfx.fillGradientStyle(
          pressed ? 0x0000A8 : 0x0004EB,
          pressed ? 0x0000A8 : 0x0004EB,
          pressed ? 0x000066 : 0x0000A8,
          pressed ? 0x000066 : 0x0000A8,
        )
        gfx.fillRect(0, 0, def.w, def.h)
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
