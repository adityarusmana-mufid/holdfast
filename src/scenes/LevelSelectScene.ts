import Phaser from 'phaser'
import { FONTS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { getLevelIdsForChapter, getLevelData, CHAPTERS } from '../config/chapters'
import { UNIT_CONFIGS } from '../config/units'
import { UnitConfig } from '../types/index'
import { isLevelUnlocked, getCompletion } from '../shared/SaveData'

const BASE_Y = 290

function tutorialSquad(): UnitConfig[] {
  const ids = ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
  return ids.map(id => UNIT_CONFIGS.find(u => u.id === id)).filter((u): u is UnitConfig => u !== undefined)
}

function drawNodeCard(bg: Phaser.GameObjects.Graphics, w: number, h: number, type: 'locked' | 'unlocked' | 'completed', isTr: boolean): void {
  const hw = w / 2
  const hh = h / 2
  if (type === 'locked') {
    bg.fillStyle(0xe8eaed, 0.6)
    bg.fillRoundedRect(-hw, -hh, w, h, 8)
    bg.lineStyle(1, 0xccd0d6, 0.5)
    bg.strokeRoundedRect(-hw, -hh, w, h, 8)
  } else if (type === 'completed') {
    bg.fillStyle(0xffffff, 1)
    bg.fillRoundedRect(-hw + 1, -hh + 1, w, h, 8)
    bg.fillStyle(isTr ? 0xfff8e8 : 0xe8f5e9, 1)
    bg.fillRoundedRect(-hw, -hh, w, h, 8)
    bg.lineStyle(2, isTr ? 0xf0c27a : 0x4caf50, 0.8)
    bg.strokeRoundedRect(-hw, -hh, w, h, 8)
  } else {
    bg.fillStyle(0xffffff, 1)
    bg.fillRoundedRect(-hw + 1, -hh + 1, w, h, 8)
    bg.fillStyle(0xffffff, 1)
    bg.fillRoundedRect(-hw, -hh, w, h, 8)
    bg.lineStyle(2, isTr ? 0xf0c27a : 0x4fc3f7, 0.7)
    bg.strokeRoundedRect(-hw, -hh, w, h, 8)
  }
}

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
    const levelIds = getLevelIdsForChapter(this.chapterId)

    this.cameras.main.setBackgroundColor('#f0f2f5')

    const gridGfx = this.add.graphics()
    gridGfx.lineStyle(1, 0x4fc3f7, 0.08)
    for (let x = 0; x <= W; x += 48) gridGfx.lineBetween(x, 0, x, H)
    for (let y = 0; y <= H; y += 48) gridGfx.lineBetween(0, y, W, y)

    this.add.text(W / 2, 32, ch?.title ?? 'Levels', {
      ...FONTS.h2, color: '#1a1a2e',
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 66, ch?.subtitle ?? '', {
      ...FONTS.body, color: '#6a7a8a',
    }).setOrigin(0.5, 0)

    const positions = ch?.nodePositions ?? []
    if (positions.length === 0 || positions.length !== levelIds.length) {
      this.add.text(W / 2, H / 2, 'No level data', { ...FONTS.h3, color: '#d32f2f' }).setOrigin(0.5)
      return
    }

    const pad = 80
    const totalW = positions[positions.length - 1].x + 60
    const scrollMax = Math.max(0, totalW - (W - pad * 2))

    const scrollContainer = this.add.container(pad, 0)

    const track = this.add.graphics()
    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i]
      const to = positions[i + 1]
      track.lineStyle(2, 0xb0c4de, 0.5)
      track.lineBetween(from.x, BASE_Y + from.y, to.x, BASE_Y + to.y)
    }
    for (let i = 0; i < positions.length - 1; i++) {
      const completed = getCompletion(levelIds[i])
      if (completed) {
        const from = positions[i]
        const to = positions[i + 1]
        const isTr = levelIds[i].startsWith('TR-')
        track.lineStyle(2, isTr ? 0xf0c27a : 0x4fc3f7, 0.9)
        track.lineBetween(from.x, BASE_Y + from.y, to.x, BASE_Y + to.y)
      }
    }
    scrollContainer.add(track)

    levelIds.forEach((levelId, i) => {
      const pos = positions[i]
      const isTr = levelId.startsWith('TR-')
      const data = getLevelData(levelId)
      const unlocked = isLevelUnlocked(levelId, levelIds)
      const completed = getCompletion(levelId)

      const nodeW = isTr ? 60 : 76
      const nodeH = isTr ? 48 : 60

      const nodeContainer = this.add.container(pos.x, BASE_Y + pos.y)

      const bg = this.add.graphics()
      const cardType = !unlocked ? 'locked' : completed ? 'completed' : 'unlocked'
      drawNodeCard(bg, nodeW, nodeH, cardType, isTr)
      nodeContainer.add(bg)

      const textColor = !unlocked ? '#b0b8c4' : '#1a1a2e'
      const idText = this.add.text(0, -(isTr ? 4 : 6), levelId, {
        fontSize: isTr ? '14px' : '16px', color: textColor,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      nodeContainer.add(idText)

      if (completed) {
        const stars = this.add.text(0, 16, '★★★', {
          fontSize: '12px', color: '#ffc107',
          fontFamily: 'sans-serif',
        }).setOrigin(0.5)
        nodeContainer.add(stars)
      } else if (unlocked && isTr) {
        const tut = this.add.text(0, 16, 'TUT', {
          fontSize: '12px', color: '#f0c27a',
          fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
          fontStyle: 'bold',
        }).setOrigin(0.5)
        nodeContainer.add(tut)
      }

      if (unlocked) {
        bg.setInteractive(new Phaser.Geom.Rectangle(-nodeW / 2, -nodeH / 2, nodeW, nodeH), Phaser.Geom.Rectangle.Contains)
        if (bg.input) bg.input.cursor = 'pointer'

        bg.on('pointerdown', () => {
          if (data?.tutorial) {
            this.scene.start('GameScene', {
              level: data, squad: tutorialSquad(),
              chapterId: this.chapterId, levelId, autoStart: true,
            })
          } else {
            this.scene.start('SquadScene', { levelId, chapterId: this.chapterId, levelData: data })
          }
        })

        bg.on('pointerover', () => {
          bg.clear()
          bg.fillStyle(0xffffff, 1)
          bg.fillRoundedRect(-nodeW / 2 - 1, -nodeH / 2 - 1, nodeW + 2, nodeH + 2, 9)
          bg.lineStyle(2, isTr ? 0xf0c27a : 0x4fc3f7, 1)
          bg.strokeRoundedRect(-nodeW / 2 - 1, -nodeH / 2 - 1, nodeW + 2, nodeH + 2, 9)
        })

        bg.on('pointerout', () => {
          bg.clear()
          drawNodeCard(bg, nodeW, nodeH, cardType, isTr)
        })
      }

      scrollContainer.add(nodeContainer)
    })

    const maskShape = this.add.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(pad, 0, W - pad * 2, H)
    const mask = maskShape.createGeometryMask()
    maskShape.setVisible(false)
    scrollContainer.setMask(mask)

    let scrollX = 0
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      scrollX = Phaser.Math.Clamp(scrollX - dy * 0.8, 0, scrollMax)
      scrollContainer.x = pad - scrollX
    })

    makeButton(this, 20, H - 52, '< Back', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 100 })
  }
}
