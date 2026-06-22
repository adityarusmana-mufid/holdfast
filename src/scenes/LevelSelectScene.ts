import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { getLevelIdsForChapter, getLevelData, CHAPTERS } from '../config/chapters'
import { UNIT_CONFIGS } from '../config/units'
import { UnitConfig, LevelData } from '../types/index'

const GAP = 68
const ITEM_H = 58
const VISIBLE_TOP = 120
const VISIBLE_BOT = 660

function tutorialSquad(): UnitConfig[] {
  const ids = ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
  return ids.map(id => UNIT_CONFIGS.find(u => u.id === id)).filter((u): u is UnitConfig => u !== undefined)
}

export class LevelSelectScene extends Phaser.Scene {
  private chapterId!: string
  private scrollY: number = 0
  private listContainer!: Phaser.GameObjects.Container
  private maxScroll: number = 0

  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  init(data: { chapterId: string }): void {
    this.chapterId = data.chapterId
  }

  create(): void {
    const W = 1280
    const H = 720
    const ch = CHAPTERS.find(c => c.id === this.chapterId)

    this.add.text(W / 2, 30, ch?.title ?? 'Levels', {
      ...FONTS.h2, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 66, ch?.subtitle ?? '', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    const levelIds = getLevelIdsForChapter(this.chapterId)
    this.listContainer = this.add.container(0, 0)

    const maskShape = this.add.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(0, VISIBLE_TOP - 4, W, VISIBLE_BOT - VISIBLE_TOP + 8)
    const mask = maskShape.createGeometryMask()
    maskShape.setVisible(false)
    this.listContainer.setMask(mask)

    levelIds.forEach((levelId, i) => {
      const py = i * GAP
      const data = getLevelData(levelId)
      const isTr = levelId.startsWith('TR-')

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(W / 2 - 220, py, 440, ITEM_H, 8)
      bg.lineStyle(1, isTr ? 0xf0c27a : 0xcfd8dc, 0.8)
      bg.strokeRoundedRect(W / 2 - 220, py, 440, ITEM_H, 8)
      bg.setInteractive(new Phaser.Geom.Rectangle(W / 2 - 220, py, 440, ITEM_H), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'

      const label = `${levelId}  \u00b7  ${data?.name ?? ''}`
      this.add.text(W / 2, py + 10, label, {
        ...FONTS.h3, color: COLORS.text.primary,
      }).setOrigin(0.5, 0)

      const subParts: string[] = []
      if (isTr) subParts.push('TUTORIAL')
      subParts.push(`${data?.cols ?? 0}\u00d7${data?.rows ?? 0}  \u00b7  DP ${data?.startingDP ?? 0}  \u00b7  Limit ${data?.deploymentLimit ?? 0}`)
      this.add.text(W / 2, py + 33, subParts.join('  \u00b7  '), {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(0.5, 0)

      bg.on('pointerdown', () => {
        if (data?.tutorial) {
          this.scene.start('GameScene', {
            level: data,
            squad: tutorialSquad(),
            chapterId: this.chapterId,
            levelId,
            autoStart: true,
          })
        } else {
          this.scene.start('SquadScene', { levelId, chapterId: this.chapterId, levelData: data })
        }
      })
    })

    this.listContainer.y = VISIBLE_TOP
    const totalH = levelIds.length * GAP
    this.maxScroll = Math.max(0, totalH - (VISIBLE_BOT - VISIBLE_TOP))

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScroll)
      this.listContainer.y = VISIBLE_TOP - this.scrollY
    })

    makeButton(this, 20, H - 52, '< Back', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 100 })
  }
}
