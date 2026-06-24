import Phaser from 'phaser'
import { COLORS, FONTS } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'
import { getLevelDef, getNextLevelId, getLevelData } from '../config/chapters'
import { UNIT_CONFIGS } from '../config/units'
import { LevelData, UnitConfig } from '../types/index'

function tutorialSquad(): UnitConfig[] {
  const ids = ['pioneer', 'charger', 'protector', 'fighter', 'sniper', 'core_caster', 'medic_st']
  return ids.map(id => UNIT_CONFIGS.find(u => u.id === id)).filter((u): u is UnitConfig => u !== undefined)
}

export class ResultScene extends Phaser.Scene {
  private chapterId!: string
  private levelId!: string
  private squad!: UnitConfig[]
  private outcome!: 'victory' | 'defeat'
  private stars!: number
  private livesRemaining!: number
  private enemiesDefeated!: number

  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: {
    chapterId: string
    levelId: string
    squad: UnitConfig[]
    outcome: 'victory' | 'defeat'
    stars: number
    livesRemaining: number
    enemiesDefeated: number
  }): void {
    this.chapterId = data.chapterId
    this.levelId = data.levelId
    this.squad = data.squad
    this.outcome = data.outcome
    this.stars = data.stars
    this.livesRemaining = data.livesRemaining
    this.enemiesDefeated = data.enemiesDefeated
  }

  create(): void {
    const W = 1280
    const H = 720
    const isVictory = this.outcome === 'victory'
    const levelDef = getLevelDef(this.levelId)

    this.cameras.main.flash(isVictory ? 300 : 600, isVictory ? 0 : 200, isVictory ? 200 : 0, isVictory ? 83 : 50)

    this.add.text(W / 2, 100, isVictory ? 'SYNC COMPLETE' : 'SYNC FAILED', {
      ...FONTS.h1,
      color: isVictory ? '#00c853' : '#d32f2f',
    }).setOrigin(0.5, 0)

    this.add.text(W / 2, 160, levelDef?.name ?? this.levelId, {
      ...FONTS.h3, color: COLORS.text.primary,
    }).setOrigin(0.5, 0)

    if (isVictory) {
      const starStr = '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars)
      this.add.text(W / 2, 210, starStr, {
        fontSize: '36px', color: '#b07000',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5, 0)
    }

    const statsY = isVictory ? 270 : 220
    const statsLines = [
      `Lives remaining: ${this.livesRemaining}`,
      `Enemies defeated: ${this.enemiesDefeated}`,
    ]
    statsLines.forEach((line, i) => {
      this.add.text(W / 2, statsY + i * 26, line, {
        ...FONTS.body, color: COLORS.text.secondary,
      }).setOrigin(0.5, 0)
    })

    const btnY = H - 100
    const nextLevelId = isVictory ? getNextLevelId(this.levelId) : undefined

    makeNodeButton(this, W / 2 - 160, btnY, 'Retry', () => {
      this.scene.start('GameScene', {
        level: getLevelData(this.levelId) as LevelData,
        squad: this.squad,
        chapterId: this.chapterId,
        levelId: this.levelId,
      })
    }, { w: 140 })

    if (isVictory && nextLevelId && getLevelData(nextLevelId)) {
      const nextData = getLevelData(nextLevelId) as LevelData
      if (nextData.tutorial) {
        makeNodeButton(this, W / 2 + 20, btnY, 'Next Level', () => {
          this.scene.start('GameScene', {
            level: nextData,
            squad: tutorialSquad(),
            chapterId: this.chapterId,
            levelId: nextLevelId,
            autoStart: true,
          })
        }, { w: 140, role: 'primary' })
      } else {
        makeNodeButton(this, W / 2 + 20, btnY, 'Next Level', () => {
          this.scene.start('SquadScene', {
            levelId: nextLevelId,
            chapterId: this.chapterId,
            levelData: nextData,
          })
        }, { w: 140, role: 'primary' })
      }
    }

    if (isVictory && !nextLevelId) {
      this.add.text(W / 2, btnY + 44, '— Chapter Complete —', {
        ...FONTS.h3, color: '#00c853',
      }).setOrigin(0.5, 0)
    }

    makeNodeButton(this, W / 2 - 70, btnY + 52, 'Back to Levels', () => {
      this.scene.start('LevelSelectScene', { chapterId: this.chapterId })
    })
  }
}
