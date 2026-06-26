import Phaser from 'phaser'
import { UnitConfig, LevelData } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS, FONT_SIZE } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'
import { saveSquad, loadSquad, savePickedSkills, loadPickedSkills } from '../shared/SaveData'

const SLOT_W = 130
const SLOT_H = 200
const SLOT_GAP = 12
const COLS = 6
const ROWS = 2

export class SquadScene extends Phaser.Scene {
  private slots: (UnitConfig | null)[] = []
  private pickedSkills: Record<number, string> = {}
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
    this.slots = new Array(12).fill(null)
    const squadKey = this.levelId === 'menu' ? 'menu_squad' : this.levelId
    const saved = loadSquad(squadKey)
    if (saved) {
      for (let i = 0; i < 12; i++) {
        const id = saved[i]
        if (id) this.slots[i] = UNIT_CONFIGS.find(u => u.id === id) ?? null
      }
    }
    const savedSkills = loadPickedSkills(squadKey)
    if (savedSkills) {
      this.pickedSkills = savedSkills
    }
    if (!saved && this.levelId !== 'menu') {
      const menuSaved = loadSquad('menu_squad')
      if (menuSaved) {
        for (let i = 0; i < 12; i++) {
          const id = menuSaved[i]
          if (id) this.slots[i] = UNIT_CONFIGS.find(u => u.id === id) ?? null
        }
        const menuSkills = loadPickedSkills('menu_squad')
        if (menuSkills) this.pickedSkills = menuSkills
      }
    }
    if (this.slots.every(s => s === null)) {
      const defaultIds = ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
      for (let i = 0; i < defaultIds.length; i++) {
        const unit = UNIT_CONFIGS.find(u => u.id === defaultIds[i])
        if (unit) (this.slots as (UnitConfig | null)[])[i] = unit
      }
    }
  }

  create(): void {
    const W = 1280
    const H = 720

    this.add.text(W / 2, 20, 'SQUAD SELECTION', {
      ...FONTS.h2, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    const subtitle = this.levelId === 'menu'
      ? 'Build and save your squad preset. Used as default for new levels.'
      : 'Tap an empty slot to pick a unit. Pre-filled squad is ready to deploy.'
    this.add.text(W / 2, 44, subtitle, {
      ...FONTS.small, color: COLORS.text.dim,
    }).setOrigin(0.5, 0)

    makeNodeButton(this, W - 150, 18, 'Auto Fill', () => this.autoFill(), { w: 110, h: 34, textSize: '12px' })

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
      const unit = this.slots[i]
      this.drawSlot(c, unit)
      c.setSize(SLOT_W, SLOT_H)
      c.setInteractive(new Phaser.Geom.Rectangle(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      const idx = i
      c.on('pointerdown', () => this.onSlotClick(idx))

      this.slotContainers.push(c)
    }

    const depLimit = this.levelData?.deploymentLimit ?? 8
    this.squadLabel = this.add.text(W / 2, startY + gridH + 14, `Squad: ${this.slots.filter(s => s !== null).length}/12 selected  |  Field limit: ${depLimit}`, {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    if (this.levelId === 'menu') {
      makeNodeButton(this, 16, 16, '< BACK', () => {
        this.scene.start('HomeBridgeScene')
      }, { w: 72, h: 32, textSize: '11px' })
    } else {
      makeNodeButton(this, 16, 16, '< BACK', () => {
        this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
      }, { w: 72, h: 32, textSize: '11px' })
      makeNodeButton(this, 94, 16, 'HOME', () => {
        this.scene.start('HomeBridgeScene')
      }, { w: 72, h: 32, textSize: '11px' })

      makeNodeButton(this, W - 160, H - 48, 'Start Mission', () => {
        const squad = this.slots.filter((s): s is UnitConfig => s !== null)
        if (squad.length === 0) return
        if (!this.levelData) return
        this.scene.start('GameScene', {
          level: this.levelData,
          squad,
          pickedSkills: this.pickedSkills,
          chapterId: this.chapterId,
          levelId: this.levelId,
          autoStart: true,
        })
      }, { w: 140, h: 38, role: 'primary' })
    }
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
        fontSize: FONT_SIZE.xs, color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', align: 'center',
      }).setOrigin(0.5)

      const dpText = this.add.text(-SLOT_W / 2 + 6, -SLOT_H / 2 + 4, `${unit.dpCost} DP`, {
        fontSize: FONT_SIZE.xs, color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })

      c.add([bg, icon, label, sub, dpText])
    } else {
      bg.fillStyle(0xe8ecf0, 0.5)
      bg.fillRoundedRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 6)
      bg.lineStyle(1, 0xccd0d6, 0.8)
      bg.strokeRoundedRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, 6)

      const empty = this.add.text(0, 0, '+', {
        fontSize: '32px', color: '#5a6a7a', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5)

      c.add([bg, empty])
    }
  }

  private persistSquad(): void {
    const key = this.levelId === 'menu' ? 'menu_squad' : this.levelId
    saveSquad(key, this.slots.map(s => s?.id ?? null))
    savePickedSkills(key, this.pickedSkills)
  }

  private onSlotClick(index: number): void {
    if (this.slots[index] !== null) {
      this.slots[index] = null
      delete this.pickedSkills[index]
      this.drawSlot(this.slotContainers[index], null)
      this.updateSquadLabel()
      this.persistSquad()
      return
    }

    this.scene.launch('PickerScene', { slotIndex: index, squad: this.slots })
  }

  receivePickedUnit(unit: UnitConfig, slotIndex: number, skillId?: string): void {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return
    this.slots[slotIndex] = unit
    if (skillId) this.pickedSkills[slotIndex] = skillId
    this.drawSlot(this.slotContainers[slotIndex], unit)
    this.updateSquadLabel()
    this.persistSquad()
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
      'pusher',
      'puller',
    ]
    for (let i = 0; i < 12; i++) {
      const unit = UNIT_CONFIGS.find(u => u.id === picks[i]) ?? null
      this.slots[i] = unit
      if (unit?.skills?.[0]) this.pickedSkills[i] = unit.skills[0].id
      this.drawSlot(this.slotContainers[i], unit)
    }
    this.updateSquadLabel()
    this.persistSquad()
  }

  private updateSquadLabel(): void {
    const count = this.slots.filter(s => s !== null).length
    const depLimit = this.levelData?.deploymentLimit ?? 8
    this.squadLabel.setText(`Squad: ${count}/12 selected  |  Field limit: ${depLimit}`)
  }
}
