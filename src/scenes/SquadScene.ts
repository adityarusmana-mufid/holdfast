import Phaser from 'phaser'
import { UnitConfig, LevelData } from '../types/index'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONTS, FONT_SIZE, CORNER_BRACKET_SIZE, TOP_BAR } from '../ui/Constants'
import { makeNodeButton, drawCornerBrackets, drawUnitCard, drawEmptyUnitCard, UNIT_CARD_W, UNIT_CARD_H } from '../ui/Components'
import { loadPreset, loadPresetSkills, savePreset, savePresetSkills, getActivePreset, setActivePreset, getPresetName, setPresetName } from '../shared/SaveData'

const SLOT_W = UNIT_CARD_W
const SLOT_H = UNIT_CARD_H
const SLOT_GAP = 12
const COLS = 6
const ROWS = 2

export class SquadScene extends Phaser.Scene {
  private slots: (UnitConfig | null)[] = []
  private pickedSkills: Record<number, string> = {}
  private slotContainers: Phaser.GameObjects.Container[] = []
  private activePresetIndex: number = 0
  private presetBarElements: Phaser.GameObjects.GameObject[] = []

  private levelId: string = ''
  private chapterId: string = ''
  private levelData: LevelData | null = null

  constructor() {
    super({ key: 'SquadScene' })
  }

  init(data: { levelId?: string; chapterId?: string; levelData?: LevelData }): void {
    this.levelId = data.levelId ?? 'menu'
    this.chapterId = data.chapterId ?? ''
    this.levelData = data.levelData ?? null
    this.slots = new Array(12).fill(null)
    this.presetBarElements = []

    this.activePresetIndex = getActivePreset()
    const savedIds = loadPreset(this.activePresetIndex)
    for (let i = 0; i < 12; i++) {
      const id = savedIds[i]
      if (id) this.slots[i] = UNIT_CONFIGS.find(u => u.id === id) ?? null
    }
    this.pickedSkills = { ...loadPresetSkills(this.activePresetIndex) }

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

    makeNodeButton(this, W - 150, 18, 'Auto Fill', () => this.autoFill(), { w: 110, h: 34, textSize: '12px' })
    makeNodeButton(this, W - 268, 18, '\u2716 Clear', () => this.clearSquad(), { w: 108, h: 34, textSize: '12px', role: 'danger' })

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

    this.buildPresetBar()

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
    const ox = -SLOT_W / 2
    const oy = -SLOT_H / 2
    if (unit) {
      drawUnitCard(this, c, unit, ox, oy)
    } else {
      drawEmptyUnitCard(this, c, ox, oy)
    }
  }

  private redrawAllSlots(): void {
    this.slotContainers.forEach((c, i) => {
      const unit = this.slots[i]
      this.drawSlot(c, unit)
    })
  }

  private persistSquad(): void {
    savePreset(this.activePresetIndex, this.slots.map(s => s?.id ?? null))
    savePresetSkills(this.activePresetIndex, this.pickedSkills)
  }

