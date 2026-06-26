import Phaser from 'phaser'
import { COLORS, FONT_SIZE } from './Constants'

export type NodeButtonRole = 'default' | 'primary' | 'danger' | 'disabled'

export interface NodeButtonStyle {
  w?: number
  h?: number
  role?: NodeButtonRole
  textColor?: string
  textSize?: string
}

function drawShadow(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const layers = [
    { off: 2, a: 0.08 },
    { off: 4, a: 0.06 },
    { off: 6, a: 0.04 },
    { off: 8, a: 0.03 },
    { off: 10, a: 0.02 },
    { off: 12, a: 0.01 },
  ]
  for (const l of layers) {
    g.fillStyle(0x000000, l.a)
    g.fillRect(l.off, l.off, w, h)
  }
}

const ROLE_COLORS: Record<string, { top: number; bottom: number; topPressed: number; bottomPressed: number }> = {
  default: {
    top: COLORS.nodeButton.defaultTop,
    bottom: COLORS.nodeButton.defaultBottom,
    topPressed: COLORS.nodeButton.defaultTopPressed,
    bottomPressed: COLORS.nodeButton.defaultBottomPressed,
  },
  primary: {
    top: COLORS.nodeButton.primaryTop,
    bottom: COLORS.nodeButton.primaryBottom,
    topPressed: COLORS.nodeButton.primaryTopPressed,
    bottomPressed: COLORS.nodeButton.primaryBottomPressed,
  },
  danger: {
    top: COLORS.nodeButton.dangerTop,
    bottom: COLORS.nodeButton.dangerBottom,
    topPressed: COLORS.nodeButton.dangerTopPressed,
    bottomPressed: COLORS.nodeButton.dangerBottomPressed,
  },
  disabled: {
    top: COLORS.nodeButton.defaultTop,
    bottom: COLORS.nodeButton.defaultBottom,
    topPressed: COLORS.nodeButton.defaultTopPressed,
    bottomPressed: COLORS.nodeButton.defaultBottomPressed,
  },
}

const ROLE_TEXT: Record<string, string> = {
  default: COLORS.text.primary,
  primary: '#ffffff',
  danger: '#ffffff',
  disabled: '#b0b8c4',
}

export function makeNodeButton(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  onClick: () => void,
  style: NodeButtonStyle = {},
): Phaser.GameObjects.Container {
  const W = style.w ?? 140
  const H = style.h ?? 48
  const role = style.role ?? 'default'
  const colors = ROLE_COLORS[role]
  const textColor = style.textColor ?? ROLE_TEXT[role]
  const textSize = style.textSize ?? FONT_SIZE.sm

  const c = scene.add.container(x, y)
  const shadow = scene.add.graphics()
  const bg = scene.add.graphics()

  let isPressed = false

  function draw(top: number, bottom: number, pressed: boolean): void {
    shadow.clear()
    bg.clear()

    if (!pressed) {
      drawShadow(shadow, W, H)
    } else {
      shadow.fillStyle(0x000000, 0.06)
      shadow.fillRect(2, 2, W, H)
      shadow.fillStyle(0x000000, 0.03)
      shadow.fillRect(4, 4, W, H)
    }

    bg.fillGradientStyle(top, top, bottom, bottom)
    bg.fillRect(0, 0, W, H)
  }

  draw(colors.top, colors.bottom, false)

  c.add([shadow, bg])

  const txt = scene.add.text(W / 2, H / 2, label, {
    fontSize: textSize,
    color: textColor,
    fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  }).setOrigin(0.5)

  c.add(txt)
  c.setSize(W, H)
  c.setInteractive(new Phaser.Geom.Rectangle(-4, -4, W + 8, H + 8), Phaser.Geom.Rectangle.Contains)
  if (c.input) c.input.cursor = 'pointer'

  c.on('pointerdown', () => {
    isPressed = true
    draw(colors.topPressed, colors.bottomPressed, true)
    c.setPosition(x + 2, y + 2)
  })

  c.on('pointerup', () => {
    if (!isPressed) return
    isPressed = false
    draw(colors.top, colors.bottom, false)
    c.setPosition(x, y)
    onClick()
  })

  c.on('pointerout', () => {
    if (!isPressed) return
    isPressed = false
    draw(colors.top, colors.bottom, false)
    c.setPosition(x, y)
  })

  return c
}

export function makeLabel(
  scene: Phaser.Scene,
  x: number, y: number,
  text: string,
  color: string = COLORS.text.secondary,
  size: string = FONT_SIZE.xs,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontSize: size, color, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  })
}
