import Phaser from 'phaser'
import { FONTS, FONT_SIZE, COLORS } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'
import { getLevelIdsForChapter, getLevelData, CHAPTERS } from '../config/chapters'
import { isLevelUnlocked, getCompletion } from '../shared/SaveData'
import { tutorialSquad } from '../shared/utils/levelHelpers'

const BASE_Y = 290

function drawNodeCard(bg: Phaser.GameObjects.Graphics, w: number, h: number, type: 'locked' | 'unlocked' | 'completed', isTr: boolean): void {
  const hw = w / 2
  const hh = h / 2
  bg.fillStyle(0x000000, 0.08)
  bg.fillRect(-hw + 2, -hh + 2, w, h)
  bg.fillStyle(0x000000, 0.06)
  bg.fillRect(-hw + 4, -hh + 4, w, h)
  bg.fillStyle(0x000000, 0.04)
  bg.fillRect(-hw + 6, -hh + 6, w, h)
  bg.fillStyle(0x000000, 0.03)
  bg.fillRect(-hw + 8, -hh + 8, w, h)
  bg.fillStyle(0x000000, 0.02)
  bg.fillRect(-hw + 10, -hh + 10, w, h)
  bg.fillStyle(0x000000, 0.01)
  bg.fillRect(-hw + 12, -hh + 12, w, h)
  if (type === 'locked') {
    bg.fillStyle(0xe0e2e5, 0.8)
    bg.fillRect(-hw, -hh, w, h)
  } else if (type === 'completed' && isTr) {
    bg.fillGradientStyle(0x424242, 0x424242, 0x303030, 0x303030, 1)
    bg.fillRect(-hw, -hh, w, h)
  } else if (type === 'completed') {
    bg.fillGradientStyle(0xffffff, 0xffffff, 0xf0f0f0, 0xf0f0f0, 1)
    bg.fillRect(-hw, -hh, w, h)
  } else if (isTr) {
    bg.fillGradientStyle(0x4a4a4a, 0x4a4a4a, 0x383838, 0x383838, 1)
    bg.fillRect(-hw, -hh, w, h)
  } else {
    bg.fillStyle(0xffffff, 1)
    bg.fillRect(-hw, -hh, w, h)
  }
}

function drawPointyHexagon(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, h: number, fill: number, fillAlpha: number, strokeColor?: number, strokeWidth?: number): void {
  const R = h / 2
  gfx.fillStyle(fill, fillAlpha)
  gfx.beginPath()
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i
    const x = cx + R * Math.cos(a)
    const y = cy + R * Math.sin(a)
    if (i === 0) gfx.moveTo(x, y)
    else gfx.lineTo(x, y)
  }
  gfx.closePath()
  gfx.fillPath()
  if (strokeColor !== undefined && strokeWidth !== undefined) {
    gfx.lineStyle(strokeWidth, strokeColor, 1)
    gfx.beginPath()
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (Math.PI / 3) * i
      const x = cx + R * Math.cos(a)
      const y = cy + R * Math.sin(a)
      if (i === 0) gfx.moveTo(x, y)
      else gfx.lineTo(x, y)
    }
    gfx.closePath()
    gfx.strokePath()
  }
}

