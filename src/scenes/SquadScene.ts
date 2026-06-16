import Phaser from 'phaser'
import { UnitConfig, UnitTrait } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS, hex } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { TEST_LEVEL } from '../levels/testLevel'

const SLOT_SIZE = 100
const SLOT_GAP = 12
const COLS = 4
const ROWS = 3

const TRAIT_DESCRIPTIONS: Partial<Record<UnitTrait, string>> = {
  [UnitTrait.BlocksTwo]: 'Blocks up to 2 enemies',
  [UnitTrait.BlocksThree]: 'Blocks up to 3 enemies',
  [UnitTrait.DPOnKill]: 'Gains DP per kill',
  [UnitTrait.FullRefundRetreat]: 'Full DP refund on retreat',
  [UnitTrait.RangedAttack80]: '80% ATK when attacking at range',
  [UnitTrait.AoESplash]: 'AoE splash damage around target',
  [UnitTrait.ArtsDamage]: 'Deals thermal damage',
  [UnitTrait.FastAttack]: 'Fast attack speed',
  [UnitTrait.DoubleHit]: 'Attacks twice per cycle',
  [UnitTrait.HealOnAttack]: 'Heals self on attack',
  [UnitTrait.HealPerHitCapped]: 'Heals on kill',
  [UnitTrait.CannotBeHealed]: 'Cannot be healed by allies',
  [UnitTrait.SlowOnHit]: 'Slows enemies on hit',
  [UnitTrait.ChainJump]: 'Attack chains to nearby enemies',
  [UnitTrait.LinearAoE]: 'Hits all enemies in a line',
  [UnitTrait.TargetingLowestDef]: 'Prioritizes lowest DEF target',
  [UnitTrait.RangedWhenNotBlocking]: 'Uses ranged attack when not blocking',
  [UnitTrait.RangedAoEWhenNotBlocking]: 'Ranged AoE when not blocking',
  [UnitTrait.AttackHealsAlly]: 'Attack also heals an ally',
  [UnitTrait.HealAlly]: 'Heals a wounded ally',
  [UnitTrait.AoEHoT]: 'Area health over time',
  [UnitTrait.LongRangeAttack]: 'Extended attack range',
  [UnitTrait.PassiveDPRegen]: 'Passive DP generation',
}

export class SquadScene extends Phaser.Scene {
  private slots: (UnitConfig | null)[] = new Array(12).fill(null)
  private slotContainers: Phaser.GameObjects.Container[] = []
  private squadLabel!: Phaser.GameObjects.Text
  private pickerContainer!: Phaser.GameObjects.Container
  private pickerActive: boolean = false
  private selectedSlotIndex: number = -1
  private pickedUnit: UnitConfig | null = null
  private confirmBtn!: Phaser.GameObjects.Graphics
  private confirmTxt!: Phaser.GameObjects.Text
  private infoContainer!: Phaser.GameObjects.Container

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

