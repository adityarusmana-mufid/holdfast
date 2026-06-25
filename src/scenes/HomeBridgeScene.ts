import Phaser from 'phaser'
import { COLORS } from '../ui/Constants'

interface RoleColors {
  top: number; bottom: number; pressedTop: number; pressedBottom: number
}

const ROLE_FILLS: Record<string, RoleColors> = {
  primary: {
    top: COLORS.nodeButton.primaryTop,
    bottom: COLORS.nodeButton.primaryBottom,
    pressedTop: COLORS.nodeButton.primaryTopPressed,
    pressedBottom: COLORS.nodeButton.primaryBottomPressed,
  },
}

const ROLE_TEXT: Record<string, string> = {
  primary: '#ffffff',
}

const BTN_DEFS: {
  key: string; label: string; x: number; y: number; w: number; leftH: number; rightH: number; fontSize: string;
}[] = [
  { key: 'terminal', label: 'TERMINAL', x: 810, y: 272, w: 450, leftH: 86, rightH: 110, fontSize: '20px' },
  { key: 'squad', label: 'SQUAD PRESET', x: 810, y: 374, w: 218, leftH: 74, rightH: 94, fontSize: '18px' },
  { key: 'editor', label: 'LEVEL EDITOR', x: 1042, y: 374, w: 218, leftH: 74, rightH: 94, fontSize: '18px' },
]

function drawShadow(g: Phaser.GameObjects.Graphics, w: number, h: number, topOffset: number): void {
  const layers = [
    { off: 2, a: 0.08 }, { off: 4, a: 0.06 }, { off: 6, a: 0.04 },
    { off: 8, a: 0.03 }, { off: 10, a: 0.02 }, { off: 12, a: 0.01 },
  ]
  for (const l of layers) {
    g.fillStyle(0x000000, l.a)
    g.fillRect(l.off, l.off + topOffset, w, h)
  }
}

function drawTrapezoid(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, leftH: number, rightH: number,
  topColor: number, bottomColor: number,
): void {
  const mid = leftH / 2
  g.fillGradientStyle(topColor, topColor, bottomColor, bottomColor)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w, y + mid - rightH / 2)
  g.lineTo(x + w, y + mid + rightH / 2)
  g.lineTo(x, y + leftH)
  g.closePath()
  g.fillPath()
}

function drawBorder(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, leftH: number, rightH: number,
  color: number, alpha: number,
): void {
  const mid = leftH / 2
  g.lineStyle(1, color, alpha)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w, y + mid - rightH / 2)
  g.lineTo(x + w, y + mid + rightH / 2)
  g.lineTo(x, y + leftH)
  g.closePath()
  g.strokePath()
}

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
      const colors = ROLE_FILLS.primary
      const textColor = ROLE_TEXT.primary

      const c = this.add.container(def.x, def.y)
      const shadow = this.add.graphics()
      const gfx = this.add.graphics()
      const bdr = this.add.graphics()
      c.add([shadow, gfx, bdr])

      const txt = this.add.text(0, 0, def.label, {
        fontSize: def.fontSize,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
        color: textColor,
      }).setOrigin(0.5, 0.5)

      let isPressed = false
      let hoverTween: Phaser.Tweens.Tween | null = null
      const hoverRightH = def.key === 'terminal' ? 126 : 108

      const bboxTop = (leftH: number, rightH: number): number =>
        leftH / 2 - rightH / 2

      const draw = (pressed: boolean, leftH: number, rightH: number): void => {
        shadow.clear()
        gfx.clear()
        bdr.clear()

        const topOff = bboxTop(leftH, rightH)
        const bboxH = rightH
        if (!pressed) {
          drawShadow(shadow, def.w, bboxH, topOff)
        } else {
          shadow.fillStyle(0x000000, 0.06)
          shadow.fillRect(2, 2 + topOff, def.w, bboxH)
          shadow.fillStyle(0x000000, 0.03)
          shadow.fillRect(4, 4 + topOff, def.w, bboxH)
        }

        const tc = pressed ? colors.pressedTop : colors.top
        const bc = pressed ? colors.pressedBottom : colors.bottom
        drawTrapezoid(gfx, 0, 0, def.w, leftH, rightH, tc, bc)
        drawBorder(bdr, 0, 0, def.w, leftH, rightH, tc, 0.3)

        txt.setPosition(def.w / 2, leftH / 2)
      }

      draw(false, def.leftH, def.rightH)
      c.add(txt)

      const bboxH = def.rightH
      const topOff = bboxTop(def.leftH, def.rightH)
      c.setSize(def.w, bboxH)
      c.setInteractive(
        new Phaser.Geom.Rectangle(0, topOff, def.w, bboxH),
        Phaser.Geom.Rectangle.Contains,
      )
      if (c.input) c.input.cursor = 'pointer'

      c.on('pointerover', () => {
        if (isPressed) return
        if (hoverTween) hoverTween.stop()
        hoverTween = this.tweens.add({
          targets: {},
          duration: 150,
          onUpdate: (tween) => {
            const t = tween.progress
            const rh = def.rightH + (hoverRightH - def.rightH) * t
            draw(isPressed, def.leftH, rh)
          },
        })
      })

      c.on('pointerout', () => {
        const wasPressed = isPressed
        isPressed = false
        if (hoverTween) hoverTween.stop()
        hoverTween = this.tweens.add({
          targets: {},
          duration: 150,
          onUpdate: (tween) => {
            const t = tween.progress
            const rh = hoverRightH + (def.rightH - hoverRightH) * t
            draw(false, def.leftH, rh)
          },
        })
        if (wasPressed) c.setPosition(def.x, def.y)
      })

      c.on('pointerdown', () => {
        isPressed = true
        draw(true, def.leftH, def.rightH)
        c.setPosition(def.x + 2, def.y + 2)
      })

      c.on('pointerup', () => {
        if (!isPressed) return
        isPressed = false
        draw(false, def.leftH, def.rightH)
        c.setPosition(def.x, def.y)
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
