import Phaser from 'phaser'
import { COLORS, FONTS, hex } from './Constants'

export interface ButtonStyle {
  w?: number
  h?: number
  bgColor?: number
  borderColor?: number
  textColor?: string
  textSize?: string
}

export function makeButton(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  onClick: () => void,
  style: ButtonStyle = {},
): Phaser.GameObjects.Graphics {
  const w = style.w ?? 140
  const h = style.h ?? 30
  const bgColor = style.bgColor ?? COLORS.button.bg
  const borderColor = style.borderColor ?? COLORS.button.border
  const textColor = style.textColor ?? COLORS.text.accent
  const textSize = style.textSize ?? '12px'

  const bg = scene.add.graphics()
  bg.setPosition(x, y)
  bg.fillStyle(bgColor, 1)
  bg.fillRoundedRect(0, 0, w, h, 4)
  bg.lineStyle(1, borderColor, 0.8)
  bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
  if (bg.input) bg.input.cursor = 'pointer'

  const txt = scene.add.text(x + w / 2, y + h / 2, label, {
    fontSize: textSize, color: textColor, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  })
  txt.setOrigin(0.5)

  bg.on('pointerover', () => {
    bg.clear()
    bg.fillStyle(COLORS.button.hover, 1)
    bg.fillRoundedRect(0, 0, w, h, 4)
    bg.lineStyle(1, 0x00a2ff, 1)
  })
  bg.on('pointerout', () => {
    bg.clear()
    bg.fillStyle(bgColor, 1)
    bg.fillRoundedRect(0, 0, w, h, 4)
    bg.lineStyle(1, borderColor, 0.8)
  })
  bg.on('pointerdown', () => {
    bg.clear()
    bg.fillStyle(COLORS.button.active, 1)
    bg.fillRoundedRect(0, 0, w, h, 4)
    bg.lineStyle(1, borderColor, 1)
  })
  bg.on('pointerup', () => onClick())

  return bg
}

export function makeLabel(
  scene: Phaser.Scene,
  x: number, y: number,
  text: string,
  color: string = COLORS.text.secondary,
  size: string = '12px',
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontSize: size, color, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  })
}

export interface EditableValueConfig {
  label: string
  value: string
  color?: string
  onClick: () => void
}

export function makeEditableValue(
  scene: Phaser.Scene,
  x: number, y: number,
  config: EditableValueConfig,
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, `${config.label}: ${config.value}`, {
    fontSize: '12px', color: config.color ?? COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  })
  text.setInteractive({ cursor: 'pointer' })
  text.on('pointerover', () => text.setColor(COLORS.text.accent))
  text.on('pointerout', () => text.setColor(config.color ?? COLORS.text.secondary))
  text.on('pointerdown', () => config.onClick())
  return text
}

export function makeSectionHeader(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  expanded: boolean,
  count?: number,
  onToggle?: () => void,
  onAction?: () => void,
): { text: Phaser.GameObjects.Text; plusBtn?: Phaser.GameObjects.Text } {
  const suffix = expanded ? ' [hide]' : count !== undefined ? ` [${count}] [show]` : ''
  const header = scene.add.text(x, y, `${label}${suffix}`, {
    ...FONTS.h4, color: COLORS.text.accent,
  })
  header.setInteractive({ cursor: 'pointer' })
  if (onToggle) header.on('pointerdown', onToggle)

  let plusBtn: Phaser.GameObjects.Text | undefined
  if (expanded && onAction) {
    plusBtn = scene.add.text(x, y, '[+]', {
      ...FONTS.h4, color: COLORS.text.success,
    })
    plusBtn.setInteractive({ cursor: 'pointer' })
    plusBtn.on('pointerdown', onAction)
  }

  return { text: header, plusBtn }
}

export function makeCycleLabel(
  scene: Phaser.Scene,
  x: number, y: number,
  items: string[],
  currentIndex: number,
  displayFn: (item: string) => string,
  onChange: (newIndex: number) => void,
): Phaser.GameObjects.Text {
  const txt = scene.add.text(x, y, displayFn(items[currentIndex]), {
    fontSize: '12px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
  })
  txt.setInteractive({ cursor: 'pointer' })
  txt.on('pointerdown', () => {
    const next = (currentIndex + 1) % items.length
    txt.setText(displayFn(items[next]))
    onChange(next)
  })
  return txt
}

export function makeDelLabel(
  scene: Phaser.Scene,
  x: number, y: number,
  onClick: () => void,
): Phaser.GameObjects.Text {
  const txt = scene.add.text(x, y, '[del]', {
    fontSize: '11px', color: COLORS.text.danger, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  })
  txt.setInteractive({ cursor: 'pointer' })
  txt.on('pointerdown', onClick)
  return txt
}

export function makeAddLabel(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Text {
  const txt = scene.add.text(x, y, label, {
    fontSize: '11px', color: COLORS.text.success, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
  })
  txt.setInteractive({ cursor: 'pointer' })
  txt.on('pointerdown', onClick)
  return txt
}

export function destroyAll(elements: (Phaser.GameObjects.GameObject | undefined)[]): void {
  for (const e of elements) {
    if (e) e.destroy()
  }
}

export function promptNumber(
  scene: Phaser.Scene,
  label: string,
  current: number,
  onChange: (val: number) => void,
): void {
  const val = prompt(`${label}:`, String(current))
  if (val !== null) {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0) onChange(n)
  }
}

export function promptFloat(
  scene: Phaser.Scene,
  label: string,
  current: number,
  onChange: (val: number) => void,
): void {
  const val = prompt(`${label}:`, String(current))
  if (val !== null) {
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) onChange(n)
  }
}
