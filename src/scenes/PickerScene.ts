import Phaser from 'phaser'
import { UnitConfig, UnitTrait } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS, FONT_SIZE } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'

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
const CARD_W = 160
const CARD_H = 190
const CARD_GAP = 12
const FILTER_W = 52
const ARCHETYPE_ORDER = ['all', 'vanguard', 'guard', 'defender', 'sniper', 'caster', 'medic', 'supporter']
const ARCHETYPE_COLORS: Record<string, number> = {
  all: 0x78909c,
  vanguard: 0x4fc3f7,
  guard: 0xe53935,
  defender: 0x5c6bc0,
  sniper: 0x66bb6a,
  caster: 0xab47bc,
  medic: 0xec407a,
  supporter: 0xffa726,
}

export class PickerScene extends Phaser.Scene {
  private slotIndex: number = -1
  private available: UnitConfig[] = []
  private pickedUnit: UnitConfig | null = null
  private cardScrollX: number = 0
  private cardScrollMax: number = 0
  private cardScrollContainer!: Phaser.GameObjects.Container
  private infoContainer!: Phaser.GameObjects.Container
  private confirmBtn!: Phaser.GameObjects.Container
  private cardContainers: { bg: Phaser.GameObjects.Graphics; unit: UnitConfig; lx: number; ly: number }[] = []
  private startX = 0
  private startY = 0
  private activeFilter: string | null = null
  private W = 1280
  private H = 720
  private filterBtns: { key: string; bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[] = []

  constructor() {
    super({ key: 'PickerScene' })
  }

  init(data: { slotIndex: number; squad: (UnitConfig | null)[] }): void {
    this.slotIndex = data.slotIndex
    this.available = UNIT_CONFIGS
    this.pickedUnit = null
    this.cardScrollX = 0
  }

  create(): void {
    this.W = 1280
    this.H = 720

    const mainBg = this.add.graphics()
    mainBg.fillStyle(0xeef2f5, 1)
    mainBg.fillRect(0, 0, this.W, this.H)

    const sidebarBg = this.add.graphics()
    sidebarBg.fillStyle(0xe8ecf0, 1)
    sidebarBg.fillRect(0, 0, SIDEBAR_W, this.H)

    this.add.text(SIDEBAR_W / 2, 20, 'SELECT UNIT', {
      ...FONTS.h3, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.infoContainer = this.add.container(0, 0)

    this.confirmBtn = this.add.container(-100, -100)
    this.confirmBtn.setVisible(false)

    const cancelBtn = makeNodeButton(this, 10, this.H - 38, '< Back', () => this.closePicker(), {
      w: SIDEBAR_W - 20, h: 34, textSize: FONT_SIZE.xs,
    })

    this.activeFilter = null
    this.startX = SIDEBAR_W + 12
    this.startY = 16
    this.buildFilterButtons()
    this.buildCardGrid()
  }

  private buildFilterButtons(): void {
    this.filterBtns = []
    const fx = this.W - FILTER_W - 6
    const btnSize = 44
    const gap = 4
    const startY = 48

    const stripBg = this.add.graphics()
    stripBg.fillStyle(0xe8ecf0, 0.6)
    stripBg.fillRect(fx - 2, 48, FILTER_W + 4, ARCHETYPE_ORDER.length * (btnSize + gap) + 8)

    ARCHETYPE_ORDER.forEach((key, i) => {
      const by = startY + i * (btnSize + gap)
      const color = ARCHETYPE_COLORS[key] ?? 0x78909c

      const bg = this.add.graphics()
      bg.fillStyle(key === this.activeFilter ? color : 0xffffff, key === this.activeFilter ? 0.9 : 0.5)
      bg.fillRoundedRect(fx, by, btnSize, btnSize, 4)
      bg.lineStyle(key === this.activeFilter ? 2 : 1, color, key === this.activeFilter ? 1 : 0.4)
      bg.strokeRoundedRect(fx, by, btnSize, btnSize, 4)

      const label = key === 'all' ? 'ALL' : key.substring(0, 2).toUpperCase()
      const txt = this.add.text(fx + btnSize / 2, by + btnSize / 2, label, {
        fontSize: '13px', color: key === this.activeFilter ? '#ffffff' : COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
      }).setOrigin(0.5)

      bg.setInteractive(new Phaser.Geom.Rectangle(fx, by, btnSize, btnSize), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'
      bg.on('pointerdown', () => {
        const newFilter = key === 'all' ? null : key
        if (newFilter === this.activeFilter) return
        this.activeFilter = newFilter
        this.cardScrollX = 0
        this.rebuildGrid()
      })

      this.filterBtns.push({ key, bg, label: txt })
    })
  }

  private rebuildGrid(): void {
    this.cardScrollContainer.destroy()
    this.cardContainers = []
    this.startX = SIDEBAR_W + 12
    this.startY = 16

    for (const fb of this.filterBtns) {
      const isActive = (fb.key === 'all' && this.activeFilter === null) || fb.key === this.activeFilter
      const color = ARCHETYPE_COLORS[fb.key] ?? 0x78909c
      fb.bg.clear()
      fb.bg.fillStyle(isActive ? color : 0xffffff, isActive ? 0.9 : 0.5)
      fb.bg.fillRoundedRect(0, 0, 36, 36, 4)
      fb.bg.lineStyle(isActive ? 2 : 1, color, isActive ? 1 : 0.4)
      fb.bg.strokeRoundedRect(0, 0, 36, 36, 4)
      fb.label.setColor(isActive ? '#ffffff' : COLORS.text.dim)
    }

    this.buildCardGrid()
  }

  private buildCardGrid(): void {
    this.cardContainers = []
    this.cardScrollContainer = this.add.container(0, 0)

    const filtered = this.activeFilter
      ? this.available.filter(u => u.archetype === this.activeFilter)
      : this.available

    const cols = Math.ceil(filtered.length / 2)
    const totalW = cols * (CARD_W + CARD_GAP)
    const filterEnd = this.W - FILTER_W - 6
    const visibleW = filterEnd - (SIDEBAR_W + 12) - 6
    this.cardScrollMax = Math.max(0, totalW - visibleW)

    filtered.forEach((unit, i) => {
      const row = i % 2
      const col = Math.floor(i / 2)
      const lx = col * (CARD_W + CARD_GAP)
      const ly = row * (CARD_H + CARD_GAP)

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(lx, ly, CARD_W, CARD_H, 6)
      bg.lineStyle(2, unit.color, 0.6)
      bg.strokeRoundedRect(lx, ly, CARD_W, CARD_H, 6)
      bg.setInteractive(new Phaser.Geom.Rectangle(lx, ly, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'
      this.cardScrollContainer.add(bg)

      const iconSize = 72
      const iconTop = ly + 37
      const icon = this.add.graphics()
      if (unit.type === 'ground') {
        icon.fillStyle(unit.color, 1)
        icon.fillRoundedRect(lx + CARD_W / 2 - iconSize / 2, iconTop, iconSize, iconSize, 8)
        icon.fillStyle(0xffffff, 0.2)
        icon.fillRoundedRect(lx + CARD_W / 2 - iconSize / 4, iconTop + iconSize / 4, iconSize / 2, iconSize / 2, 4)
      } else {
        icon.fillStyle(unit.color, 1)
        icon.fillTriangle(lx + CARD_W / 2, iconTop, lx + CARD_W / 2 - iconSize / 2, iconTop + iconSize, lx + CARD_W / 2 + iconSize / 2, iconTop + iconSize)
        icon.fillStyle(0xffffff, 0.2)
        icon.fillTriangle(lx + CARD_W / 2, iconTop + iconSize / 4, lx + CARD_W / 2 - iconSize / 4, iconTop + iconSize * 0.75, lx + CARD_W / 2 + iconSize / 4, iconTop + iconSize * 0.75)
      }
      this.cardScrollContainer.add(icon)

      const label = this.add.text(lx + CARD_W / 2, ly + 119, unit.subtypeLabel, {
        fontSize: FONT_SIZE.xs, color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center', wordWrap: { width: CARD_W - 12 },
      }).setOrigin(0.5)
      this.cardScrollContainer.add(label)

      const arch = this.add.text(lx + CARD_W / 2, ly + 139, unit.archetype.toUpperCase(), {
        fontSize: FONT_SIZE.xs, color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5)
      this.cardScrollContainer.add(arch)

      this.cardContainers.push({ bg, unit, lx, ly })
    })

    this.cardScrollContainer.setPosition(this.startX, this.startY)

    const maskShape = this.make.graphics()
    maskShape.setPosition(this.startX, this.startY)
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(0, 0, visibleW, CARD_H * 2 + CARD_GAP)
    const mask = maskShape.createGeometryMask()
    this.cardScrollContainer.setMask(mask)

    let dragStartX = 0
    let dragStartScrollX = 0
    let dragDist = 0

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      this.cardScrollX = Phaser.Math.Clamp(this.cardScrollX - dy * 0.5, -this.cardScrollMax, 0)
      this.cardScrollContainer.x = this.startX + this.cardScrollX
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < SIDEBAR_W) return
      const filterEnd = this.W - FILTER_W - 6
      if (pointer.x > filterEnd) return
      dragStartX = pointer.x
      dragStartScrollX = this.cardScrollX
      dragDist = 0
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || dragStartX === 0) return
      dragDist = Math.abs(pointer.x - dragStartX)
      if (dragDist < 6) return
      this.cardScrollX = Phaser.Math.Clamp(dragStartScrollX + (pointer.x - dragStartX), -this.cardScrollMax, 0)
      this.cardScrollContainer.x = this.startX + this.cardScrollX
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (dragDist < 6 && dragStartX !== 0 && pointer.x > SIDEBAR_W) {
        const filterEnd = this.W - FILTER_W - 6
        if (pointer.x > filterEnd) { dragStartX = 0; return }
        const localX = pointer.x - this.cardScrollContainer.x
        const localY = pointer.y - this.cardScrollContainer.y
        for (const cc of this.cardContainers) {
          if (localX >= cc.lx && localX <= cc.lx + CARD_W &&
              localY >= cc.ly && localY <= cc.ly + CARD_H) {
            this.selectCard(cc.unit)
            break
          }
        }
      }
      dragStartX = 0
    })
  }

  private selectCard(unit: UnitConfig): void {
    this.pickedUnit = unit
    for (const cc of this.cardContainers) {
      const isSelected = cc.unit.id === unit.id
      cc.bg.clear()
      cc.bg.fillStyle(0xffffff, 1)
      cc.bg.fillRoundedRect(cc.lx, cc.ly, CARD_W, CARD_H, 6)
      cc.bg.lineStyle(isSelected ? 3 : 2, isSelected ? 0x00a2ff : cc.unit.color, isSelected ? 1 : 0.6)
      cc.bg.strokeRoundedRect(cc.lx, cc.ly, CARD_W, CARD_H, 6)
    }
    this.showInfo(unit)
    this.showConfirm()
  }

  private showInfo(unit: UnitConfig): void {
    this.infoContainer.removeAll(true)
    const px = 8
    let py = 60

    const iconSize = 72
    const cx = SIDEBAR_W / 2
    const icon = this.add.graphics()
    const iy = 92 - iconSize / 2
    if (unit.type === 'ground') {
      icon.fillStyle(unit.color, 1)
      icon.fillRoundedRect(cx - iconSize / 2, iy, iconSize, iconSize, 8)
      icon.fillStyle(0xffffff, 0.2)
      icon.fillRoundedRect(cx - iconSize / 4, iy + iconSize / 4, iconSize / 2, iconSize / 2, 4)
    } else {
      icon.fillStyle(unit.color, 1)
      icon.fillTriangle(cx, iy, cx - iconSize / 2, iy + iconSize, cx + iconSize / 2, iy + iconSize)
      icon.fillStyle(0xffffff, 0.2)
      icon.fillTriangle(cx, iy + iconSize / 4, cx - iconSize / 4, iy + iconSize * 0.75, cx + iconSize / 4, iy + iconSize * 0.75)
    }
    this.infoContainer.add(icon)

    py = iy + iconSize + 12
    const name = this.add.text(px, py, unit.subtypeLabel, {
      ...FONTS.h3, color: COLORS.text.primary,
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
        fontSize: '13px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      this.infoContainer.add(t)
      py += 18
    }

    py += 8
    const tHeader = this.add.text(px, py, 'TRAITS', {
      fontSize: '13px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.infoContainer.add(tHeader)
    py += 14

    if (unit.traits.length === 0) {
      this.infoContainer.add(this.add.text(px + 4, py, '—', {
        fontSize: '13px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }))
    } else {
      for (const t of unit.traits) {
        const desc = TRAIT_DESCRIPTIONS[t.traitId] ?? t.traitId
        const extra = t.value !== undefined ? ` (${t.value})` : t.duration !== undefined ? ` (${t.duration}s)` : ''
        this.infoContainer.add(this.add.text(px + 4, py, `• ${desc}${extra}`, {
          fontSize: '13px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', wordWrap: { width: SIDEBAR_W - 16 },
        }))
        py += 17
      }
    }
  }

  private showConfirm(): void {
    if (this.confirmBtn) this.confirmBtn.destroy()
    this.confirmBtn = makeNodeButton(this, 10, 618, `Confirm (${this.pickedUnit?.subtypeLabel ?? ''})`, () => this.confirmPick(), {
      w: SIDEBAR_W - 20, h: 34, textSize: FONT_SIZE.xs, role: 'primary',
    })
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
