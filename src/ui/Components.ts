import Phaser from 'phaser'
import { UnitConfig, Direction } from '../types/index'
import { rotatePattern } from '../shared/utils/GridMath'
import { COLORS, FONTS, FONT_SIZE, CORNER_BRACKET_SIZE, BUTTON_BEVEL, GRID_BG, BORDER_STYLE } from './Constants'

const ICON_GRAY = 0x6B7280
const ICON_GRAY_BORDER = 0x4B5563

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

// Heater shield path: rounded top arc, straight flanks, chevron to point at bottom.
// Used by Protector — the baseline Defender silhouette.
function beginHeaterShieldPath(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, w: number, h: number,
): void {
  const topR = h * 0.35
  const topY = cy - topR
  g.beginPath()
  g.moveTo(cx - w, topY)
  g.arc(cx, topY, w, Math.PI, 0, false)
  g.lineTo(cx + w, cy + h * 0.15)
  g.lineTo(cx, cy + h * 0.7)
  g.lineTo(cx - w, cy + h * 0.15)
  g.closePath()
}

// Hexagonal shield path: flat top + bottom, straight flanks, chevron to point at bottom.
// Used by Guardian — pure geometric, no ornament.
function beginHexShieldPath(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, w: number, h: number,
): void {
  g.beginPath()
  g.moveTo(cx - w, cy - h * 0.35)        // top-left
  g.lineTo(cx + w, cy - h * 0.35)        // top-right (flat top)
  g.lineTo(cx + w * 0.85, cy + h * 0.15) // right shoulder
  g.lineTo(cx, cy + h * 0.7)             // bottom point
  g.lineTo(cx - w * 0.85, cy + h * 0.15) // left shoulder
  g.closePath()
}

export function drawProtectorIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const w = h * 0.6

  // Heater shield body
  g.fillStyle(ICON_GRAY, 1)
  beginHeaterShieldPath(g, cx, cy, w, h)
  g.fillPath()

  // Outer stroke
  g.lineStyle(1.5, ICON_GRAY_BORDER, borderAlpha)
  beginHeaterShieldPath(g, cx, cy, w, h)
  g.strokePath()

  // Shield boss (horizontal bar near top, the only interior detail)
  g.lineStyle(1.5, 0xffffff, 0.3)
  g.beginPath()
  g.moveTo(cx - w * 0.5, cy - h * 0.1)
  g.lineTo(cx + w * 0.5, cy - h * 0.1)
  g.strokePath()
}

export function drawGuardianIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const w = h * 0.6

  // Hexagonal shield body
  g.fillStyle(ICON_GRAY, 1)
  beginHexShieldPath(g, cx, cy, w, h)
  g.fillPath()

  // Outer stroke
  g.lineStyle(1.5, ICON_GRAY_BORDER, borderAlpha)
  beginHexShieldPath(g, cx, cy, w, h)
  g.strokePath()

  // Inner nested hexagonal emblem
  const iw = w * 0.55
  const ih = h * 0.75
  g.lineStyle(1.5, 0xffffff, 0.3)
  beginHexShieldPath(g, cx, cy + h * 0.05, iw, ih)
  g.strokePath()
}

export function drawJuggernautIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const hullW = h * 0.85  // wide horizontal mass
  const hullH = h * 0.45  // low profile
  const hullTopY = cy - h * 0.1
  const hullBotY = hullTopY + hullH
  const turretW = h * 0.18
  const turretH = h * 0.25
  const turret1X = cx - hullW * 0.45
  const turret2X = cx + hullW * 0.45

  // Two turrets on top
  g.fillStyle(ICON_GRAY, 1)
  g.fillRect(turret1X - turretW / 2, hullTopY - turretH, turretW, turretH)
  g.fillRect(turret2X - turretW / 2, hullTopY - turretH, turretW, turretH)

  // Hull (wide, low trapezoid with slight chevron at bottom)
  g.beginPath()
  g.moveTo(cx - hullW, hullTopY)
  g.lineTo(cx + hullW, hullTopY)
  g.lineTo(cx + hullW * 0.85, hullBotY)
  g.lineTo(cx, hullBotY + h * 0.12)
  g.lineTo(cx - hullW * 0.85, hullBotY)
  g.closePath()
  g.fillPath()

  // Hull outline
  g.lineStyle(1.5, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx - hullW, hullTopY)
  g.lineTo(cx + hullW, hullTopY)
  g.lineTo(cx + hullW * 0.85, hullBotY)
  g.lineTo(cx, hullBotY + h * 0.12)
  g.lineTo(cx - hullW * 0.85, hullBotY)
  g.closePath()
  g.strokePath()

  // Turret outlines
  g.strokeRect(turret1X - turretW / 2, hullTopY - turretH, turretW, turretH)
  g.strokeRect(turret2X - turretW / 2, hullTopY - turretH, turretW, turretH)

  // Tread/track indication (thin horizontal slot across the hull)
  g.lineStyle(1.5, 0xffffff, 0.25)
  g.beginPath()
  g.moveTo(cx - hullW * 0.7, hullTopY + hullH * 0.5)
  g.lineTo(cx + hullW * 0.7, hullTopY + hullH * 0.5)
  g.strokePath()
}

