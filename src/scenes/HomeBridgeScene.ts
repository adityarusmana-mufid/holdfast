import Phaser from 'phaser'
import { TOP_BAR } from '../ui/Constants'
import { drawGridBg, fillBeveledRect } from '../ui/Components'
import { isDevMode } from '../shared/SaveData'
import { Icosahedron } from '../effects/Icosahedron'
import { FireflyEffect } from '../effects/FireflyEffect'
import { SmokeAmbient } from '../effects/SmokeAmbient'
import { MouseParallax } from '../effects/MouseParallax'

interface BtnDef {
  key: string; label: string; x: number; y: number; w: number; h: number; fontSize: string; color: number
}

const BTN_DEFS: BtnDef[] = [
  { key: 'terminal', label: 'TERMINAL', x: 810, y: 261, w: 450, h: 98, fontSize: '20px', color: 0xFF6A00 },
  { key: 'squad', label: 'SQUAD PRESET', x: 810, y: 375, w: 218, h: 84, fontSize: '18px', color: 0x1877F2 },
  { key: 'editor', label: 'LEVEL EDITOR', x: 1042, y: 375, w: 218, h: 84, fontSize: '18px', color: 0x1877F2 },
  ...(isDevMode()
    ? [{ key: 'range', label: 'RANGE EDITOR (DEV)', x: 810, y: 475, w: 450, h: 56, fontSize: '14px', color: 0x4B5563 }]
    : []),
]

export class HomeBridgeScene extends Phaser.Scene {
  private ico?: Icosahedron

  constructor() {
    super({ key: 'HomeBridgeScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.cameras.main.fadeIn(300, 245, 245, 245)

    const bg = this.add.graphics()
    bg.fillGradientStyle(0xF5F5F5, 0xF5F5F5, 0xF0F0F0, 0xE8E8E8)
    bg.fillRect(0, 0, W, H)
    bg.setDepth(0)

    const smoke = new SmokeAmbient(this, W, H)
    smoke.setDepth(1)

    drawGridBg(this, W, H, 2)

    this.ico = new Icosahedron(this, 280, 340, 180)
    this.ico.setDepth(5)
    new MouseParallax(this, this.ico.container, 280, 340)

    const fireflies = new FireflyEffect(this, W, H)
    fireflies.setDepth(8)

    const title = this.add.text(40, TOP_BAR + 16, 'HOLDFAST', {
      fontSize: '36px',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
      color: '#1A1A1A',
    })
    title.setAlpha(0)
    title.setDepth(10)
    this.tweens.add({
      targets: title,
      x: 60,
      alpha: 1,
      duration: 350,
      ease: 'Sine.easeOut',
    })

    const accent = this.add.graphics()
    accent.lineStyle(2, 0xFF6A00, 1)
    accent.lineBetween(60, 105, 340, 105)
    accent.setDepth(10)

    for (const def of BTN_DEFS) {
      const c = this.add.container(def.x, def.y)
      c.setDepth(15)
      const gfx = this.add.graphics()
      c.add(gfx)

      const txt = this.add.text(def.w / 2, def.h / 2, def.label, {
        fontSize: def.fontSize,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5)
      c.add(txt)

      const pressedColor = def.color === 0xFF6A00 ? 0xE05E00
        : def.color === 0x1877F2 ? 0x1468D4
        : 0x3A4A5A

      const draw = (pressed: boolean): void => {
        gfx.clear()
        gfx.fillStyle(pressed ? pressedColor : def.color)
        fillBeveledRect(gfx, 0, 0, def.w, def.h)
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
          case 'range': this.scene.start('RangeEditorScene'); break
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

  shutdown(): void {
    this.ico?.destroy()
  }
}
