import Phaser from 'phaser'
import { UnitConfig, UnitTrait } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS, FONT_SIZE } from '../ui/Constants'

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

const SIDEBAR_W = 210
const CARD_W = 120
const CARD_H = 88
const CARD_GAP = 8

export class PickerScene extends Phaser.Scene {
  private slotIndex: number = -1
  private available: UnitConfig[] = []
  private pickedUnit: UnitConfig | null = null
  private cardScrollY: number = 0
  private cardScrollMax: number = 0
  private cardScrollContainer!: Phaser.GameObjects.Container
  private infoContainer!: Phaser.GameObjects.Container
  private confirmBtn!: Phaser.GameObjects.Graphics
  private cardContainers: { bg: Phaser.GameObjects.Graphics; unit: UnitConfig }[] = []

  constructor() {
    super({ key: 'PickerScene' })
  }

  init(data: { slotIndex: number; squad: (UnitConfig | null)[] }): void {
    this.slotIndex = data.slotIndex
    const taken = new Set(data.squad.filter((s): s is UnitConfig => s !== null).map(s => s.id))
    this.available = UNIT_CONFIGS.filter(u => !taken.has(u.id))
    this.pickedUnit = null
    this.cardScrollY = 0
  }

  create(): void {
    const W = 1280
    const H = 720

    const sidebarBg = this.add.graphics()
    sidebarBg.fillStyle(0xe8ecf0, 1)
    sidebarBg.fillRect(0, 0, SIDEBAR_W, H)

    this.add.text(SIDEBAR_W / 2, 20, 'SELECT UNIT', {
      ...FONTS.h3, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.infoContainer = this.add.container(0, 0)

    this.confirmBtn = this.add.graphics()
    this.confirmBtn.setAlpha(0)

    const cancelBg = this.add.graphics()
    cancelBg.setPosition(10, H - 62)
    cancelBg.fillStyle(0xffffff, 1)
    cancelBg.fillRoundedRect(0, 0, SIDEBAR_W - 20, 28, 4)
    cancelBg.lineStyle(1, 0xccd0d6, 0.8)
    cancelBg.strokeRoundedRect(0, 0, SIDEBAR_W - 20, 28, 4)
    cancelBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, SIDEBAR_W - 20, 28), Phaser.Geom.Rectangle.Contains)
    if (cancelBg.input) cancelBg.input.cursor = 'pointer'
    cancelBg.on('pointerup', () => this.closePicker())

    this.add.text(SIDEBAR_W / 2, H - 48, '< Back', {
      fontSize: '12px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    }).setOrigin(0.5)

    this.buildCardGrid(W, H)
  }

  private buildCardGrid(W: number, H: number): void {
    const cols = Math.floor((W - SIDEBAR_W - 20) / (CARD_W + CARD_GAP))
    const startX = SIDEBAR_W + 12
    const startY = 16

    this.cardContainers = []
    this.cardScrollContainer = this.add.container(0, 0)

    const rows = Math.ceil(this.available.length / cols)
    const totalH = rows * (CARD_H + CARD_GAP)
    const visibleH = H - startY - 16
    this.cardScrollMax = Math.max(0, totalH - visibleH)

    this.available.forEach((unit, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const lx = col * (CARD_W + CARD_GAP)
      const ly = row * (CARD_H + CARD_GAP)

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(lx, ly, CARD_W, CARD_H, 4)
      bg.lineStyle(1, unit.color, 0.5)
      bg.strokeRoundedRect(lx, ly, CARD_W, CARD_H, 4)
      bg.setInteractive(new Phaser.Geom.Rectangle(lx, ly, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'
      this.cardScrollContainer.add(bg)

      const label = this.add.text(lx + CARD_W / 2, ly + 12, unit.subtypeLabel, {
        ...FONTS.bodyBold, color: COLORS.text.primary, align: 'center',
      }).setOrigin(0.5, 0)
      this.cardScrollContainer.add(label)

      const arch = this.add.text(lx + CARD_W / 2, ly + 28, unit.archetype.toUpperCase(), {
        fontSize: '9px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5, 0)
      this.cardScrollContainer.add(arch)

      const stats = this.add.text(lx + CARD_W / 2, ly + 44, `${unit.hp}HP ${unit.atk}ATK`, {
        fontSize: '9px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5, 0)
      this.cardScrollContainer.add(stats)

      const dpLine = this.add.text(lx + CARD_W / 2, ly + 58, `${unit.dpCost}DP`, {
        fontSize: '9px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5, 0)
      this.cardScrollContainer.add(dpLine)

      this.cardContainers.push({ bg, unit })

      bg.on('pointerdown', () => this.selectCard(unit))
    })

    this.cardScrollContainer.setPosition(startX, startY)

    const maskShape = this.make.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(0, 0, W - SIDEBAR_W - 24, visibleH)
    const mask = maskShape.createGeometryMask()
    this.cardScrollContainer.setMask(mask)

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      this.cardScrollY = Phaser.Math.Clamp(this.cardScrollY - dy * 0.5, -this.cardScrollMax, 0)
      this.cardScrollContainer.y = startY + this.cardScrollY
    })
  }

  private selectCard(unit: UnitConfig): void {
    this.pickedUnit = unit
    for (const cc of this.cardContainers) {
      const isSelected = cc.unit.id === unit.id
      cc.bg.clear()
      cc.bg.fillStyle(0xffffff, 1)
      cc.bg.fillRoundedRect(cc.bg.x, cc.bg.y, CARD_W, CARD_H, 4)
      cc.bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x00a2ff : cc.unit.color, isSelected ? 1 : 0.5)
      cc.bg.strokeRoundedRect(cc.bg.x, cc.bg.y, CARD_W, CARD_H, 4)
    }
    this.showInfo(unit)
    this.showConfirm()
  }

  private showInfo(unit: UnitConfig): void {
    this.infoContainer.removeAll(true)
    const px = 8
    let py = 60

    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.9)
    bg.fillRoundedRect(0, py - 4, SIDEBAR_W - 4, 320, 6)
    bg.lineStyle(1, unit.color, 0.5)
    bg.strokeRoundedRect(0, py - 4, SIDEBAR_W - 4, 320, 6)
    this.infoContainer.add(bg)

    const name = this.add.text(px, py, unit.subtypeLabel, {
      ...FONTS.h3, color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.infoContainer.add(name)

    py += 22
    const arch = this.add.text(px, py, `${unit.archetype.toUpperCase()} — ${unit.type === 'ground' ? 'GND' : 'RNG'}`, {
      ...FONTS.small, color: COLORS.text.dim,
    })
    this.infoContainer.add(arch)

    py += 20
    const dmIcon = unit.damageType === 'thermal' ? '~' : unit.damageType === 'true' ? '!!' : '>'
    const statsLines = [
      `HP: ${unit.hp}`,
      `ATK: ${dmIcon}${unit.atk}`,
      `DEF: ${unit.def}  |  RES: ${unit.res}%`,
      `BLK: ${unit.blockCount}  |  DP: ${unit.dpCost}`,
      `Interval: ${unit.attackInterval.toFixed(2)}s`,
      unit.canBeHealed === false ? 'Cannot be healed' : 'Can be healed',
    ]
    for (const line of statsLines) {
      const t = this.add.text(px, py, line, {
        fontSize: '10px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      this.infoContainer.add(t)
      py += 14
    }

    py += 6
    const tHeader = this.add.text(px, py, 'TRAITS', {
      fontSize: '9px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.infoContainer.add(tHeader)
    py += 14

    if (unit.traits.length === 0) {
      this.infoContainer.add(this.add.text(px + 4, py, '—', {
        fontSize: '9px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }))
    } else {
      for (const t of unit.traits) {
        const desc = TRAIT_DESCRIPTIONS[t.traitId] ?? t.traitId
        const extra = t.value !== undefined ? ` (${t.value})` : t.duration !== undefined ? ` (${t.duration}s)` : ''
        this.infoContainer.add(this.add.text(px + 4, py, `• ${desc}${extra}`, {
          fontSize: '9px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', wordWrap: { width: SIDEBAR_W - 16 },
        }))
        py += 13
      }
    }
  }

  private showConfirm(): void {
    this.confirmBtn.clear()
    this.confirmBtn.setPosition(10, 620)
    this.confirmBtn.fillStyle(0x00c853, 0.15)
    this.confirmBtn.fillRoundedRect(0, 0, SIDEBAR_W - 20, 32, 4)
    this.confirmBtn.lineStyle(1, 0x00c853, 0.6)
    this.confirmBtn.strokeRoundedRect(0, 0, SIDEBAR_W - 20, 32, 4)
    this.confirmBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, SIDEBAR_W - 20, 32), Phaser.Geom.Rectangle.Contains)
    if (this.confirmBtn.input) this.confirmBtn.input.cursor = 'pointer'
    this.confirmBtn.setAlpha(1)
    this.confirmBtn.removeAllListeners('pointerup')
    this.confirmBtn.on('pointerup', () => this.confirmPick())

    const txt = this.add.text(SIDEBAR_W / 2, 636, `Confirm (${this.pickedUnit?.subtypeLabel ?? ''})`, {
      fontSize: '11px', color: COLORS.text.success, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.infoContainer.add(txt)
  }

  private confirmPick(): void {
    if (!this.pickedUnit || this.slotIndex < 0) return
    const squad = this.scene.get('SquadScene') as any
    if (squad.receivePickedUnit) {
      squad.receivePickedUnit(this.pickedUnit, this.slotIndex)
    }
    this.scene.stop()
  }

  private closePicker(): void {
    this.scene.stop()
  }
}