export function drawFortressIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const w = h * 0.7         // wide body
  const bodyTopY = cy - h * 0.15
  const bodyBotY = cy + h * 0.7
  const merlonW = w * 0.2    // merlon (raised section) width
  const merlonH = h * 0.2    // merlon height above body top

  // Crenellated top: 5 merlons (raised) separated by 4 crenels (gaps)
  // Using a single closed path that traces the top profile
  g.fillStyle(ICON_GRAY, 1)
  g.beginPath()
  g.moveTo(cx - w, bodyTopY)
  // 5 merlons across the top
  for (let i = 0; i < 5; i++) {
    const x0 = cx - w + i * (w * 2 / 5)
    g.lineTo(x0, bodyTopY - merlonH)              // up to merlon top
    g.lineTo(x0 + merlonW, bodyTopY - merlonH)    // across merlon top
    g.lineTo(x0 + merlonW, bodyTopY)              // back down
  }
  g.lineTo(cx + w, bodyTopY)                      // along body top
  g.lineTo(cx + w, bodyBotY)                      // down right side
  g.lineTo(cx - w, bodyBotY)                      // along bottom
  g.closePath()
  g.fillPath()

  // Outline (just the crenellated silhouette)
  g.lineStyle(1.5, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx - w, bodyTopY)
  for (let i = 0; i < 5; i++) {
    const x0 = cx - w + i * (w * 2 / 5)
    g.lineTo(x0, bodyTopY - merlonH)
    g.lineTo(x0 + merlonW, bodyTopY - merlonH)
    g.lineTo(x0 + merlonW, bodyTopY)
  }
  g.lineTo(cx + w, bodyTopY)
  g.lineTo(cx + w, bodyBotY)
  g.lineTo(cx - w, bodyBotY)
  g.closePath()
  g.strokePath()

  // Arched gate / portcullis at center bottom
  const gateW = w * 0.3
  const gateH = h * 0.35
  const gateTopY = bodyBotY - gateH
  const gateR = gateW / 2
  g.lineStyle(1.5, 0xffffff, 0.4)
  g.beginPath()
  g.moveTo(cx - gateW / 2, bodyBotY)
  g.lineTo(cx - gateW / 2, gateTopY + gateR)
  g.arc(cx, gateTopY + gateR, gateR, Math.PI, 0, false)
  g.lineTo(cx + gateW / 2, bodyBotY)
  g.strokePath()
}

