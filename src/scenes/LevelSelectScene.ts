import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { getLevelIdsForChapter, getLevelData, CHAPTERS } from '../config/chapters'

export class LevelSelectScene extends Phaser.Scene {
  private chapterId!: string

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
    const startY = 130
    const gap = 80

    levelIds.forEach((levelId, i) => {
      const py = startY + i * gap
      const data = getLevelData(levelId)

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(W / 2 - 200, py, 400, 58, 8)
      bg.lineStyle(1, 0xcfd8dc, 0.8)
      bg.strokeRoundedRect(W / 2 - 200, py, 400, 58, 8)
      bg.setInteractive(new Phaser.Geom.Rectangle(W / 2 - 200, py, 400, 58), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'

      this.add.text(W / 2, py + 12, data?.name ?? levelId, {
        ...FONTS.h3, color: COLORS.text.primary,
      }).setOrigin(0.5, 0)

      this.add.text(W / 2, py + 36, `${data?.cols ?? 0}×${data?.rows ?? 0}  ·  DP ${data?.startingDP ?? 0}  ·  Limit ${data?.deploymentLimit ?? 0}`, {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(0.5, 0)

      bg.on('pointerdown', () => {
        this.scene.start('SquadScene', { levelId, chapterId: this.chapterId, levelData: data })
      })
    })

    makeButton(this, 20, H - 48, '< Back', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 100, h: 30 })
  }
}
