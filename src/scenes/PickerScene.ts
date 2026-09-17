import Phaser from 'phaser'
import { UnitConfig, UnitTrait } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS, FONT_SIZE, BORDER_STYLE, CORNER_BRACKET_SIZE, TOP_BAR, SIDEBAR_W } from '../ui/Constants'
import { makeNodeButton, drawGridBg, drawCornerBrackets, drawUnitCard, drawRangeMiniGrid, drawCoreCasterIcon, drawSplashCasterIcon, drawBlastCasterIcon, drawChainCasterIcon, drawMechAccordCasterIcon, drawProtectorIcon, drawGuardianIcon, drawJuggernautIcon, drawFortressIcon, drawArtsProtectorIcon, drawSentryProtectorIcon, drawPioneerIcon, drawChargerIcon, drawCenturionGuardIcon, drawLordGuardIcon, drawArtsFighterIcon, drawInstructorGuardIcon, drawFighterIcon, drawSwordmasterIcon, drawSolobladeIcon, drawReaperIcon, drawEarthshakerIcon, drawCrusherIcon, drawMedicIcon, drawMultiMedicIcon, drawIncantationMedicIcon, drawChainMedicIcon, drawMarksmanIcon, drawArtillerymanIcon, drawDeadeyeIcon, drawHeavyshooterIcon, drawSpreadshooterIcon, drawBesiegerIcon, drawFlingerIcon, drawPusherIcon, drawPullerIcon, drawExecutorIcon, drawAmbusherIcon, UNIT_CARD_W, UNIT_CARD_H } from '../ui/Components'

const TRAIT_DESCRIPTIONS: Partial<Record<UnitTrait, string>> = {
  [UnitTrait.BlocksTwo]: 'Blocks up to 2 enemies',
  [UnitTrait.BlocksThree]: 'Blocks up to 3 enemies',
  [UnitTrait.DPOnKill]: 'Gains DP per kill',
  [UnitTrait.FullRefundRetreat]: 'Full DP refund on retreat',
  [UnitTrait.RangedAttack80]: '80% ATK when attacking at range',
  [UnitTrait.RangedAttack120]: '120% ATK when attacking at range',
  [UnitTrait.AoESplash]: 'AoE splash damage around target',
  [UnitTrait.ArtsDamage]: 'Deals thermal damage',
  [UnitTrait.FastAttack]: 'Fast attack speed',
  [UnitTrait.DoubleHit]: 'Attacks twice per cycle',
  [UnitTrait.HealOnAttack]: 'Heals self on attack',
  [UnitTrait.HealPerHitCapped]: 'Heals on kill',
  [UnitTrait.CannotBeHealed]: 'Cannot be healed by allies',
  [UnitTrait.SlowOnHit]: 'Slows enemies on hit',
  [UnitTrait.ChainJump]: 'Attack chains to nearby enemies',
  [UnitTrait.DroneRamp]: 'Drone ramps up damage on the same target',
  [UnitTrait.LinearAoE]: 'Hits all enemies in a line',
  [UnitTrait.TargetingLowestDef]: 'Prioritizes lowest DEF target',
  [UnitTrait.RangedWhenNotBlocking]: 'Uses ranged attack when not blocking',
  [UnitTrait.RangedAoEWhenNotBlocking]: 'Ranged AoE when not blocking',
  [UnitTrait.SpreadAttack]: 'Attacks all enemies in range',
  [UnitTrait.AttackHealsAlly]: 'Attack also heals an ally',
  [UnitTrait.HealAlly]: 'Heals a wounded ally',
  [UnitTrait.AoEHoT]: 'Area health over time',
  [UnitTrait.LongRangeAttack]: 'Extended attack range',
  [UnitTrait.PassiveDPRegen]: 'Passive DP generation',
}

const FILTER_W = 52
const CARD_W = UNIT_CARD_W
const CARD_H = UNIT_CARD_H
const CARD_GAP = 12
const ARCHETYPE_ORDER = ['all', 'vanguard', 'guard', 'defender', 'sniper', 'caster', 'medic', 'supporter', 'specialist']
const ARCHETYPE_COLORS: Record<string, number> = {
  all: 0x78909c,
  vanguard: 0x4fc3f7,
  guard: 0xe53935,
  defender: 0x5c6bc0,
  sniper: 0x66bb6a,
  caster: 0xab47bc,
  medic: 0xec407a,
  supporter: 0xffa726,
  specialist: 0x00bcd4,
}