function fillHexagonSector(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, h: number, segments: number, fill: number, alpha: number): void {
  const R = h / 2
  gfx.fillStyle(fill, alpha)
  gfx.beginPath()
  gfx.moveTo(cx, cy)
  for (let i = 0; i <= segments; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i
    gfx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a))
  }
  gfx.closePath()
  gfx.fillPath()
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
    gridGfx.lineStyle(1, 0xcfd8dc, 0.15)
    for (let x = 0; x <= W; x += 48) gridGfx.lineBetween(x, 0, x, H)
    for (let y = 0; y <= H; y += 48) gridGfx.lineBetween(0, y, W, y)

    this.add.text(W / 2, 32, ch?.title ?? 'Levels', {
      ...FONTS.h2, color: '#1a1a2e',
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 66, ch?.subtitle ?? '', {
      ...FONTS.body, color: '#4a5a6a',
    }).setOrigin(0.5, 0)

    const positions = ch?.nodePositions ?? []
    if (positions.length === 0 || positions.length !== levelIds.length) {
      this.add.text(W / 2, H / 2, 'No level data', { ...FONTS.h3, color: '#d32f2f' }).setOrigin(0.5)
      return
    }

    const pad = 80
    const scrollMin = pad + positions[0].x - W / 2
    const scrollMax = pad + positions[positions.length - 1].x - W / 2

    const scrollContainer = this.add.container(pad, 0)

    const track = this.add.graphics()
    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i]
      const to = positions[i + 1]
      const completed = getCompletion(levelIds[i])
      track.lineStyle(3, completed ? 0x90a4ae : 0xcfd8dc, completed ? 0.9 : 0.5)
      track.lineBetween(from.x, BASE_Y + from.y, to.x, BASE_Y + to.y)
    }
    scrollContainer.add(track)

    levelIds.forEach((levelId, i) => {
      const pos = positions[i]
      const isTr = levelId.startsWith('TR-')
      const data = getLevelData(levelId)
      const unlocked = isLevelUnlocked(levelId, levelIds)
      const completed = getCompletion(levelId)

      const nodeW = 90
      const nodeH = 26

      const nodeContainer = this.add.container(pos.x, BASE_Y + pos.y)

      const bg = this.add.graphics()
      const cardType = !unlocked ? 'locked' : completed ? 'completed' : 'unlocked'
      drawNodeCard(bg, nodeW, nodeH, cardType, isTr)
      nodeContainer.add(bg)

      const textColor = !unlocked ? '#4a5a6a' : isTr ? '#cfd8dc' : '#1a1a2e'
      const idText = this.add.text(0, 0, levelId, {
        fontSize: isTr ? '14px' : '16px', color: textColor,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      nodeContainer.add(idText)

      const tagLabel = isTr ? 'TUTORIAL' : 'OPERATION'
      const tagGfx = this.add.graphics()
      const tagH = 12
      tagGfx.fillStyle(0x000000, 1)
      tagGfx.fillRect(-nodeW / 2, -nodeH / 2 - tagH, nodeW, tagH)
      nodeContainer.add(tagGfx)
      const tagText = this.add.text(0, -nodeH / 2 - tagH / 2, tagLabel, {
        fontSize: '7px', color: '#ffffff',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      nodeContainer.add(tagText)

      // hexagon (left side, thick white border, recessed grey + cyan sector)
      if (unlocked) {
        const hexH = Math.round((nodeH + tagH) * 7 / 8)
        const hexCx = -nodeW / 2
        const hexCy = nodeH / 2 - hexH / 2
        const hexGfx = this.add.graphics()
        // shadow
        hexGfx.fillStyle(0x000000, 0.08)
        drawPointyHexagon(hexGfx, hexCx + 2, hexCy + 2, hexH, 0x000000, 0.08)
        // thick white outer (container rim)
        drawPointyHexagon(hexGfx, hexCx, hexCy, hexH, 0xffffff, 1)
        // recessed dark grey interior (inset 3px from edge)
        const insetH = hexH - 7
        drawPointyHexagon(hexGfx, hexCx, hexCy, insetH, 0x424242, 1)
        // ponytail: white frosting on sector for challenge mode, add when challenge mode exists
        if (completed) {
          const starSegments = completed.stars * 2
          if (starSegments >= 6) {
            drawPointyHexagon(hexGfx, hexCx, hexCy, insetH, 0x00bcd4, 1)
          } else {
            fillHexagonSector(hexGfx, hexCx, hexCy, insetH, starSegments, 0x00bcd4, 1)
          }
        }
        nodeContainer.add(hexGfx)
      }

      if (unlocked) {
        bg.setInteractive(new Phaser.Geom.Rectangle(-nodeW / 2, -nodeH / 2, nodeW, nodeH), Phaser.Geom.Rectangle.Contains)
        if (bg.input) bg.input.cursor = 'pointer'

        bg.on('pointerup', (p: Phaser.Input.Pointer) => {
          const moved = Math.abs(p.x - p.downX) + Math.abs(p.y - p.downY)
          if (moved > 10) return
          if (this.selectedLevelId === levelId) {
            this.enterLevel(levelId, data)
          } else {
            this.showLevelInfo(levelId)
          }
        })

        bg.on('pointerover', () => {
          bg.clear()
          bg.fillStyle(0xffffff, 1)
          bg.fillRect(-nodeW / 2 - 2, -nodeH / 2 - 2, nodeW + 4, nodeH + 4)
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
    let dragAnchor = 0
    this.input.on('pointerdown', () => { dragAnchor = scrollX })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return
      scrollX = Phaser.Math.Clamp(dragAnchor - (p.x - p.downX), scrollMin, scrollMax)
      scrollContainer.x = pad - scrollX
    })
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      scrollX = Phaser.Math.Clamp(scrollX - dy * 0.8, scrollMin, scrollMax)
      scrollContainer.x = pad - scrollX
    })

    this.infoPanel = this.add.container(0, 0)
    this.infoPanel.setDepth(20)
    this.infoPanel.setVisible(false)

    this.infoPanelOverlay = this.add.graphics()
    this.infoPanelOverlay.setDepth(19)
    this.infoPanelOverlay.setVisible(false)
    this.infoPanelOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 0, 0), Phaser.Geom.Rectangle.Contains)
    this.infoPanelOverlay.on('pointerdown', () => this.hideLevelInfo())

    makeNodeButton(this, 20, H - 52, '< Back', () => {
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

    py += 20

    const completed = getCompletion(levelId)
    if (completed) {
      const hexSize = 28
      const hexGap = 8
      const totalW = 3 * hexSize + 2 * hexGap
      const startX = pad + (this.infoPanelW - pad * 2 - totalW) / 2
      const cy = py + hexSize / 2

      for (let i = 0; i < 3; i++) {
        const cx = startX + i * (hexSize + hexGap) + hexSize / 2
        const gfx = this.add.graphics()

        drawPointyHexagon(gfx, cx + 2, cy + 2, hexSize, 0x000000, 0.08)
        drawPointyHexagon(gfx, cx, cy, hexSize, 0xffffff, 1)
        const insetH = hexSize - 7
        drawPointyHexagon(gfx, cx, cy, insetH, 0x424242, 1)
        if (i < completed.stars) {
          drawPointyHexagon(gfx, cx, cy, insetH, 0x00bcd4, 1)
        }

        this.infoPanel.add(gfx)
      }

      py += hexSize + 8
      const enemiesTxt = this.add.text(pad, py, `Enemies defeated: ${completed.enemiesDefeated}`, {
        ...FONTS.small, color: COLORS.text.dim,
      })
      this.infoPanel.add(enemiesTxt)
      py += 4
    }

    if (data.tutorial) {
      py += 40
      const tutHint = this.add.text(pad, py, 'Tutorial level — auto squad', {
        ...FONTS.small, color: '#4a5a6a', wordWrap: { width: this.infoPanelW - pad * 2 },
      })
      this.infoPanel.add(tutHint)
    }

    const btnW = this.infoPanelW - pad * 2
    const btnH = 40
    const btnY = H - 60 - btnH
    const intelBtnX = pad
    const enterBtnX = pad + btnW / 2 + 4

    const intelBtn = makeNodeButton(this, intelBtnX, btnY, 'INTEL', () => {
      this.scene.launch('LevelPreviewScene', {
        levelId, chapterId: this.chapterId, levelData: data,
      })
    }, { w: btnW / 2 - 4, h: btnH, textSize: FONT_SIZE.xs })
    this.infoPanel.add(intelBtn)

    const enterBtn = makeNodeButton(this, enterBtnX, btnY, 'ENTER', () => this.enterLevel(levelId, data), {
      w: btnW / 2 - 4, h: btnH, role: 'primary', textSize: FONT_SIZE.sm,
    })
    this.infoPanel.add(enterBtn)

    this.infoPanel.setPosition(this.infoPanelPx, 0)
    this.infoPanel.setAlpha(1)
    this.infoPanel.setVisible(true)

    this.infoPanelOverlay.clear()
    this.infoPanelOverlay.fillStyle(0x000000, 0.12)
    this.infoPanelOverlay.fillRect(0, 0, this.infoPanelPx, H)
    ;(this.infoPanelOverlay.input!.hitArea as Phaser.Geom.Rectangle).width = this.infoPanelPx
    this.infoPanelOverlay.setVisible(true)
  }

  private hideLevelInfo(): void {
    if (!this.selectedLevelId) return
    this.selectedLevelId = null
    ;(this.infoPanelOverlay.input!.hitArea as Phaser.Geom.Rectangle).width = 0
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