  private onSlotClick(index: number): void {
    if (this.slots[index] !== null) {
      this.slots[index] = null
      delete this.pickedSkills[index]
      this.drawSlot(this.slotContainers[index], null)
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
    this.persistSquad()
  }

  private clearSquad(): void {
    for (let i = 0; i < 12; i++) {
      this.slots[i] = null
      delete this.pickedSkills[i]
      this.drawSlot(this.slotContainers[i], null)
    }
    this.persistSquad()
  }

  private loadActivePreset(): void {
    const savedIds = loadPreset(this.activePresetIndex)
    for (let i = 0; i < 12; i++) {
      const id = savedIds[i]
      this.slots[i] = id ? UNIT_CONFIGS.find(u => u.id === id) ?? null : null
    }
    this.pickedSkills = { ...loadPresetSkills(this.activePresetIndex) }
    if (this.slots.every(s => s === null)) {
      const defaultIds = ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
      for (let i = 0; i < defaultIds.length; i++) {
        const unit = UNIT_CONFIGS.find(u => u.id === defaultIds[i])
        if (unit) (this.slots as (UnitConfig | null)[])[i] = unit
      }
    }
    this.redrawAllSlots()
  }

  private buildPresetBar(): void {
    const W = 1280
    const H = 720
    const barY = H - 94
    const barH = 36
    const barW = W - 40
    const barX = 20

    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.95)
    bg.fillRoundedRect(barX, barY, barW, barH, 4)
    bg.lineStyle(1, 0xe0e0e0, 1)
    bg.strokeRoundedRect(barX, barY, barW, barH, 4)
    bg.setDepth(50)
    this.presetBarElements.push(bg)

    const btnW = 110
    const gap = 8
    const startX = barX + 12
    const nameY = barY + barH / 2

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (btnW + gap)
      const name = getPresetName(i)
      const isActive = i === this.activePresetIndex

      const btnBg = this.add.graphics()
      btnBg.setDepth(51)
      if (isActive) {
        btnBg.fillStyle(0x1877F2, 1)
        btnBg.fillRoundedRect(x, barY + 3, btnW, barH - 6, 3)
      } else {
        btnBg.lineStyle(1, 0xcccccc, 1)
        btnBg.strokeRoundedRect(x, barY + 3, btnW, barH - 6, 3)
      }
      this.presetBarElements.push(btnBg)

      const txt = this.add.text(x + btnW / 2, nameY, name, {
        fontSize: '12px',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
        color: isActive ? '#ffffff' : '#4B5563',
      }).setOrigin(0.5, 0.5).setDepth(52)
      this.presetBarElements.push(txt)

      const hitArea = this.add.zone(x, barY + 3, btnW, barH - 6).setInteractive({ useHandCursor: true })
      hitArea.setDepth(53)
      this.presetBarElements.push(hitArea)

      const idx = i
      hitArea.on('pointerdown', () => {
        if (idx === this.activePresetIndex) return
        this.activePresetIndex = idx
        setActivePreset(idx)
        this.loadActivePreset()
        this.rebuildPresetBar()
      })
    }

    const pencilX = startX + 4 * (btnW + gap) + 16
    const pencil = this.add.text(pencilX, nameY, '\u270E', {
      fontSize: '16px',
      color: '#4B5563',
    }).setOrigin(0.5, 0.5).setDepth(52).setInteractive({ useHandCursor: true })
    this.presetBarElements.push(pencil)

    pencil.on('pointerdown', () => this.renameCurrentPreset())
  }

  private rebuildPresetBar(): void {
    this.presetBarElements.forEach(e => e.destroy())
    this.presetBarElements = []
    this.buildPresetBar()
  }

  private renameCurrentPreset(): void {
    const currentName = getPresetName(this.activePresetIndex)
    const W = 1280
    const barY = 720 - 94
    const barH = 36
    const btnW = 110
    const gap = 8
    const startX = 32

    const input = document.createElement('input')
    input.type = 'text'
    input.value = currentName
    input.style.cssText = `
      font-family: "Share Tech Mono", "Roboto Mono", monospace;
      font-size: 12px; font-weight: bold; color: #ffffff;
      background: #1877F2; border: none; border-radius: 3px;
      padding: 2px 6px; width: 96px; text-align: center;
      outline: none;
    `

    const domEl = this.add.dom(0, 0, input).setDepth(60)
    this.presetBarElements.push(domEl)
    const x = startX + this.activePresetIndex * (btnW + gap) + btnW / 2
    domEl.setPosition(x, barY + barH / 2)

    const finish = () => {
      const val = input.value.trim()
      if (val) setPresetName(this.activePresetIndex, val)
      domEl.destroy()
      this.rebuildPresetBar()
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur() })
    input.addEventListener('blur', finish)
    setTimeout(() => { input.focus(); input.select() }, 50)
  }
}