export function drawArtsProtectorIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const w = h * 0.6
  const wingW = h * 0.18  // wing protrusion width
  const wingH = h * 0.18  // wing protrusion height

  // Body: heater shield with two angular wing cuts on upper sides
  // Path traces: left wing tip → top-left → arc over top → top-right → right wing tip → back to body
  g.fillStyle(ICON_GRAY, 1)
  g.beginPath()
  g.moveTo(cx - w - wingW, cy - h * 0.4 - wingH)  // left wing outer tip
  g.lineTo(cx - w, cy - h * 0.4)                  // back to body (top-left)
  g.arc(cx, cy - h * 0.4, w, Math.PI, 0, false)   // rounded top arc
  g.lineTo(cx + w, cy - h * 0.4)                  // top-right
  g.lineTo(cx + w + wingW, cy - h * 0.4 - wingH)  // right wing outer tip
  g.lineTo(cx + w, cy - h * 0.2)                  // back to body (mid-right)
  g.lineTo(cx + w, cy + h * 0.15)                 // down right shoulder
  g.lineTo(cx, cy + h * 0.7)                      // chevron to bottom point
  g.lineTo(cx - w, cy + h * 0.15)                 // up left side
  g.lineTo(cx - w, cy - h * 0.2)                  // back up to mid-left
  g.closePath()
  g.fillPath()

  // Outline
  g.lineStyle(1.5, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx - w - wingW, cy - h * 0.4 - wingH)
  g.lineTo(cx - w, cy - h * 0.4)
  g.arc(cx, cy - h * 0.4, w, Math.PI, 0, false)
  g.lineTo(cx + w, cy - h * 0.4)
  g.lineTo(cx + w + wingW, cy - h * 0.4 - wingH)
  g.lineTo(cx + w, cy - h * 0.2)
  g.lineTo(cx + w, cy + h * 0.15)
  g.lineTo(cx, cy + h * 0.7)
  g.lineTo(cx - w, cy + h * 0.15)
  g.lineTo(cx - w, cy - h * 0.2)
  g.closePath()
  g.strokePath()

  // Inner heater shield emblem (smaller version of Protector)
  const iw = w * 0.5
  g.lineStyle(1.5, 0xffffff, 0.3)
  g.beginPath()
  g.moveTo(cx - iw, cy - h * 0.15)
  g.arc(cx, cy - h * 0.15, iw, Math.PI, 0, false)
  g.lineTo(cx + iw, cy + h * 0.15)
  g.lineTo(cx, cy + h * 0.45)
  g.lineTo(cx - iw, cy + h * 0.15)
  g.closePath()
  g.strokePath()
}

export function drawSentryProtectorIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const w = h * 0.45            // narrower than Protector (taller-than-wide tower)
  const bodyTopY = cy - h * 0.65
  const baseTopY = cy + h * 0.35
  const baseBotY = cy + h * 0.7
  const merlonW = w * 0.35
  const merlonH = h * 0.12

  // Body: tall rectangular tower with flat top
  g.fillStyle(ICON_GRAY, 1)
  g.beginPath()
  g.moveTo(cx - w, bodyTopY)
  g.lineTo(cx + w, bodyTopY)
  g.lineTo(cx + w, baseTopY)         // down right side
  g.lineTo(cx - w, baseTopY)         // across at base top
  g.closePath()
  g.fillPath()

  // Battlemented base (5 merlons across the bottom)
  g.beginPath()
  g.moveTo(cx - w, baseTopY)
  for (let i = 0; i < 5; i++) {
    const x0 = cx - w + i * (w * 2 / 5)
    g.lineTo(x0, baseBotY - merlonH)
    g.lineTo(x0 + merlonW, baseBotY - merlonH)
    g.lineTo(x0 + merlonW, baseBotY)
    g.lineTo(x0 + (w * 2 / 5), baseBotY)  // across the bottom of this merlon (going to the next gap start)
  }
  g.lineTo(cx + w, baseTopY)
  g.closePath()
  g.fillPath()

  // Outline (body)
  g.lineStyle(1.5, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx - w, bodyTopY)
  g.lineTo(cx + w, bodyTopY)
  g.lineTo(cx + w, baseTopY)
  g.lineTo(cx - w, baseTopY)
  g.closePath()
  g.strokePath()

  // Outline (battlemented base)
  g.beginPath()
  g.moveTo(cx - w, baseTopY)
  for (let i = 0; i < 5; i++) {
    const x0 = cx - w + i * (w * 2 / 5)
    g.lineTo(x0, baseBotY - merlonH)
    g.lineTo(x0 + merlonW, baseBotY - merlonH)
    g.lineTo(x0 + merlonW, baseBotY)
  }
  g.lineTo(cx + w, baseBotY)
  g.lineTo(cx + w, baseTopY)
  g.strokePath()

  // Sentry slit (single vertical line in the middle of the body)
  g.lineStyle(1.5, 0xffffff, 0.3)
  g.beginPath()
  g.moveTo(cx, cy - h * 0.2)
  g.lineTo(cx, cy + h * 0.2)
  g.strokePath()
}

export function drawCoreCasterIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const drawDiamond = (scale: number, fill: number, alpha: number) => {
    const s = iconSize * scale / 2
    g.fillStyle(fill, alpha)
    g.beginPath()
    g.moveTo(cx, cy - s)
    g.lineTo(cx + s, cy)
    g.lineTo(cx, cy + s)
    g.lineTo(cx - s, cy)
    g.closePath()
    g.fillPath()
  }
  drawDiamond(1, ICON_GRAY, 1)
  g.lineStyle(1, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx, cy - iconSize / 2)
  g.lineTo(cx + iconSize / 2, cy)
  g.lineTo(cx, cy + iconSize / 2)
  g.lineTo(cx - iconSize / 2, cy)
  g.closePath()
  g.strokePath()
  drawDiamond(0.75, ICON_GRAY, 0.5)
  drawDiamond(0.35, 0xffffff, 0.35)
}

