import Phaser from 'phaser'
import { UnitConfig, Direction } from '../types/index'
import { rotatePattern } from '../shared/utils/GridMath'
import { COLORS, FONTS, FONT_SIZE, CORNER_BRACKET_SIZE, BUTTON_BEVEL, GRID_BG, BORDER_STYLE } from './Constants'

export type NodeButtonRole = 'default' | 'primary' | 'danger' | 'disabled'

export interface NodeButtonStyle {
  w?: number
  h?: number
  role?: NodeButtonRole
  textColor?: string
  textSize?: string
}

export function fillBeveledRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const bx = Math.round(w * BUTTON_BEVEL)
  const by = Math.round(h * 0.30)
  g.beginPath()
  g.moveTo(x + bx, y)
  g.lineTo(x + w, y)
  g.lineTo(x + w, y + h - by)
  g.lineTo(x + w - bx, y + h)
  g.lineTo(x, y + h)
  g.lineTo(x, y + by)
  g.closePath()
  g.fillPath()
}

export function drawCornerBrackets(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  size: number = CORNER_BRACKET_SIZE,
  color: number = 0x0040FF,
  alpha: number = 0.25,
  lineWidth: number = 2,
): void {
  g.lineStyle(lineWidth, color, alpha)
  g.beginPath(); g.moveTo(x, y + size); g.lineTo(x, y); g.lineTo(x + size, y); g.strokePath()
  g.beginPath(); g.moveTo(x + w - size, y); g.lineTo(x + w, y); g.lineTo(x + w, y + size); g.strokePath()
  g.beginPath(); g.moveTo(x, y + h - size); g.lineTo(x, y + h); g.lineTo(x + size, y + h); g.strokePath()
  g.beginPath(); g.moveTo(x + w - size, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w, y + h - size); g.strokePath()
}

export function drawGridBg(scene: Phaser.Scene, W: number, H: number, depth: number = -1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  g.setDepth(depth)
  g.lineStyle(1, GRID_BG.color, GRID_BG.alpha)
  const s = GRID_BG.spacing
  for (let x = 0; x <= W; x += s) g.lineBetween(x, 0, x, H)
  for (let y = 0; y <= H; y += s) g.lineBetween(0, y, W, y)
  return g
}