    this.infoContainer = this.add.container(0, 0)
    this.infoContainer.setDepth(25)
    this.infoContainer.setVisible(false)

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
    this.pickedUnit = null
    this.pickerContainer.removeAll(true)
    this.infoContainer.removeAll(true)
    this.infoContainer.setVisible(false)

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.4)
    overlay.fillRect(0, 0, 1024, 768)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1024, 768), Phaser.Geom.Rectangle.Contains)
    overlay.on('pointerdown', () => {
      if (!this.pickedUnit) this.hidePicker()
    })
    this.pickerContainer.add(overlay)

    const panelX = 220
    const panelY = 380
    const panelW = 790
    const panelH = 380

    const panel = this.add.graphics()
    panel.fillStyle(COLORS.panel.bg, 1)
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8)
    panel.lineStyle(1, COLORS.panel.border, 0.6)
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8)
    this.pickerContainer.add(panel)

    const title = this.add.text(panelX + 10, panelY + 8, 'Select Unit (click a card)', {
      ...FONTS.body, color: COLORS.text.secondary,
    })
    this.pickerContainer.add(title)

    const available = UNIT_CONFIGS.filter(u => !this.slots.some(s => s?.id === u.id))
    const cardW = 120
    const cardH = 88
    const cardGap = 6
    const startX2 = panelX + 10
    const startY2 = panelY + 30
    const cols = 6

    const cardContainers: { bg: Phaser.GameObjects.Graphics; elements: Phaser.GameObjects.GameObject[]; unit: UnitConfig; cx: number; cy: number }[] = []

    available.forEach((unit, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = startX2 + col * (cardW + cardGap)
      const cy = startY2 + row * (cardH + cardGap)

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(cx, cy, cardW, cardH, 4)
      bg.lineStyle(1, unit.color, 0.5)
      bg.strokeRoundedRect(cx, cy, cardW, cardH, 4)
      bg.setInteractive(new Phaser.Geom.Rectangle(cx, cy, cardW, cardH), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'
      this.pickerContainer.add(bg)

      const label = this.add.text(cx + cardW / 2, cy + 12, unit.subtypeLabel, {
        ...FONTS.bodyBold, color: COLORS.text.primary, align: 'center',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(label)

      const arch = this.add.text(cx + cardW / 2, cy + 28, unit.archetype.toUpperCase(), {
        fontSize: '9px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(arch)

      const stats = this.add.text(cx + cardW / 2, cy + 44, `${unit.hp}HP ${unit.atk}ATK`, {
        fontSize: '9px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(stats)

      const dpLine = this.add.text(cx + cardW / 2, cy + 58, `${unit.dpCost}DP`, {
        fontSize: '9px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5, 0)
      this.pickerContainer.add(dpLine)

      const el: Phaser.GameObjects.GameObject[] = [bg, label, arch, stats, dpLine]
      cardContainers.push({ bg, elements: el, unit, cx, cy })

      bg.on('pointerdown', () => {
        this.selectPickedUnit(unit, cardContainers, cardW, cardH)
      })
    })

    this.confirmTxt = this.add.text(panelX + panelW - 10, panelY + 8, '', {
      ...FONTS.bodyBold, color: COLORS.text.success, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.confirmTxt.setOrigin(1, 0)
    this.confirmTxt.setAlpha(0)
    this.pickerContainer.add(this.confirmTxt)

    this.confirmBtn = this.add.graphics()
    this.confirmBtn.setAlpha(0)
    this.pickerContainer.add(this.confirmBtn)
  }

  private selectPickedUnit(
    unit: UnitConfig,
    cardContainers: { bg: Phaser.GameObjects.Graphics; cx: number; cy: number; unit: UnitConfig }[],
    cardW: number, cardH: number,
  ): void {
    this.pickedUnit = unit

    for (const cc of cardContainers) {
      cc.bg.clear()
      const isSelected = cc.unit.id === unit.id
      cc.bg.fillStyle(0xffffff, 1)
      cc.bg.fillRoundedRect(cc.cx, cc.cy, cardW, cardH, 4)
      cc.bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x00a2ff : cc.unit.color, isSelected ? 1 : 0.5)
      cc.bg.strokeRoundedRect(cc.cx, cc.cy, cardW, cardH, 4)
    }

    const current = cardContainers.find(c => c.unit.id === unit.id)
    if (!current) return

    this.confirmTxt.setText(`[ Confirm - ${unit.subtypeLabel} ]`)
    this.confirmTxt.setAlpha(1)

    this.confirmBtn.clear()
    this.confirmBtn.setAlpha(1)
    const btnX = current.cx
    const btnY = current.cy + cardH + 6
    this.confirmBtn.fillStyle(0x00c853, 0.15)
    this.confirmBtn.fillRoundedRect(btnX, btnY, 130, 22, 4)
    this.confirmBtn.lineStyle(1, 0x00c853, 0.6)
    this.confirmBtn.strokeRoundedRect(btnX, btnY, 130, 22, 4)
    this.confirmBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, 130, 22), Phaser.Geom.Rectangle.Contains)
    if (this.confirmBtn.input) this.confirmBtn.input.cursor = 'pointer'
    this.confirmBtn.removeAllListeners('pointerdown')
    this.confirmBtn.on('pointerdown', () => this.confirmPick())

    this.showUnitInfo(unit)
  }

  private showUnitInfo(unit: UnitConfig): void {
    this.infoContainer.removeAll(true)
    this.infoContainer.setVisible(true)

    const px = 14
    const py = 56

    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.9)
    bg.fillRoundedRect(px - 4, py - 4, 200, 320, 6)
    bg.lineStyle(1, unit.color, 0.5)
    bg.strokeRoundedRect(px - 4, py - 4, 200, 320, 6)
    this.infoContainer.add(bg)

    const name = this.add.text(px, py, unit.subtypeLabel, {
      ...FONTS.h3, color: COLORS.text.primary,
    })
    this.infoContainer.add(name)

    const arch = this.add.text(px, py + 22, `${unit.archetype.toUpperCase()} — ${unit.type === 'ground' ? 'GND' : 'RNG'}`, {
      ...FONTS.small, color: COLORS.text.dim,
    })
    this.infoContainer.add(arch)

    const dmIcon = unit.damageType === 'thermal' ? '~' : unit.damageType === 'true' ? '!!' : '>'
    const statsLines = [
      `HP: ${unit.hp}`,
      `ATK: ${dmIcon}${unit.atk}`,
      `DEF: ${unit.def}  |  INS: ${unit.insulation}`,
      `BLK: ${unit.blockCount}  |  DP: ${unit.dpCost}`,
      `Interval: ${unit.attackInterval.toFixed(2)}s`,
      unit.canBeHealed === false ? 'Cannot be healed' : 'Can be healed',
    ]

    let ly = py + 44
    for (const line of statsLines) {
      const t = this.add.text(px, ly, line, {
        fontSize: '11px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      this.infoContainer.add(t)
      ly += 16
    }

    ly += 4
    const tHeader = this.add.text(px, ly, 'TRAITS', {
      fontSize: '10px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.infoContainer.add(tHeader)
    ly += 16

    if (unit.traits.length === 0) {
      const none = this.add.text(px + 4, ly, '—', {
        fontSize: '10px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      this.infoContainer.add(none)
    } else {
      for (const t of unit.traits) {
        const desc = TRAIT_DESCRIPTIONS[t.traitId] ?? t.traitId
        const extra = t.value !== undefined ? ` (${t.value})` : t.duration !== undefined ? ` (${t.duration}s)` : ''
        const line = this.add.text(px + 4, ly, `• ${desc}${extra}`, {
          fontSize: '10px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', wordWrap: { width: 190 },
        })
        this.infoContainer.add(line)
        ly += 14
      }
    }
  }

  private confirmPick(): void {
    if (!this.pickedUnit || this.selectedSlotIndex < 0) return
    this.slots[this.selectedSlotIndex] = this.pickedUnit
    this.drawSlot(this.slotContainers[this.selectedSlotIndex], this.pickedUnit)
    this.updateSquadLabel()
    this.hidePicker()
  }

  private hidePicker(): void {
    this.pickerActive = false
    this.pickedUnit = null
    this.pickerContainer.removeAll(true)
    this.pickerContainer.setVisible(false)
    this.infoContainer.removeAll(true)
    this.infoContainer.setVisible(false)
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