export function drawSplashCasterIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const rayLen = h * 0.45
  const rayW = h * 0.2
  const inner = h * 0.55

  // Central diamond
  g.fillStyle(ICON_GRAY, 1)
  g.beginPath()
  g.moveTo(cx, cy - inner)
  g.lineTo(cx + inner, cy)
  g.lineTo(cx, cy + inner)
  g.lineTo(cx - inner, cy)
  g.closePath()
  g.fillPath()

  // 4 splash rays (N, S, E, W)
  g.fillStyle(ICON_GRAY, 0.7)
  const rays: [number, number, number, number, number, number][] = [
    [cx, cy - h, cx - rayW, cy - inner, cx + rayW, cy - inner],
    [cx, cy + h, cx - rayW, cy + inner, cx + rayW, cy + inner],
    [cx - h, cy, cx - inner, cy - rayW, cx - inner, cy + rayW],
    [cx + h, cy, cx + inner, cy - rayW, cx + inner, cy + rayW],
  ]
  for (const [ax, ay, bx, by, dx, dy] of rays) {
    g.beginPath()
    g.moveTo(ax, ay)
    g.lineTo(bx, by)
    g.lineTo(dx, dy)
    g.closePath()
    g.fillPath()
  }

  // Border around center
  g.lineStyle(1, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx, cy - inner)
  g.lineTo(cx + inner, cy)
  g.lineTo(cx, cy + inner)
  g.lineTo(cx - inner, cy)
  g.closePath()
  g.strokePath()

  // White center highlight
  g.fillStyle(0xffffff, 0.3)
  g.beginPath()
  g.moveTo(cx, cy - inner * 0.35)
  g.lineTo(cx + inner * 0.35, cy)
  g.lineTo(cx, cy + inner * 0.35)
  g.lineTo(cx - inner * 0.35, cy)
  g.closePath()
  g.fillPath()
}

export function drawChainCasterIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const inner = h * 0.5
  const tip = h * 0.85

  // Lightning bolt (zigzag)
  g.fillStyle(ICON_GRAY, 1)
  g.beginPath()
  g.moveTo(cx + inner * 0.3, cy - tip)       // top-right
  g.lineTo(cx - inner * 0.1, cy - inner * 0.3)
  g.lineTo(cx + inner * 0.15, cy - inner * 0.2)
  g.lineTo(cx - inner * 0.3, cy + inner * 0.1)
  g.lineTo(cx + inner * 0.1, cy + inner * 0.25)
  g.lineTo(cx - inner * 0.3, cy + tip)        // bottom-left
  g.lineTo(cx + inner * 0.1, cy + inner * 0.45)
  g.lineTo(cx - inner * 0.05, cy + inner * 0.3)
  g.lineTo(cx + inner * 0.35, cy + inner * 0.1)
  g.lineTo(cx - inner * 0.05, cy - inner * 0.1)
  g.lineTo(cx + inner * 0.3, cy - inner * 0.3)
  g.closePath()
  g.fillPath()

  // Arc (representing chain jump between targets)
  g.lineStyle(2, ICON_GRAY_BORDER, borderAlpha * 0.6)
  g.beginPath()
  g.arc(cx - inner * 0.3, cy, inner * 0.6, -Math.PI * 0.5, Math.PI * 0.5, false)
  g.strokePath()

  // Second smaller arc
  g.beginPath()
  g.arc(cx + inner * 0.3, cy, inner * 0.4, -Math.PI * 0.3, Math.PI * 0.3, false)
  g.strokePath()

  // Center highlight
  g.fillStyle(0xffffff, 0.25)
  g.beginPath()
  g.moveTo(cx, cy - inner * 0.5)
  g.lineTo(cx + inner * 0.2, cy)
  g.lineTo(cx, cy + inner * 0.5)
  g.lineTo(cx - inner * 0.2, cy)
  g.closePath()
  g.fillPath()
}