function drawBeveledShadow(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const layers = [
    { off: 2, a: 0.10 },
    { off: 4, a: 0.06 },
    { off: 6, a: 0.03 },
  ]
  for (const l of layers) {
    g.fillStyle(0x000000, l.a)
    fillBeveledRect(g, l.off, l.off, w, h)
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
  default: '#ffffff',
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
      drawBeveledShadow(shadow, W, H)
    } else {
      shadow.fillStyle(0x000000, 0.10)
      fillBeveledRect(shadow, 2, 2, W, H)
    }

    bg.fillStyle(top)
    fillBeveledRect(bg, 0, 0, W, H)
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

export const UNIT_CARD_W = 130
export const UNIT_CARD_H = 240

function drawUnitIcon(g: Phaser.GameObjects.Graphics, unit: UnitConfig, cx: number, iconTop: number, iconSize: number): void {
  if (unit.type === 'ground') {
    g.fillStyle(unit.color, 1)
    g.fillRect(cx - iconSize / 2, iconTop, iconSize, iconSize)
    g.fillStyle(0xffffff, 0.2)
    g.fillRect(cx - iconSize / 4, iconTop + iconSize / 4, iconSize / 2, iconSize / 2)
  } else {
    g.fillStyle(unit.color, 1)
    g.fillTriangle(cx, iconTop, cx - iconSize / 2, iconTop + iconSize, cx + iconSize / 2, iconTop + iconSize)
    g.fillStyle(0xffffff, 0.2)
    g.fillTriangle(cx, iconTop + iconSize / 4, cx - iconSize / 4, iconTop + iconSize * 0.75, cx + iconSize / 4, iconTop + iconSize * 0.75)
  }
}

// ponytail: single source of truth for unit card visuals — SquadScene & PickerScene share this.
export interface UnitCardOptions {
  selected?: boolean
  showDp?: boolean
}

export function drawUnitCard(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  unit: UnitConfig,
  ox: number, oy: number,
  opts: UnitCardOptions = {},
): void {
  const W = UNIT_CARD_W
  const H = UNIT_CARD_H
  const { selected = false, showDp = true } = opts

  const bg = scene.add.graphics()
  bg.fillStyle(0xF4F7FA, 1)
  bg.fillRect(ox, oy, W, H)
  bg.lineStyle(selected ? 3 : 1, 0x0040FF, selected ? 0.35 : BORDER_STYLE.subtleAlpha)
  bg.strokeRect(ox, oy, W, H)
  parent.add(bg)

  if (selected) {
    const brackets = scene.add.graphics()
    drawCornerBrackets(brackets, ox, oy, W, H, CORNER_BRACKET_SIZE, 0x0040FF, 0.30, 2)
    parent.add(brackets)
  }

  const iconSize = 48
  const iconTop = oy + 8
  const cx = ox + W / 2
  const icon = scene.add.graphics()
  drawUnitIcon(icon, unit, cx, iconTop, iconSize)
  parent.add(icon)

  const label = scene.add.text(cx, oy + 76, unit.subtypeLabel, {
    ...FONTS.small, color: COLORS.text.primary, align: 'center', wordWrap: { width: W - 8 },
  }).setOrigin(0.5)
  parent.add(label)

  const sub = scene.add.text(cx, oy + 102, unit.archetype.toUpperCase(), {
    fontSize: FONT_SIZE.xs, color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
  }).setOrigin(0.5)
  parent.add(sub)

  if (showDp) {
    const dpText = scene.add.text(ox + 6, oy + 4, `${unit.dpCost} DP`, {
      fontSize: FONT_SIZE.xs, color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    parent.add(dpText)
  }
}

export function drawEmptyUnitCard(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  ox: number, oy: number,
): void {
  const W = UNIT_CARD_W
  const H = UNIT_CARD_H
  const bg = scene.add.graphics()
  bg.fillStyle(0xe8ecf0, 0.5)
  bg.fillRect(ox, oy, W, H)
  bg.lineStyle(1, 0x0040FF, BORDER_STYLE.subtleAlpha)
  bg.strokeRect(ox, oy, W, H)
  parent.add(bg)

  const empty = scene.add.text(ox + W / 2, oy + H / 2, '+', {
    fontSize: '32px', color: '#5a6a7a', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  }).setOrigin(0.5)
  parent.add(empty)
}

export interface RangeMiniGridOptions {
  facing?: Direction
  cellSize?: number
  theme?: 'light' | 'dark'
}

export function drawRangeMiniGrid(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  pattern: number[][],
  ox: number, oy: number,
  opts: RangeMiniGridOptions = {},
): number {
  const facing = opts.facing ?? 'up'
  const cell = opts.cellSize ?? 14
  const theme = opts.theme ?? 'light'
  const rotated = rotatePattern(pattern, facing)
  const isDark = theme === 'dark'

  let minR = 0, maxR = 0, minC = 0, maxC = 0
  for (const [r, c] of rotated) {
    if (r < minR) minR = r
    if (r > maxR) maxR = r
    if (c < minC) minC = c
    if (c > maxC) maxC = c
  }

  const cols = maxC - minC + 1
  const rows = maxR - minR + 1
  const offsetC = -minC
  const offsetR = -minR

  const g = scene.add.graphics()
  parent.add(g)

  const tileFill = isDark ? 0xFFFFFF : 0x0040FF
  const tileAlpha = isDark ? 0.45 : 0.22
  const unitFill = isDark ? 0xFFFFFF : 0x0040FF
  const unitAlpha = isDark ? 1.0 : 0.55
  const borderColor = isDark ? 0xFFFFFF : 0x0040FF
  const borderAlpha = isDark ? 0.25 : BORDER_STYLE.subtleAlpha
  const gridLineColor = isDark ? 0xFFFFFF : 0x0040FF
  const gridLineAlpha = isDark ? 0.18 : BORDER_STYLE.subtleAlpha

  for (const [r, c] of rotated) {
    const tx = ox + (c + offsetC) * cell
    const ty = oy + (r + offsetR) * cell
    g.fillStyle(tileFill, tileAlpha)
    g.fillRect(tx + 1, ty + 1, cell - 2, cell - 2)
  }

  const unitX = ox + offsetC * cell
  const unitY = oy + offsetR * cell
  g.fillStyle(unitFill, unitAlpha)
  g.fillRect(unitX + 1, unitY + 1, cell - 2, cell - 2)
  g.lineStyle(1, borderColor, isDark ? 0.6 : BORDER_STYLE.activeAlpha)
  g.strokeRect(unitX + 0.5, unitY + 0.5, cell - 1, cell - 1)

  return rows * cell
}