export class PickerScene extends Phaser.Scene {
  private slotIndex: number = -1
  private available: UnitConfig[] = []
  private pickedUnit: UnitConfig | null = null
  private selectedSkillId: string = ''
  private skillRects: { id: string; g: Phaser.GameObjects.Graphics; y: number }[] = []
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

  private pendingUnit: UnitConfig | null = null

  init(data: { slotIndex: number; currentUnit?: UnitConfig | null; currentSkillId?: string }): void {
    this.slotIndex = data.slotIndex
    this.available = UNIT_CONFIGS
    this.pickedUnit = null
    this.pendingUnit = data.currentUnit ?? null
    this.selectedSkillId = data.currentSkillId ?? ''
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

    this.infoContainer = this.add.container(0, 0)

    this.confirmBtn = this.add.container(-100, -100)
    this.confirmBtn.setVisible(false)

    makeNodeButton(this, 16, 16, '< BACK', () => this.closePicker(), {
      w: 72, h: 32, textSize: '11px',
    })
    makeNodeButton(this, 94, 16, 'HOME', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 72, h: 32, textSize: '11px' })

    this.activeFilter = null
    this.startX = SIDEBAR_W + 12
    this.startY = TOP_BAR + 8
    this.buildFilterButtons()
    this.buildCardGrid()