export function drawMechAccordCasterIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const inner = h * 0.4
  const arm = h * 0.75

  // Drone body (central rounded square)
  g.fillStyle(ICON_GRAY, 1)
  g.fillRect(cx - inner, cy - inner, inner * 2, inner * 2)

  // Four arms (X shape)
  g.lineStyle(3, ICON_GRAY, 0.8)
  g.beginPath()
  g.moveTo(cx - arm, cy - arm); g.lineTo(cx + arm, cy + arm)
  g.moveTo(cx + arm, cy - arm); g.lineTo(cx - arm, cy + arm)
  g.strokePath()

  // Rotor tips (small circles at arm ends)
  g.fillStyle(ICON_GRAY, 0.7)
  const tip = arm
  g.fillCircle(cx - tip, cy - tip, 3)
  g.fillCircle(cx + tip, cy + tip, 3)
  g.fillCircle(cx + tip, cy - tip, 3)
  g.fillCircle(cx - tip, cy + tip, 3)

  // Upward arrow (ramp-up indicator)
  g.fillStyle(0xffffff, 0.5)
  const arrowH = inner * 0.6
  g.beginPath()
  g.moveTo(cx, cy - inner - arrowH)
  g.lineTo(cx - arrowH * 0.4, cy - inner - arrowH * 0.2)
  g.lineTo(cx, cy - inner - arrowH * 0.4)
  g.lineTo(cx + arrowH * 0.4, cy - inner - arrowH * 0.2)
  g.closePath()
  g.fillPath()

  // Center highlight
  g.fillStyle(0xffffff, 0.2)
  g.fillRect(cx - inner * 0.4, cy - inner * 0.4, inner * 0.8, inner * 0.8)
}

export function drawBlastCasterIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  iconSize: number,
  color: number,
  borderColor: number = 0x00a2ff,
  borderAlpha: number = 0.4,
): void {
  const h = iconSize / 2
  const inner = h * 0.5
  const beamLen = h * 0.8
  const beamW = h * 0.15
  const arrowW = h * 0.25

  // Central diamond
  g.fillStyle(ICON_GRAY, 1)
  g.beginPath()
  g.moveTo(cx, cy - inner)
  g.lineTo(cx + inner, cy)
  g.lineTo(cx, cy + inner)
  g.lineTo(cx - inner, cy)
  g.closePath()
  g.fillPath()

  // Horizontal beam (left)
  g.fillStyle(ICON_GRAY, 0.6)
  g.fillRect(cx - beamLen, cy - beamW, beamLen - inner, beamW * 2)
  // Left arrowhead
  g.beginPath()
  g.moveTo(cx - beamLen, cy)
  g.lineTo(cx - beamLen + arrowW, cy - arrowW)
  g.lineTo(cx - beamLen + arrowW, cy + arrowW)
  g.closePath()
  g.fillPath()

  // Horizontal beam (right)
  g.fillRect(cx + inner, cy - beamW, beamLen - inner, beamW * 2)
  // Right arrowhead
  g.beginPath()
  g.moveTo(cx + beamLen, cy)
  g.lineTo(cx + beamLen - arrowW, cy - arrowW)
  g.lineTo(cx + beamLen - arrowW, cy + arrowW)
  g.closePath()
  g.fillPath()

  // Border around center
  g.lineStyle(1, ICON_GRAY_BORDER, borderAlpha)
  g.beginPath()
  g.moveTo(cx, cy - inner)
  g.lineTo(cx + inner, cy)
  g.lineTo(cx, cy + inner)
  g.lineTo(cx - inner, cy)
  g.closePath()
  g.strokePath()

  // White center highlight
  g.fillStyle(0xffffff, 0.3)
  g.beginPath()
  g.moveTo(cx, cy - inner * 0.35)
  g.lineTo(cx + inner * 0.35, cy)
  g.lineTo(cx, cy + inner * 0.35)
  g.lineTo(cx - inner * 0.35, cy)
  g.closePath()
  g.fillPath()
}

function drawUnitIcon(g: Phaser.GameObjects.Graphics, unit: UnitConfig, cx: number, iconTop: number, iconSize: number): void {
  if (unit.id === 'protector') {
    drawProtectorIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'guardian') {
    drawGuardianIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'juggernaut') {
    drawJuggernautIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'fortress_defender') {
    drawFortressIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'arts_protector') {
    drawArtsProtectorIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'sentry_protector') {
    drawSentryProtectorIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'core_caster') {
    drawCoreCasterIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'splash_caster') {
    drawSplashCasterIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'blast_caster') {
    drawBlastCasterIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'chain_caster') {
    drawChainCasterIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.id === 'mech_accord_caster') {
    drawMechAccordCasterIcon(g, cx, iconTop + iconSize / 2, iconSize, unit.color)
  } else if (unit.type === 'ground') {
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
