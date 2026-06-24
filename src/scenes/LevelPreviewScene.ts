import Phaser from 'phaser'
import { LevelData, EnemyConfig } from '../types/index'
import { Grid, TILE_SIZE, GRID_OFFSET_Y } from '../entities/Grid'
import { ENEMY_CONFIGS } from '../config/enemies'
import { COLORS, FONTS, FONT_SIZE } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'
import { tutorialSquad } from '../shared/utils/levelHelpers'

export class LevelPreviewScene extends Phaser.Scene {
  private levelId = ''
  private chapterId = ''
  private levelData: LevelData | null = null
  private activeTab: 'map' | 'intel' = 'map'
  private contentContainer!: Phaser.GameObjects.Container
  private mapGrid: Grid | null = null

  constructor() {
    super({ key: 'LevelPreviewScene' })
  }

  init(data: { levelId: string; chapterId: string; levelData: LevelData }): void {
    this.levelId = data.levelId
    this.chapterId = data.chapterId
    this.levelData = data.levelData
    this.activeTab = 'map'
  }

  create(): void {
    const W = 1280
    const H = 720
    const data = this.levelData
    if (!data) { this.scene.stop(); return }

    this.cameras.main.setBackgroundColor('#f0f2f5')

    const gridGfx = this.add.graphics()
    gridGfx.lineStyle(1, 0x4fc3f7, 0.06)
    for (let x = 0; x <= W; x += 48) gridGfx.lineBetween(x, 0, x, H)
    for (let y = 0; y <= H; y += 48) gridGfx.lineBetween(0, y, W, y)

    this.add.text(W / 2, 24, data.name, {
      ...FONTS.h2, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    const tabY = 66
    const tabs: { key: 'map' | 'intel'; x: number }[] = [
      { key: 'map', x: W / 2 - 80 },
      { key: 'intel', x: W / 2 + 80 },
    ]
    for (const tab of tabs) {
      const label = tab.key === 'map' ? 'MAP' : 'ENEMY INTEL'
      makeNodeButton(this, tab.x - 70, tabY, label, () => {
        this.activeTab = tab.key
        this.rebuildContent()
      }, { w: 140, h: 34, textSize: FONT_SIZE.sm })
    }

    this.contentContainer = this.add.container(0, 0)
    this.rebuildContent()

    makeNodeButton(this, 16, 16, '< BACK', () => this.scene.stop(), {
      w: 72, h: 32, textSize: '11px',
    })
    makeNodeButton(this, 94, 16, 'HOME', () => {
      this.scene.start('ChapterSelectScene')
    }, { w: 72, h: 32, textSize: '11px' })

    const btnY = H - 48
    makeNodeButton(this, W - 110, btnY - 17, 'ENTER', () => this.enterLevel(), {
      w: 100, h: 40, role: 'primary',
    })
  }

  private rebuildContent(): void {
    this.contentContainer.removeAll(true)
    if (this.mapGrid) { this.mapGrid.destroy(); this.mapGrid = null }

    if (this.activeTab === 'map') {
      this.buildMapTab()
    } else {
      this.buildIntelTab()
    }
  }

  private buildMapTab(): void {
    const data = this.levelData
    if (!data) return

    const cols = data.cols
    const rows = data.rows
    const gridW = cols * TILE_SIZE
    const availW = this.scale.width
    const offsetX = Math.floor((availW - gridW) / 2)

    this.mapGrid = new Grid(this, cols, rows, offsetX, GRID_OFFSET_Y)
    this.mapGrid.fromLevelData(data)
    this.mapGrid.render()

    const H = this.scale.height
    const gfx = this.add.graphics()
    this.contentContainer.add(gfx)

    const stats = [
      `Waves: ${data.waves.length}`,
      `Deploy: ${data.deploymentLimit}`,
      `Start DP: ${data.startingDP}`,
      `DP Regen: ${data.dpRegenRate}/s`,
      `Lives: ${data.lives}`,
    ]
    const totalEnemies = data.waves.reduce((s, w) => s + w.entries.reduce((a, e) => a + e.count, 0), 0)
    stats.push(`Total hostile: ${totalEnemies}`)

    let py = H - 32
    const px = this.scale.width - 180
    for (let i = stats.length - 1; i >= 0; i--) {
      const t = this.add.text(px, py, stats[i], {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(0, 1)
      this.contentContainer.add(t)
      py -= 18
    }
  }

  private buildIntelTab(): void {
    const data = this.levelData
    if (!data) return

    const W = this.scale.width
    let px = 60
    let py = 100

    const seen = new Map<string, { config: EnemyConfig; total: number }>()
    for (const wave of data.waves) {
      for (const entry of wave.entries) {
        const config = ENEMY_CONFIGS.find(e => e.id === entry.enemyType)
        if (!config) continue
        const existing = seen.get(entry.enemyType)
        if (existing) {
          existing.total += entry.count
        } else {
          seen.set(entry.enemyType, { config, total: entry.count })
        }
      }
    }

    const entries = Array.from(seen.values())
    if (entries.length === 0) {
      const t = this.add.text(W / 2, py, 'No enemy data available', {
        ...FONTS.body, color: COLORS.text.dim,
      }).setOrigin(0.5, 0)
      this.contentContainer.add(t)
      return
    }

    for (const { config, total } of entries) {
      const cardW = Math.min(340, W / entries.length - 24)
      const cx = px + cardW / 2

      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 0.8)
      bg.fillRoundedRect(px, py, cardW, 180, 6)
      bg.lineStyle(1, config.color, 0.4)
      bg.strokeRoundedRect(px, py, cardW, 180, 6)
      this.contentContainer.add(bg)

      const icon = this.add.graphics()
      icon.fillStyle(config.color, 1)
      icon.fillCircle(px + 20, py + 20, 12)
      icon.fillStyle(0xffffff, 0.3)
      icon.fillCircle(px + 20, py + 20, 6)
      this.contentContainer.add(icon)

      const name = this.add.text(px + 38, py + 6, config.name, {
        ...FONTS.bodyBold, color: COLORS.text.primary,
      })
      this.contentContainer.add(name)

      const countT = this.add.text(px + cardW - 10, py + 6, `x${total}`, {
        ...FONTS.small, color: COLORS.text.dim,
      }).setOrigin(1, 0)
      this.contentContainer.add(countT)

      const desc = config.description ?? ''
      const descT = this.add.text(px + 10, py + 30, desc, {
        ...FONTS.small, color: COLORS.text.secondary, wordWrap: { width: cardW - 20 },
      })
      this.contentContainer.add(descT)

      const dmIcon = config.damageType === 'thermal' ? '~' : config.damageType === 'true' ? '!!' : '>'
      const stats = [
        `HP:${config.hp}  ATK:${dmIcon}${config.atk}  DEF:${config.armor}  RES:${config.res}`,
        `Speed:${config.speed}  Interval:${config.attackInterval.toFixed(1)}s  DP:${config.dpOnKill}`,
        config.isAerial ? 'AERIAL — requires ranged units' : 'Ground unit',
      ]
      let sy = py + 60
      for (const line of stats) {
        const t = this.add.text(px + 10, sy, line, {
          fontSize: FONT_SIZE.xs, color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
        })
        this.contentContainer.add(t)
        sy += 16
      }

      px += cardW + 16
      if (px > W - 80) {
        px = 60
        py += 200
      }
    }
  }

  private enterLevel(): void {
    const data = this.levelData
    if (!data) return
    this.scene.start('SquadScene', {
      levelId: this.levelId, chapterId: this.chapterId, levelData: data,
    })
  }
}
