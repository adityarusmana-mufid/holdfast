import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { CHAPTERS } from '../config/chapters'

export class ChapterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChapterSelectScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.add.text(W / 2, 30, 'HOLDFAST', {
      ...FONTS.h1, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 72, 'Select a Chapter', {
      ...FONTS.body, color: COLORS.text.secondary,
    }).setOrigin(0.5, 0)

    const startY = 140
    const gap = 100

    CHAPTERS.forEach((ch, i) => {
      const py = startY + i * gap

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(W / 2 - 200, py, 400, 70, 8)
      bg.lineStyle(1, 0xcfd8dc, 0.8)
      bg.strokeRoundedRect(W / 2 - 200, py, 400, 70, 8)
      bg.setInteractive(new Phaser.Geom.Rectangle(W / 2 - 200, py, 400, 70), Phaser.Geom.Rectangle.Contains)
      if (bg.input) bg.input.cursor = 'pointer'

      this.add.text(W / 2, py + 18, ch.title, {
        ...FONTS.h3, color: COLORS.text.primary,
      }).setOrigin(0.5, 0)

      this.add.text(W / 2, py + 44, ch.subtitle, {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(0.5, 0)

      bg.on('pointerdown', () => {
        this.scene.start('LevelSelectScene', { chapterId: ch.id })
      })
    })

    const isDev = new URLSearchParams(window.location.search).has('dev')
    if (isDev) {
      makeButton(this, 20, H - 52, 'Editor', () => {
        this.scene.start('EditorScene')
      }, { w: 100 })
    }
  }
}
