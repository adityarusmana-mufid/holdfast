import Phaser from 'phaser'
import { FONTS, FONT_SIZE, COLORS } from '../ui/Constants'
import { makeButton } from '../ui/Components'
import { getLevelIdsForChapter, getLevelData, CHAPTERS } from '../config/chapters'
import { isLevelUnlocked, getCompletion } from '../shared/SaveData'
import { tutorialSquad } from '../shared/utils/levelHelpers'

const BASE_Y = 290

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
  private selectedLevelId: string | null = null
  private infoPanel!: Phaser.GameObjects.Container
  private infoPanelOverlay!: Phaser.GameObjects.Graphics
  private infoPanelW = 0
  private infoPanelPx = 0
  private W = 1280
  private H = 720

  constructor() {
    super({ key: 'LevelSelectScene' })
  }

  init(data: { chapterId: string }): void {
    this.chapterId = data.chapterId
    this.selectedLevelId = null
  }

  create(): void {
    this.W = 1280
    this.H = 720
    const W = this.W
    const H = this.H
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
          if (this.selectedLevelId === levelId) {
            this.enterLevel(levelId, data)
          } else {
            this.showLevelInfo(levelId)
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

    this.infoPanel = this.add.container(0, 0)
    this.infoPanel.setDepth(20)
    this.infoPanel.setVisible(false)

    this.infoPanelOverlay = this.add.graphics()
    this.infoPanelOverlay.setDepth(19)
    this.infoPanelOverlay.setVisible(false)
    this.infoPanelOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains)
    this.infoPanelOverlay.on('pointerdown', () => this.hideLevelInfo())

    makeButton(this, 20, H - 52, '< Back', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 100 })
  }

  private showLevelInfo(levelId: string): void {
    this.selectedLevelId = levelId
    this.infoPanel.removeAll(true)

    const W = this.W
    const H = this.H
    this.infoPanelW = Math.floor(W / 6)
    this.infoPanelPx = W - this.infoPanelW
    const pad = 14

    const data = getLevelData(levelId)
    if (!data) return

    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 1)
    bg.fillRect(0, 0, this.infoPanelW, H)
    bg.lineStyle(1, 0xccd0d6, 0.6)
    bg.beginPath()
    bg.moveTo(0, 0)
    bg.lineTo(0, H)
    bg.strokePath()
    this.infoPanel.add(bg)

    let py = 100

    const title = this.add.text(pad, py, data.name, {
      ...FONTS.h3, color: COLORS.text.primary, wordWrap: { width: this.infoPanelW - pad * 2 },
    })
    this.infoPanel.add(title)

    py += 34

    const totalEnemies = data.waves.reduce((sum, w) => sum + w.entries.reduce((s, e) => s + e.count, 0), 0)
    const summary = `${data.waves.length} wave${data.waves.length > 1 ? 's' : ''}, ${totalEnemies} total hostiles`
    const desc = this.add.text(pad, py, summary, {
      ...FONTS.small, color: COLORS.text.secondary, wordWrap: { width: this.infoPanelW - pad * 2 },
    })
    this.infoPanel.add(desc)

    py += 24

    const deployLine = this.add.text(pad, py, `Deploy limit: ${data.deploymentLimit}`, {
      ...FONTS.small, color: COLORS.text.dim,
    })
    this.infoPanel.add(deployLine)

    if (data.tutorial) {
      py += 40
      const tutHint = this.add.text(pad, py, 'Tutorial level — auto squad', {
        ...FONTS.small, color: '#f0c27a', wordWrap: { width: this.infoPanelW - pad * 2 },
      })
      this.infoPanel.add(tutHint)
    }

    const btnW = this.infoPanelW - pad * 2
    const btnH = 34
    const btnY = H - 60 - btnH

    const intelBg = this.add.graphics()
    const intelBtnX = pad
    intelBg.fillStyle(0x78909c, 0.15)
    intelBg.fillRoundedRect(intelBtnX, btnY, btnW / 2 - 4, btnH, 4)
    intelBg.lineStyle(1, 0x78909c, 0.6)
    intelBg.strokeRoundedRect(intelBtnX, btnY, btnW / 2 - 4, btnH, 4)
    intelBg.setInteractive(new Phaser.Geom.Rectangle(intelBtnX, btnY, btnW / 2 - 4, btnH), Phaser.Geom.Rectangle.Contains)
    if (intelBg.input) intelBg.input.cursor = 'pointer'
    intelBg.on('pointerdown', () => {
      this.scene.launch('LevelPreviewScene', {
        levelId, chapterId: this.chapterId, levelData: data,
      })
    })
    this.infoPanel.add(intelBg)

    const intelLabel = this.add.text(intelBtnX + (btnW / 2 - 4) / 2, btnY + btnH / 2, 'INTEL', {
      ...FONTS.small, color: '#78909c', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.infoPanel.add(intelLabel)

    const enterBg = this.add.graphics()
    const enterBtnX = pad + btnW / 2 + 4
    enterBg.fillStyle(data.tutorial ? 0xf0c27a : 0x4fc3f7, 0.15)
    enterBg.fillRoundedRect(enterBtnX, btnY, btnW / 2 - 4, btnH, 4)
    enterBg.lineStyle(1, data.tutorial ? 0xf0c27a : 0x4fc3f7, 0.6)
    enterBg.strokeRoundedRect(enterBtnX, btnY, btnW / 2 - 4, btnH, 4)
    enterBg.setInteractive(new Phaser.Geom.Rectangle(enterBtnX, btnY, btnW / 2 - 4, btnH), Phaser.Geom.Rectangle.Contains)
    if (enterBg.input) enterBg.input.cursor = 'pointer'
    enterBg.on('pointerdown', () => this.enterLevel(levelId, data))
    this.infoPanel.add(enterBg)

    const enterLabel = this.add.text(enterBtnX + (btnW / 2 - 4) / 2, btnY + btnH / 2, 'ENTER', {
      ...FONTS.bodyBold, color: data.tutorial ? '#f0c27a' : '#4fc3f7',
    }).setOrigin(0.5)
    this.infoPanel.add(enterLabel)

    this.infoPanel.setPosition(this.infoPanelPx, 0)
    this.infoPanel.setAlpha(1)
    this.infoPanel.setVisible(true)

    this.infoPanelOverlay.clear()
    this.infoPanelOverlay.fillStyle(0x000000, 0.12)
    this.infoPanelOverlay.fillRect(0, 0, this.infoPanelPx, H)
    this.infoPanelOverlay.setVisible(true)
  }

  private hideLevelInfo(): void {
    if (!this.selectedLevelId) return
    this.selectedLevelId = null
    this.infoPanelOverlay.setVisible(false)
    this.tweens.add({
      targets: this.infoPanel,
      x: this.W,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.infoPanel.setVisible(false)
        this.infoPanel.removeAll(true)
      },
    })
  }

  private enterLevel(levelId: string, data: ReturnType<typeof getLevelData>): void {
    if (!data) return
    if (data.tutorial) {
      this.scene.start('GameScene', {
        level: data, squad: tutorialSquad(),
        chapterId: this.chapterId, levelId, autoStart: true,
      })
    } else {
      this.scene.start('SquadScene', { levelId, chapterId: this.chapterId, levelData: data })
    }
  }
}
