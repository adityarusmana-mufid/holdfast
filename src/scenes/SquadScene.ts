import Phaser from 'phaser'
import { UnitConfig, LevelData } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'

const SLOT_W = 130
const SLOT_H = 162
const SLOT_GAP = 12
const COLS = 6
const ROWS = 2

export class SquadScene extends Phaser.Scene {
  private slots: (UnitConfig | null)[] = new Array(12).fill(null)
  private slotContainers: Phaser.GameObjects.Container[] = []
  private squadLabel!: Phaser.GameObjects.Text

  private levelId: string = ''
  private chapterId: string = ''
  private levelData: LevelData | null = null

  constructor() {
    super({ key: 'SquadScene' })
  }

  init(data: { levelId: string; chapterId: string; levelData: LevelData }): void {
    this.levelId = data.levelId
    this.chapterId = data.chapterId
    this.levelData = data.levelData
  }

  create(): void {
    const W = 1280
    const H = 720

    this.add.text(W / 2, 20, 'SQUAD SELECTION', {
      ...FONTS.h2, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    makeButton(this, W - 150, 20, 'Auto Fill', () => this.autoFill(), { w: 110, h: 26, textSize: '11px' })

    const gridW = COLS * SLOT_W + (COLS - 1) * SLOT_GAP
    const gridH = ROWS * SLOT_H + (ROWS - 1) * SLOT_GAP
    const startX = (W - gridW) / 2
    const startY = 60

    this.slotContainers = []
    for (let i = 0; i < 12; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = startX + col * (SLOT_W + SLOT_GAP) + SLOT_W / 2
      const y = startY + row * (SLOT_H + SLOT_GAP) + SLOT_H / 2

      const c = this.add.container(x, y)
      this.drawSlot(c, null)
      c.setSize(SLOT_W, SLOT_H)
      c.setInteractive(new Phaser.Geom.Rectangle(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      const idx = i
      c.on('pointerdown', () => this.onSlotClick(idx))

      this.slotContainers.push(c)
    }

    this.squadLabel = this.add.text(W / 2, startY + gridH + 14, 'Squad: 0/12 selected', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    makeButton(this, 20, H - 48, '< Back', () => {
      this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
    }, { w: 100, h: 30 })

    makeButton(this, W - 160, H - 48, 'Start Mission', () => {
      const squad = this.slots.filter((s): s is UnitConfig => s !== null)
      if (squad.length === 0) return
      if (!this.levelData) return
      this.scene.start('GameScene', {
        level: this.levelData,
        squad,
        chapterId: this.chapterId,
        levelId: this.levelId,
        autoStart: true,
      })
    }, { w: 140, h: 30 })
  }

  private drawSlot(c: Phaser.GameObjects.Container, unit: UnitConfig | null): void {
    c.removeAll(true)
    const bg = this.add.graphics()

    if (unit) {
      bg.fillStyle(unit.color, 0.15)
      bg.fillRoundedRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 6)
      bg.lineStyle(2, unit.color, 0.6)
      bg.strokeRoundedRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 6)

      const iconSize = 48
      const iconTop = -52
      const icon = this.add.graphics()
      if (unit.type === 'ground') {
        icon.fillStyle(unit.color, 1)
        icon.fillRoundedRect(-iconSize / 2, iconTop, iconSize, iconSize, 6)
        icon.fillStyle(0xffffff, 0.2)
        icon.fillRoundedRect(-iconSize / 4, iconTop + iconSize / 4, iconSize / 2, iconSize / 2, 3)
      } else {
        icon.fillStyle(unit.color, 1)
        icon.fillTriangle(0, iconTop, -iconSize / 2, iconTop + iconSize, iconSize / 2, iconTop + iconSize)
        icon.fillStyle(0xffffff, 0.2)
        icon.fillTriangle(0, iconTop + iconSize / 4, -iconSize / 4, iconTop + iconSize * 0.75, iconSize / 4, iconTop + iconSize * 0.75)
      }

      const label = this.add.text(0, 8, unit.subtypeLabel, {
        ...FONTS.small, color: COLORS.text.primary, align: 'center', wordWrap: { width: SLOT_W - 8 },
      }).setOrigin(0.5)

      const sub = this.add.text(0, 34, unit.archetype.toUpperCase(), {
        fontSize: '10px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5)

      const dpText = this.add.text(-SLOT_W / 2 + 6, -SLOT_H / 2 + 4, `${unit.dpCost} DP`, {
        fontSize: '10px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })

      c.add([bg, icon, label, sub, dpText])
    } else {
      bg.fillStyle(0xe8ecf0, 0.5)
      bg.fillRoundedRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 6)
      bg.lineStyle(1, 0xccd0d6, 0.8)
      bg.strokeRoundedRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 6)

      const empty = this.add.text(0, 0, '+', {
        fontSize: '32px', color: '#ccd0d6', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5)

      c.add([bg, empty])
    }
  }

  private onSlotClick(index: number): void {
    if (this.slots[index] !== null) {
      this.slots[index] = null
      this.drawSlot(this.slotContainers[index], null)
      this.updateSquadLabel()
      return
    }

    this.scene.launch('PickerScene', { slotIndex: index, squad: this.slots })
  }

  receivePickedUnit(unit: UnitConfig, slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return
    this.slots[slotIndex] = unit
    this.drawSlot(this.slotContainers[slotIndex], unit)
    this.updateSquadLabel()
  }

  private autoFill(): void {
    const picks = [
      'pioneer',
      'charger',
      'protector',
      'fighter',
      'swordmaster',
      'medic_st',
      'incantation_medic',
      'core_caster',
      'sniper',
      'deadeye',
      'decel_binder',
      'bard_supporter',
    ]
    for (let i = 0; i < 12; i++) {
      const unit = UNIT_CONFIGS.find(u => u.id === picks[i]) ?? null
      this.slots[i] = unit
      this.drawSlot(this.slotContainers[i], unit)
    }
    this.updateSquadLabel()
  }

  private updateSquadLabel(): void {
    const count = this.slots.filter(s => s !== null).length
    this.squadLabel.setText(`Squad: ${count}/12 selected`)
  }
}
