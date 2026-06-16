import Phaser from 'phaser'
import { UnitConfig, UnitTrait } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { TEST_LEVEL } from '../levels/testLevel'

const SLOT_SIZE = 100
const SLOT_GAP = 12
const COLS = 4
const ROWS = 3

export class SquadScene extends Phaser.Scene {
  private slots: (UnitConfig | null)[] = new Array(12).fill(null)
  private slotContainers: Phaser.GameObjects.Container[] = []
  private squadLabel!: Phaser.GameObjects.Text
  private pickerContainer!: Phaser.GameObjects.Container
  private pickerActive: boolean = false
  private selectedSlotIndex: number = -1

  constructor() {
    super({ key: 'SquadScene' })
  }

  create(): void {
    const W = 1024
    const H = 768

    this.add.text(W / 2, 20, 'SQUAD SELECTION', {
      ...FONTS.h2, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    makeButton(this, W - 150, 20, 'Auto Fill', () => this.autoFill(), { w: 110, h: 26, textSize: '11px' })

    const gridW = COLS * SLOT_SIZE + (COLS - 1) * SLOT_GAP
    const gridH = ROWS * SLOT_SIZE + (ROWS - 1) * SLOT_GAP
    const startX = (W - gridW) / 2
    const startY = 60

    this.slotContainers = []
    for (let i = 0; i < 12; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = startX + col * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2
      const y = startY + row * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2

      const c = this.add.container(x, y)
      this.drawSlot(c, null)
      c.setSize(SLOT_SIZE, SLOT_SIZE)
      c.setInteractive(new Phaser.Geom.Rectangle(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      const idx = i
      c.on('pointerdown', () => this.onSlotClick(idx))

      this.slotContainers.push(c)
    }

    this.squadLabel = this.add.text(W / 2, startY + gridH + 14, 'Squad: 0/12 selected', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    this.pickerContainer = this.add.container(0, 0)
    this.pickerContainer.setVisible(false)
    this.pickerContainer.setDepth(20)

    makeButton(this, 20, H - 48, 'Editor', () => {
      this.scene.start('EditorScene')
    }, { w: 100, h: 30 })

    makeButton(this, W - 160, H - 48, 'Start Mission', () => {
      const squad = this.slots.filter((s): s is UnitConfig => s !== null)
      if (squad.length === 0) return
      this.scene.start('GameScene', { level: TEST_LEVEL, squad })
    }, { w: 140, h: 30 })
  }

  private drawSlot(c: Phaser.GameObjects.Container, unit: UnitConfig | null): void {
    c.removeAll(true)
    const bg = this.add.graphics()

    if (unit) {
      bg.fillStyle(unit.color, 0.15)
      bg.fillRoundedRect(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, 6)
      bg.lineStyle(2, unit.color, 0.6)
      bg.strokeRoundedRect(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, 6)

      const label = this.add.text(0, -8, unit.subtypeLabel, {
        ...FONTS.bodyBold, color: COLORS.text.primary, align: 'center',
      }).setOrigin(0.5)

      const sub = this.add.text(0, 14, unit.archetype.toUpperCase(), {
        fontSize: '10px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5)

      const dpText = this.add.text(-SLOT_SIZE / 2 + 6, -SLOT_SIZE / 2 + 4, `${unit.dpCost} DP`, {
        fontSize: '9px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })

      c.add([bg, label, sub, dpText])
    } else {
      bg.fillStyle(0xe8ecf0, 0.5)
      bg.fillRoundedRect(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, 6)
      bg.lineStyle(1, 0xccd0d6, 0.8)
      bg.strokeRoundedRect(-SLOT_SIZE / 2, -SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, 6)

      const empty = this.add.text(0, 0, '+', {
        fontSize: '28px', color: '#ccd0d6', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5)

      c.add([bg, empty])
    }
  }

  private onSlotClick(index: number): void {
    if (this.pickerActive) return
    this.selectedSlotIndex = index

    if (this.slots[index] !== null) {
      this.slots[index] = null
      this.drawSlot(this.slotContainers[index], null)
      this.updateSquadLabel()
      return
    }

    this.showPicker()
  }

  private showPicker(): void {
    this.pickerActive = true
    this.pickerContainer.removeAll(true)

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.4)
    overlay.fillRect(0, 0, 1024, 768)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1024, 768), Phaser.Geom.Rectangle.Contains)
    overlay.on('pointerdown', () => this.hidePicker())
    this.pickerContainer.add(overlay)

    const panelH = 340
    const panelY = 768 - panelH
    const panel = this.add.graphics()
    panel.fillStyle(COLORS.panel.bg, 1)
    panel.fillRoundedRect(0, panelY, 1024, panelH, 8)
    panel.lineStyle(1, COLORS.panel.border, 0.6)
    panel.strokeRoundedRect(0, panelY, 1024, panelH, 8)
    this.pickerContainer.add(panel)

    const title = this.add.text(16, panelY + 10, 'Select Unit', {
      ...FONTS.h3, color: COLORS.text.primary,
    })
    this.pickerContainer.add(title)

    const cardW = 130
    const cardH = 100
    const cardGap = 8
    const startX = 16
    const startY2 = panelY + 40

    const available = UNIT_CONFIGS.filter(u => !this.slots.some(s => s?.id === u.id))

    available.forEach((unit, i) => {
      const col = i % 7
      const row = Math.floor(i / 7)
      const cx = startX + col * (cardW + cardGap)
      const cy = startY2 + row * (cardH + cardGap)

      const card = this.add.graphics()
      card.fillStyle(0xffffff, 1)
      card.fillRoundedRect(cx, cy, cardW, cardH, 4)
      card.lineStyle(1, unit.color, 0.5)
      card.strokeRoundedRect(cx, cy, cardW, cardH, 4)
      card.setInteractive(new Phaser.Geom.Rectangle(cx, cy, cardW, cardH), Phaser.Geom.Rectangle.Contains)
      if (card.input) card.input.cursor = 'pointer'
      this.pickerContainer.add(card)

      const name = this.add.text(cx + cardW / 2, cy + 16, unit.subtypeLabel, {
        ...FONTS.bodyBold, color: COLORS.text.primary, align: 'center',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(name)

      const archetype = this.add.text(cx + cardW / 2, cy + 34, unit.archetype.toUpperCase(), {
        fontSize: '10px', color: COLORS.text.dim, align: 'center', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(archetype)

      const stats = this.add.text(cx + cardW / 2, cy + 52, `${unit.hp}HP/${unit.atk}ATK/${unit.def}DEF`, {
        fontSize: '9px', color: COLORS.text.secondary, align: 'center', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(stats)

      const dpCost = this.add.text(cx + cardW / 2, cy + 68, `${unit.dpCost} DP / Blk ${unit.blockCount}`, {
        fontSize: '9px', color: COLORS.text.accent, align: 'center', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(dpCost)

      const traits = unit.traits.map(t =>
        Object.entries(UnitTrait).find(([_, v]) => v === t.traitId)?.[0] ?? ''
      ).filter(Boolean).join(', ')
      if (traits) {
        const t = this.add.text(cx + cardW / 2, cy + 82, traits, {
          fontSize: '8px', color: COLORS.text.dim, align: 'center', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', wordWrap: { width: cardW - 8 },
        }).setOrigin(0.5, 0)
        this.pickerContainer.add(t)
      }

      card.on('pointerdown', () => {
        if (this.selectedSlotIndex >= 0) {
          this.slots[this.selectedSlotIndex] = unit
          this.drawSlot(this.slotContainers[this.selectedSlotIndex], unit)
          this.updateSquadLabel()
        }
        this.hidePicker()
      })
    })
  }

  private hidePicker(): void {
    this.pickerActive = false
    this.pickerContainer.removeAll(true)
    this.pickerContainer.setVisible(false)
  }

  private autoFill(): void {
    const available = [...UNIT_CONFIGS]
    const count = Math.min(12, available.length)
    for (let i = 0; i < count; i++) {
      this.slots[i] = available[i]
      this.drawSlot(this.slotContainers[i], available[i])
    }
    this.updateSquadLabel()
  }

  private updateSquadLabel(): void {
    const count = this.slots.filter(s => s !== null).length
    this.squadLabel.setText(`Squad: ${count}/12 selected`)
  }
}