    if (this.pendingUnit) {
      this.selectCard(this.pendingUnit)
      this.pendingUnit = null
    }
  }

  private buildFilterButtons(): void {
    this.filterBtns = []
    const fx = this.W - FILTER_W - 6
    const btnSize = 44
    const gap = 4
    const startY = TOP_BAR + 8

    const stripBg = this.add.graphics()
    stripBg.fillStyle(0xe8ecf0, 0.6)
    stripBg.fillRect(fx - 2, TOP_BAR + 8, FILTER_W + 4, ARCHETYPE_ORDER.length * (btnSize + gap) + 8)

    ARCHETYPE_ORDER.forEach((key, i) => {
      const by = startY + i * (btnSize + gap)
      const color = ARCHETYPE_COLORS[key] ?? 0x78909c

      const bg = this.add.graphics()
      bg.fillStyle(key === this.activeFilter ? color : 0xffffff, key === this.activeFilter ? 0.9 : 0.5)
      bg.fillRect(fx, by, btnSize, btnSize)
      bg.lineStyle(key === this.activeFilter ? 2 : 1, color, key === this.activeFilter ? 1 : 0.4)
      bg.strokeRect(fx, by, btnSize, btnSize)

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
    this.startY = TOP_BAR + 8

    for (const fb of this.filterBtns) {
      const isActive = (fb.key === 'all' && this.activeFilter === null) || fb.key === this.activeFilter
      const color = ARCHETYPE_COLORS[fb.key] ?? 0x78909c
      fb.bg.clear()
      fb.bg.fillStyle(isActive ? color : 0xffffff, isActive ? 0.9 : 0.5)
      fb.bg.fillRect(0, 0, 36, 36)
      fb.bg.lineStyle(isActive ? 2 : 1, color, isActive ? 1 : 0.4)
      fb.bg.strokeRect(0, 0, 36, 36)
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
      bg.fillStyle(0xF4F7FA, 1)
      bg.fillRect(lx, ly, CARD_W, CARD_H)
      bg.lineStyle(1, 0x0040FF, BORDER_STYLE.subtleAlpha)
      bg.strokeRect(lx, ly, CARD_W, CARD_H)
      bg.setInteractive(new Phaser.Geom.Rectangle(lx, ly, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'
      this.cardScrollContainer.add(bg)

      const iconSize = 48
      const iconTop = ly + 8
      const cx = lx + CARD_W / 2
      const icon = this.add.graphics()
      if (unit.id === 'core_caster') {
        drawCoreCasterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'splash_caster') {
        drawSplashCasterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'blast_caster') {
        drawBlastCasterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'chain_caster') {
        drawChainCasterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'mech_accord_caster') {
        drawMechAccordCasterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'protector') {
        drawProtectorIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'guardian') {
        drawGuardianIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'juggernaut') {
        drawJuggernautIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'fortress_defender') {
        drawFortressIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'arts_protector') {
        drawArtsProtectorIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'sentry_protector') {
        drawSentryProtectorIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'centurion_guard') {
        drawCenturionGuardIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'lord_guard') {
        drawLordGuardIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'arts_fighter') {
        drawArtsFighterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'instructor_guard') {
        drawInstructorGuardIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'fighter') {
        drawFighterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'swordmaster') {
        drawSwordmasterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'soloblade') {
        drawSolobladeIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'reaper') {
        drawReaperIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'earthshaker') {
        drawEarthshakerIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'crusher') {
        drawCrusherIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'medic_st') {
        drawMedicIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'medic_multi') {
        drawMultiMedicIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'incantation_medic') {
        drawIncantationMedicIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'chain_medic') {
        drawChainMedicIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'sniper') {
        drawMarksmanIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'artilleryman') {
        drawArtillerymanIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'deadeye') {
        drawDeadeyeIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'heavyshooter') {
        drawHeavyshooterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'spreadshooter') {
        drawSpreadshooterIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'besieger') {
        drawBesiegerIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'flinger') {
        drawFlingerIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'pusher') {
        drawPusherIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'puller') {
        drawPullerIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'executor') {
        drawExecutorIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'ambusher') {
        drawAmbusherIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'pioneer') {
        drawPioneerIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.id === 'charger') {
        drawChargerIcon(icon, cx, iconTop + iconSize / 2, iconSize, unit.color)
      } else if (unit.type === 'ground') {
        icon.fillStyle(unit.color, 1)
        icon.fillRect(cx - iconSize / 2, iconTop, iconSize, iconSize)
        icon.fillStyle(0xffffff, 0.2)
        icon.fillRect(cx - iconSize / 4, iconTop + iconSize / 4, iconSize / 2, iconSize / 2)
      } else {
        icon.fillStyle(unit.color, 1)
        icon.fillTriangle(cx, iconTop, cx - iconSize / 2, iconTop + iconSize, cx + iconSize / 2, iconTop + iconSize)
        icon.fillStyle(0xffffff, 0.2)
        icon.fillTriangle(cx, iconTop + iconSize / 4, cx - iconSize / 4, iconTop + iconSize * 0.75, cx + iconSize / 4, iconTop + iconSize * 0.75)
      }
      this.cardScrollContainer.add(icon)

      const label = this.add.text(cx, ly + 76, unit.subtypeLabel, {
        ...FONTS.small, color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center', wordWrap: { width: CARD_W - 8 },
      }).setOrigin(0.5)
      this.cardScrollContainer.add(label)

      const arch = this.add.text(cx, ly + 102, unit.archetype.toUpperCase(), {
        fontSize: FONT_SIZE.xs, color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5)
      this.cardScrollContainer.add(arch)

      const dpText = this.add.text(lx + 6, ly + 4, `${unit.dpCost} DP`, {
        fontSize: FONT_SIZE.xs, color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      this.cardScrollContainer.add(dpText)

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
    if (this.pickedUnit && this.pickedUnit.id === unit.id) {
      this.pickedUnit = null
      this.selectedSkillId = ''
      for (const cc of this.cardContainers) {
        cc.bg.clear()
        cc.bg.fillStyle(0xF4F7FA, 1)
        cc.bg.fillRect(cc.lx, cc.ly, CARD_W, CARD_H)
        cc.bg.lineStyle(1, 0x0040FF, BORDER_STYLE.subtleAlpha)
        cc.bg.strokeRect(cc.lx, cc.ly, CARD_W, CARD_H)
      }
      const old = this.cardScrollContainer.getByName('brackets')
      if (old) old.destroy()
      this.infoContainer.removeAll(true)
      this.showConfirm()
      return
    }
    this.pickedUnit = unit
    for (const cc of this.cardContainers) {
      const isSelected = cc.unit.id === unit.id
      cc.bg.clear()
      cc.bg.fillStyle(0xF4F7FA, 1)
      cc.bg.fillRect(cc.lx, cc.ly, CARD_W, CARD_H)
      cc.bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x0040FF : 0x0040FF, isSelected ? 0.35 : BORDER_STYLE.subtleAlpha)
      cc.bg.strokeRect(cc.lx, cc.ly, CARD_W, CARD_H)
    }
    // remove old brackets if any
    const old = this.cardScrollContainer.getByName('brackets')
    if (old) old.destroy()
    const sel = this.cardContainers.find(cc => cc.unit.id === unit.id)
    if (sel) {
      const brackets = this.add.graphics()
      brackets.setName('brackets')
      brackets.setDepth(1)
      drawCornerBrackets(brackets, sel.lx, sel.ly, CARD_W, CARD_H, CORNER_BRACKET_SIZE, 0x0040FF, 0.30, 2)
      this.cardScrollContainer.add(brackets)
    }
    this.showInfo(unit)
    this.showConfirm()
  }

  private showInfo(unit: UnitConfig): void {
    this.infoContainer.removeAll(true)
    const px = 8
    let py = TOP_BAR + 8

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

    const dividerX = SIDEBAR_W / 2 + 2
    const panelGap = 6
    const panelW = (SIDEBAR_W - 16 - panelGap) / 2
    const statsX = 8
    const rangeX = statsX + panelW + panelGap
    const panelTop = py

    const statsDmIcon = unit.damageType === 'thermal' ? '~' : unit.damageType === 'true' ? '!!' : '>'
    const statsLines = [
      `HP  ${unit.hp}`,
      `ATK ${statsDmIcon}${unit.atk}`,
      `DEF ${unit.def}`,
      `RES ${unit.res}%`,
      `BLK ${unit.blockCount}`,
      `DP  ${unit.dpCost}`,
      `I   ${unit.attackInterval.toFixed(2)}s`,
    ]

    const statsBg = this.add.graphics()
    statsBg.fillStyle(0xE8EDF2, 1)
    statsBg.fillRect(statsX, panelTop, panelW, 1)
    this.infoContainer.add(statsBg)

    let sy = panelTop + 6
    for (const line of statsLines) {
      const lineBg = this.add.graphics()
      lineBg.fillStyle(0xF4F7FA, 1)
      lineBg.fillRect(statsX + 4, sy, panelW - 8, 16)
      this.infoContainer.add(lineBg)

      const t = this.add.text(statsX + 8, sy, line, {
        fontSize: '11px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      this.infoContainer.add(t)
      sy += 18
    }

    const rangePattern = unit.altRangePattern ?? unit.rangePattern

    const rangeHeaderH = 14
    const rangePadTop = 10
    const rangePadBot = 10
    const rangePadX = 10
    const RANGE_PANEL_H = 130
    const gridAreaW = panelW - rangePadX * 2
    const gridAreaH = RANGE_PANEL_H - rangeHeaderH - rangePadTop - rangePadBot

    let cols = 1, rows = 1
    {
      let minR = 0, maxR = 0, minC = 0, maxC = 0
      for (const [r, c] of rangePattern) {
        if (r < minR) minR = r
        if (r > maxR) maxR = r
        if (c < minC) minC = c
        if (c > maxC) maxC = c
      }
      cols = maxC - minC + 1
      rows = maxR - minR + 1
    }
    // ponytail: fixed cell size keeps the mini-grid visually consistent across units.
    // Sized to fit the largest pattern (deadeyeCross: 7 cols × 5 rows) inside the panel.
    const FIXED_CELL = 12
    const cellSize = FIXED_CELL

    const rangeBg = this.add.graphics()
    rangeBg.fillStyle(0x4B5563, 1)
    rangeBg.fillRect(rangeX, panelTop, panelW, RANGE_PANEL_H)
    this.infoContainer.add(rangeBg)

    const rHeader = this.add.text(rangeX + 8, panelTop + 1, 'RANGE', {
      fontSize: '10px', color: '#E8EDF2', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.infoContainer.add(rHeader)

    const gridW = cols * cellSize
    const gridH = rows * cellSize
    const gridOx = rangeX + rangePadX + Math.floor((gridAreaW - gridW) / 2)
    const gridOy = panelTop + rangeHeaderH + rangePadTop + Math.floor((gridAreaH - gridH) / 2)
    drawRangeMiniGrid(this, this.infoContainer, rangePattern, gridOx, gridOy, {
      facing: 'right',
      cellSize,
      theme: 'dark',
    })

    const panelBottom = Math.max(sy + 6, panelTop + RANGE_PANEL_H + 4)
    py = panelBottom

    py += 4
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

    this.showSkills(unit, py + 8)
  }

  private showSkills(unit: UnitConfig, py: number): number {
    this.infoContainer.add(this.add.text(8, py, 'SKILLS', {
      fontSize: '13px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    }))
    py += 16
    this.skillRects = []

    if (!unit.skills?.length) {
      this.infoContainer.add(this.add.text(8, py, '—', {
        fontSize: '13px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }))
      return py + 16
    }

    const defSkillId = unit.skills[0].id
    if (!this.selectedSkillId) this.selectedSkillId = defSkillId

    const recoveryIcon: Record<string, string> = { auto: '⟳', offensive: '⚔', defensive: '⊡' }
    const activationIcon: Record<string, string> = { auto: 'A', manual: 'M', toggle: 'T', passive: 'P' }

    for (let i = 0; i < unit.skills.length; i++) {
      const skill = unit.skills[i]
      const isSelected = this.selectedSkillId === skill.id
      const rowY = py
      const rowH = 52

      const bg = this.add.graphics()
      bg.fillStyle(isSelected ? 0x0040FF : 0xf5f7f9, isSelected ? 0.9 : 1)
      bg.fillRect(4, rowY, SIDEBAR_W - 8, rowH)
      bg.lineStyle(isSelected ? 2 : 1, 0x0040FF, isSelected ? 0.35 : BORDER_STYLE.subtleAlpha)
      bg.strokeRect(4, rowY, SIDEBAR_W - 8, rowH)
      bg.setInteractive(new Phaser.Geom.Rectangle(4, rowY, SIDEBAR_W - 8, rowH), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'
      bg.on('pointerdown', () => this.selectSkill(skill.id))
      this.infoContainer.add(bg)
      this.skillRects.push({ id: skill.id, g: bg, y: rowY })

      const headerText = `S${i + 1} ${skill.name}  ${skill.spCost}${recoveryIcon[skill.spRecovery] ?? '?'}|${activationIcon[skill.activation] ?? '?'}`
      const header = this.add.text(10, rowY + 3, headerText, {
        fontSize: '11px', color: isSelected ? '#ffffff' : COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
      })
      this.infoContainer.add(header)

      const desc = this.add.text(10, rowY + 18, skill.description, {
        fontSize: '9px', color: isSelected ? '#e0e0e0' : COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', wordWrap: { width: SIDEBAR_W - 16 },
      })
      this.infoContainer.add(desc)

      py += rowH + 4
    }

    return py
  }

  private selectSkill(skillId: string): void {
    this.selectedSkillId = skillId
    for (const sr of this.skillRects) {
      const isSel = sr.id === skillId
      sr.g.clear()
      sr.g.fillStyle(isSel ? 0x0040FF : 0xf5f7f9, isSel ? 0.9 : 1)
      sr.g.fillRect(4, sr.y, SIDEBAR_W - 8, 52)
      sr.g.lineStyle(isSel ? 2 : 1, 0x0040FF, isSel ? 0.35 : BORDER_STYLE.subtleAlpha)
      sr.g.strokeRect(4, sr.y, SIDEBAR_W - 8, 52)
    }
    const containerChildren = this.infoContainer.getAll()
    for (const child of containerChildren) {
      if (child.type === 'Text') {
        const text = child as Phaser.GameObjects.Text
        const txt = text.text
        for (const sr of this.skillRects) {
          const skill = this.pickedUnit?.skills.find(s => s.id === sr.id)
          if (skill && txt.includes(`${skill.name}  ${skill.spCost}`)) {
            text.setColor(sr.id === skillId ? '#ffffff' : COLORS.text.primary)
          }
          if (skill && txt === skill.description) {
            text.setColor(sr.id === skillId ? '#e0e0e0' : COLORS.text.secondary)
          }
        }
      }
    }
    this.showConfirm()
  }

  private showConfirm(): void {
    if (this.confirmBtn) this.confirmBtn.destroy()
    if (!this.pickedUnit) {
      this.confirmBtn = makeNodeButton(this, 10, this.H - 48, 'Confirm', () => this.confirmPick(), {
        w: SIDEBAR_W - 20, h: 34, textSize: FONT_SIZE.xs, role: 'primary',
      })
      return
    }
    const skillName = this.pickedUnit?.skills?.find(s => s.id === this.selectedSkillId)?.name ?? ''
    const label = skillName ? `Deploy with ${skillName}` : `Confirm (${this.pickedUnit?.subtypeLabel ?? ''})`
    this.confirmBtn = makeNodeButton(this, 10, this.H - 48, label, () => this.confirmPick(), {
      w: SIDEBAR_W - 20, h: 34, textSize: FONT_SIZE.xs, role: 'primary',
    })
  }

  private confirmPick(): void {
    if (this.slotIndex < 0) return
    const squad = this.scene.get('SquadScene') as any
    if (squad.receivePickedUnit) {
      squad.receivePickedUnit(this.pickedUnit, this.slotIndex, this.selectedSkillId || undefined)
    }
    this.scene.stop()
  }

  private closePicker(): void {
    this.scene.stop()
  }
}
