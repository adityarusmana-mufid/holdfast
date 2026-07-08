import Phaser from 'phaser'
import { DeployedUnit, Direction, LevelData, UnitConfig, Position, UnitTrait, EnemyConfig, Route, TileType } from '../types/index'
import { positionsInRange, computeFacingTowardGoal } from '../shared/utils/GridMath'
import { Grid, TILE_SIZE, GRID_OFFSET_Y } from '../entities/Grid'
import { UnitSprite } from '../entities/Unit'
import { EnemySprite } from '../entities/Enemy'
import { DeploymentSystem } from '../systems/DeploymentSystem'
import { EnemyManager } from '../systems/EnemyManager'
import { CombatSystem } from '../systems/CombatSystem'
import { HealingSystem } from '../systems/HealingSystem'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONT_SIZE, SIDEBAR_W as PANEL_W } from '../ui/Constants'
import { makeNodeButton, drawCoreCasterIcon, drawSplashCasterIcon, drawBlastCasterIcon, drawChainCasterIcon, drawMechAccordCasterIcon, drawProtectorIcon, drawGuardianIcon, drawJuggernautIcon, drawFortressIcon, drawArtsProtectorIcon, drawSentryProtectorIcon, drawPioneerIcon, drawChargerIcon, drawCenturionGuardIcon, drawLordGuardIcon, drawArtsFighterIcon, drawInstructorGuardIcon, drawFighterIcon, drawSwordmasterIcon, drawSolobladeIcon, drawReaperIcon, drawEarthshakerIcon, drawCrusherIcon, drawMedicIcon, drawMultiMedicIcon, drawIncantationMedicIcon, drawChainMedicIcon, drawMarksmanIcon, drawArtillerymanIcon, drawDeadeyeIcon, drawHeavyshooterIcon } from '../ui/Components'
import { spawnProjectile, playSwing, showWindUp, flashDamage, spawnChainBolt, spawnSplashRing, spawnExpandRing, spawnBurstParticles, spawnBuffParticles, spawnSparkHit, spawnHealCross } from '../effects/CombatEffects'
import { SkillSystem } from '../systems/SkillSystem'
import { saveCompletion } from '../shared/SaveData'

export class GameScene extends Phaser.Scene {
  private grid!: Grid
  private depSystem!: DeploymentSystem
  private enemyManager!: EnemyManager
  private combatSystem!: CombatSystem
  private healingSystem!: HealingSystem
  private skillSystem!: SkillSystem
  private unitSprites: UnitSprite[] = []
  private cardBarScrollX: number = 0
  private cardBarContainer!: Phaser.GameObjects.Container
  private selectedSquadIndex: number | null = null
  private deployedIndices: Set<number> = new Set()
  private unitCards: { container: Phaser.GameObjects.Container; squadIndex: number }[] = []
  private dpText!: Phaser.GameObjects.Text
  private dpBarBg!: Phaser.GameObjects.Graphics
  private dpBarFill!: Phaser.GameObjects.Graphics
  private limitText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private battleStatusText!: Phaser.GameObjects.Text
  private levelData: LevelData | null = null
  private battleActive: boolean = false
  private battleEnded: boolean = false
  private autoStart: boolean = false
  private resultText!: Phaser.GameObjects.Text
  private hoverIndicator!: Phaser.GameObjects.Graphics
  private activeWindUps: Map<number, { cancel: () => void }> = new Map()
  private maelstromTimers: Map<string, number> = new Map()

  private deployState: 'idle' | 'placing' | 'facing' = 'idle'
  private pendingTile: Position | null = null
  private pendingFacing: Direction = 'up'
  private rangePreview!: Phaser.GameObjects.Graphics
  private facingArrow!: Phaser.GameObjects.Graphics
  private cancelDeployIndicator!: Phaser.GameObjects.Graphics

  private decisionMode: boolean = false
  private inspectingUnit: DeployedUnit | null = null
  private inspectPanel!: Phaser.GameObjects.Container
  private inspectPanelTexts!: Phaser.GameObjects.Text[]
  private inspectActionSkill!: Phaser.GameObjects.Container
  private inspectActionRetreat!: Phaser.GameObjects.Container
  private facingCancelBtn!: Phaser.GameObjects.Container
  private _facingArrowText!: Phaser.GameObjects.Text

  private unitConfigs: UnitConfig[] = UNIT_CONFIGS
  private fromSquad: boolean = false
  private pickedSkills: Record<number, string> = {}
  private chapterId: string = ''
  private levelId: string = ''
  private startingLives: number = 0
  private enemiesDefeated: number = 0

  private speedMultiplier: number = 1
  private speedButton!: Phaser.GameObjects.Container
  private isPaused: boolean = false
  private pauseOverlay!: Phaser.GameObjects.Graphics
  private pauseText!: Phaser.GameObjects.Text
  private pauseButton!: Phaser.GameObjects.Container
  private pauseButtons: Phaser.GameObjects.Container[] = []
  private wavePreviewLine!: Phaser.GameObjects.Graphics
  private encounteredTypes: Set<string> = new Set()
  private activeToasts: Phaser.GameObjects.Container[] = []
  private wavePreviewTween: Phaser.Tweens.Tween | null = null
  private guideActive: boolean = false
  private guideTexts: string[] | null = null
  private guidePageIndex: number = 0
  private selectionDiamond!: Phaser.GameObjects.Graphics
  private unitPreview!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { level?: LevelData; squad?: UnitConfig[]; chapterId?: string; levelId?: string; autoStart?: boolean; pickedSkills?: Record<number, string> }): void {
    if (data?.level) {
      this.levelData = data.level
    }
    if (data?.chapterId) this.chapterId = data.chapterId
    if (data?.levelId) this.levelId = data.levelId
    if (data?.squad) {
      this.unitConfigs = data.squad
      this.fromSquad = true
    } else {
      this.unitConfigs = UNIT_CONFIGS
      this.fromSquad = false
    }
    this.pickedSkills = data?.pickedSkills ?? {}
    this.autoStart = data?.autoStart ?? false
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0)
    this.drawBgGradient()
    this.unitSprites = []
    this.unitCards = []
    this.selectedSquadIndex = null
    this.deployedIndices = new Set()
    this.battleActive = false
    this.battleEnded = false
    this.deployState = 'idle'
    this.pendingTile = null
    this.pendingFacing = 'up'
    this.decisionMode = false
    this.inspectingUnit = null

    const cols = this.levelData?.cols ?? 12
    const rows = this.levelData?.rows ?? 3
    this.grid = new Grid(this, cols, rows, this.computeGridOffsetX(cols), GRID_OFFSET_Y)
    if (this.levelData) {
      this.grid.fromLevelData(this.levelData)
    }
    this.grid.render()

    this.drawGridOverlay()

    this.depSystem = new DeploymentSystem(
      this.grid,
      this.levelData?.startingDP ?? 10,
      this.levelData?.dpRegenRate ?? 1,
      this.levelData?.dpCap ?? 99,
      this.levelData?.deploymentLimit ?? 8,
    )

    this.enemyManager = new EnemyManager(this, this.grid, this.depSystem, {
      onEnemyReachedObjective: (_config) => {
        this.flashMessage(`DESYNC — Enemy reached objective`, 0xd32f2f)
        this.checkBattleEnd()
      },
      onEnemySpawned: (config, row, col) => {
        this.showEnemyToast(config)
        const pos = this.grid.tileToPixel(row, col)
        spawnExpandRing(this, pos.x, pos.y, 0xe0e2e5, 20, 250)
      },
      onWavePrelude: (route) => this.showWavePreview(route),
    })
    if (this.levelData) {
      this.enemyManager.setWaves(this.levelData.waves, this.levelData.routes, this.levelData.lives)
      this.startingLives = this.levelData.lives
    }

    this.combatSystem = new CombatSystem(this.grid, {
      onEnemyKilled: (enemy: EnemySprite, killer: UnitSprite | null) => {
        this.enemyManager.markEnemyDealtWith()
        this.depSystem.addDP(enemy.config.dpOnKill)
        this.cameras.main.shake(100, 0.003)
        if (killer?.config.traits?.some(t => t.traitId === UnitTrait.DPOnKill)) {
          const dpTrait = killer.config.traits.find(t => t.traitId === UnitTrait.DPOnKill)
          this.depSystem.addDP(dpTrait!.value ?? 1)
        }
        if (killer?.config.traits?.some(t => t.traitId === UnitTrait.HealPerHitCapped)) {
          const healTrait = killer.config.traits.find(t => t.traitId === UnitTrait.HealPerHitCapped)
          const healAmount = healTrait?.value ?? 50
          const healed = killer.heal(healAmount)
          if (healed > 0) {
            this.showHealNumber(healed, killer)
          }
        }
      },
      onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => {
        this.showDamageNumber(damage, enemy, damageType)
      },
      onHealApplied: (target: UnitSprite, amount: number, _source: UnitSprite) => {
        this.showHealNumber(amount, target)
      },
      onUnitDamageDealt: (damage: number, unit: UnitSprite, damageType: string) => {
        const deployed = this.depSystem.getUnitAt(unit.row, unit.col)
        if (deployed) this.skillSystem.defensiveSPGain(deployed)
        this.showUnitDamageNumber(damage, unit, damageType)
      },
      onUnitDeath: (unit: UnitSprite, _killer: EnemySprite) => {
        const instId = this.depSystem.removeUnit(unit.row, unit.col)
        this.removeUnitSprite(unit.row, unit.col)
        if (instId !== undefined) this.deployedIndices.delete(instId)
        this.cameras.main.shake(150, 0.005)
        this.flashMessage(`UNIT DESTROYED // ${unit.config.name}`, 0xd32f2f)
        this.rebuildCardBar()
      },
      onUnitAttackInitiated: (unit: UnitSprite, target: EnemySprite, damageType: string) => {
        const deployed = this.depSystem.getUnitAt(unit.row, unit.col)
        if (deployed) this.skillSystem.offensiveSPGain(deployed)
        const isEnhanced = deployed?.skillState?.isActive &&
          deployed.skillState.config.effect.type === 'enhanceAttack'
        const effType = isEnhanced ? 'true' : damageType
        const speed = this.effectiveSpeed
        const tile = target.getCurrentTile()
        if (!tile) return
        const dist = Math.abs(unit.row - tile.row) + Math.abs(unit.col - tile.col)
        if (dist > 1) {
          const from = this.grid.tileToPixel(unit.row, unit.col)
          const dur = Math.min(0.4, Math.max(0.15, dist * 0.08)) / speed
          spawnProjectile(this, from.x, from.y, target, effType, dur)
        } else {
          const tPos = this.grid.tileToPixel(tile.row, tile.col)
          playSwing(this, unit.container, tPos.x, tPos.y, speed)
          if (isEnhanced) {
            spawnSparkHit(this, tPos.x, tPos.y)
          }
        }
        const sk = deployed?.skillState
        if (sk && sk.config.activation === 'auto' && (sk.config.charges ?? 0) > 0) {
          this.skillSystem.tryConsumeCharge(deployed!)
        }
        if (deployed?.nextAttackPushStunWall) {
          deployed.nextAttackPushStunWall = false
          const dRow = tile.row - unit.row
          const dCol = tile.col - unit.col
          const tRow = Math.max(0, Math.min(this.grid.rows - 1, tile.row + Math.sign(dRow || 1)))
          const tCol = Math.max(0, Math.min(this.grid.cols - 1, tile.col + Math.sign(dCol || 1)))
          target.displaceTo(tRow, tCol)
          target.applyStatusEffect({ type: 'stun', remainingDuration: 2.5, factor: 0 })
          if (this.enemyManager) this.enemyManager.onEnemyDisplaced(target)
          if (sk && !(sk.config.charges ?? 0)) this.skillSystem.deactivateSkill(deployed!)
        }
        if (deployed?.nextAttackPullArts) {
          deployed.nextAttackPullArts = false
          const dRow = unit.row - tile.row
          const dCol = unit.col - tile.col
          const distPull = Math.abs(dRow) + Math.abs(dCol)
          if (distPull > 0) {
            const tRow = Math.max(0, Math.min(this.grid.rows - 1, tile.row + Math.sign(dRow)))
            const tCol = Math.max(0, Math.min(this.grid.cols - 1, tile.col + Math.sign(dCol)))
            target.displaceTo(tRow, tCol)
            if (this.enemyManager) this.enemyManager.onEnemyDisplaced(target)
          }
          const artsDmg = Math.max(1, Math.floor(unit.config.atk * 2.1 * 0.05), Math.floor(unit.config.atk * 2.1 - target.config.armor))
          target.takeDamage(artsDmg)
          if (artsDmg > 0) this.showDamageNumber(artsDmg, target, 'kinetic')
          if (sk && !(sk.config.charges ?? 0)) this.skillSystem.deactivateSkill(deployed!)
        }
      },
      onEnemyWindUp: (enemy: EnemySprite, target: UnitSprite, attackId: number) => {
        const speed = this.effectiveSpeed
        const cancel = showWindUp(this, enemy.getContainer(), 0.4, speed)
        this.activeWindUps.set(attackId, cancel)

        if (enemy.config.isAerial) {
          const from = { x: enemy.x, y: enemy.y }
          const tPos = this.grid.tileToPixel(target.row, target.col)
          const dur = 0.25 / speed
          spawnProjectile(this, from.x, from.y, { x: tPos.x, y: tPos.y, alive: target.isAlive() }, enemy.config.damageType, dur)
        }
      },
      onEnemyAttackLanded: (_enemy: EnemySprite, target: UnitSprite, _damage: number) => {
        const tPos = this.grid.tileToPixel(target.row, target.col)
        flashDamage(this, tPos.x, tPos.y, 0xd32f2f)
      },
      onEnemyAttackCancelled: (attackId: number) => {
        const entry = this.activeWindUps.get(attackId)
        if (entry) { entry.cancel(); this.activeWindUps.delete(attackId) }
      },
      onChainJump: (_unit: UnitSprite, from: EnemySprite, to: EnemySprite) => {
        const speed = this.effectiveSpeed
        spawnChainBolt(this, from.x, from.y, to.x, to.y, 0x9b59b6, 0.3 / speed)
      },
      onSplashAoE: (_unit: UnitSprite, center: EnemySprite, radius: number) => {
        const speed = this.effectiveSpeed
        spawnSplashRing(this, center.x, center.y, radius * 64, _unit.config.color)
      },
      effectiveUnitAttack: (unit: UnitSprite) => {
        const deployed = this.depSystem.getUnitAt(unit.row, unit.col)
        if (!deployed?.skillState?.isActive) return null
        const effect = deployed.skillState.config.effect
        if (effect.type !== 'enhanceAttack') return null
        return {
          atk: effect.atkMultiplier ? Math.floor(unit.config.atk * effect.atkMultiplier) : unit.config.atk,
          damageType: effect.trueDamage ? 'true' as const : unit.config.damageType,
          hitCount: effect.hitCount ?? 1,
        }
      },
      effectiveUnitDef: (unit: UnitSprite) => {
        const deployed = this.depSystem.getUnitAt(unit.row, unit.col)
        if (!deployed?.skillState?.isActive) return null
        const effect = deployed.skillState.config.effect
        if (effect.type === 'statBuff' && effect.defMultiplier) {
          return Math.floor(unit.config.def * effect.defMultiplier)
        }
        if (effect.type === 'statToggle' && effect.defMultiplier) {
          return Math.floor(unit.config.def * effect.defMultiplier)
        }
        return null
      },
    })

    this.healingSystem = new HealingSystem(this.grid)

    this.skillSystem = new SkillSystem({
      onSkillActivated: (unit) => {
        const s = unit.skillState
        if (!s) return
        const eff = s.config.effect
        const pos = this.grid.tileToPixel(unit.row, unit.col)
        this.flashMessage(`SKILL // ${s.config.name}`, 0x00a2ff)
        spawnExpandRing(this, pos.x, pos.y, 0xffd700, 40, 400)
        if (eff.type === 'generateDP') {
          this.depSystem.addDP(eff.amount)
          this.flashMessage(`+${eff.amount} DP`, 0x4fc3f7)
        }
        if (eff.type === 'heal' || eff.type === 'buffAlly') {
          const isHeal = eff.type === 'heal'
          const amount = isHeal && eff.amountMultiplier ? Math.floor(unit.config.atk * eff.amountMultiplier) : 0
          if (isHeal && amount > 0) {
            unit.currentHp = Math.min(unit.config.hp, unit.currentHp + amount)
            spawnHealCross(this, pos.x, pos.y)
            this.flashMessage(`+${amount} HP`, 0x4caf50)
          }
          spawnBuffParticles(this, pos.x, pos.y, unit.config.color)
        }
        if (eff.type === 'enhanceAttack') {
          spawnBuffParticles(this, pos.x, pos.y, 0xffd700)
        }
        if (eff.type === 'statBuff') {
          spawnBuffParticles(this, pos.x, pos.y, 0x4fc3f7)
        }
        if (eff.type === 'statToggle') {
          spawnBuffParticles(this, pos.x, pos.y, 0xff9100)
        }
        if (eff.type === 'survival') {
          spawnBuffParticles(this, pos.x, pos.y, 0x00c853)
          if (eff.shieldPercent) {
            this.flashMessage(`SHIELD ${eff.shieldPercent}%`, 0x00a2ff)
          }
        }
        if (eff.type === 'debuffEnemies') {
          spawnExpandRing(this, pos.x, pos.y, 0x9c27b0, 56, 500)
        }
        if (eff.type === 'special' && eff.description === 'aoe_stun') {
          this.depSystem.addDP(12)
          const stunRadius = 2 * TILE_SIZE
          for (const enemy of this.enemyManager.getEnemies()) {
            if (!enemy.alive) continue
            const ePos = { x: enemy.x, y: enemy.y }
            const dx = ePos.x - pos.x
            const dy = ePos.y - pos.y
            if (Math.sqrt(dx * dx + dy * dy) <= stunRadius) {
              enemy.applyStatusEffect({ type: 'stun', remainingDuration: 5, factor: 0 })
            }
          }
          spawnExpandRing(this, pos.x, pos.y, 0x7c4dff, stunRadius * 2, 600)
          this.flashMessage(`+12 DP`, 0x4fc3f7)
        }
        if (eff.type === 'special' && eff.description === 'auto_push_stun_wall') {
          unit.nextAttackPushStunWall = true
          this.flashMessage(`${s.config.name} READY`, 0x00bcd4)
        }
        if (eff.type === 'special' && eff.description === 'auto_pull_arts') {
          unit.nextAttackPullArts = true
          this.flashMessage(`${s.config.name} READY`, 0x7c4dff)
        }
        if (eff.type === 'special' && eff.description === 'line_pull_damage') {
          const rangeTiles: Position[] = []
          for (let i = 1; i <= 3; i++) {
            for (let j = -1; j <= 1; j++) {
              if (unit.facing === 'right') rangeTiles.push({ row: unit.row + j, col: unit.col + i })
              else if (unit.facing === 'left') rangeTiles.push({ row: unit.row + j, col: unit.col - i })
              else if (unit.facing === 'down') rangeTiles.push({ row: unit.row + i, col: unit.col + j })
              else rangeTiles.push({ row: unit.row - i, col: unit.col + j })
            }
          }
          const validTiles = rangeTiles.filter(t => t.row >= 0 && t.row < this.grid.rows && t.col >= 0 && t.col < this.grid.cols)
          const tileSet = new Set(validTiles.map(t => `${t.row},${t.col}`))
          for (const enemy of this.enemyManager.getEnemies()) {
            if (!enemy.alive || enemy.config.isAerial) continue
            const eTile = enemy.getCurrentTile()
            if (!eTile || !tileSet.has(`${eTile.row},${eTile.col}`)) continue
            const dRow = unit.row - eTile.row
            const dCol = unit.col - eTile.col
            const tRow = Math.max(0, Math.min(this.grid.rows - 1, eTile.row + Math.sign(dRow)))
            const tCol = Math.max(0, Math.min(this.grid.cols - 1, eTile.col + Math.sign(dCol)))
            enemy.displaceTo(tRow, tCol)
            if (this.enemyManager) this.enemyManager.onEnemyDisplaced(enemy)
            const dmg = Math.max(1, Math.floor(unit.config.atk * 2.2 * 0.05), Math.floor(unit.config.atk * 2.2 - enemy.config.armor))
            enemy.takeDamage(dmg)
            if (dmg > 0) this.showDamageNumber(dmg, enemy, 'kinetic')
          }
          spawnExpandRing(this, pos.x, pos.y, 0x4fc3f7, 3 * TILE_SIZE, 500)
          this.flashMessage('TIDAL SURGE', 0x4fc3f7)
        }
        if (eff.type === 'special' && eff.description === 'maelstrom_pull_slow') {
          const now = this.time.now
          unit.maelstromActive = true
          unit.maelstromCenter = { row: unit.row, col: unit.col }
          unit.maelstromEndTime = now + 8000
          this.flashMessage('DANCE OF THE MAELSTROM', 0x7c4dff)
        }
        if (eff.type === 'displace') {
          const dispRadius = eff.radius * TILE_SIZE
          for (const enemy of this.enemyManager.getEnemies()) {
            if (!enemy.alive) continue
            if (enemy.config.isAerial) continue
            const ePos = { x: enemy.x, y: enemy.y }
            const dx = ePos.x - pos.x
            const dy = ePos.y - pos.y
            if (Math.sqrt(dx * dx + dy * dy) <= dispRadius) {
              const eTile = enemy.getCurrentTile()
              if (!eTile) continue
              const dRow = eTile.row - unit.row
              const dCol = eTile.col - unit.col
              const dist = Math.sqrt(dRow * dRow + dCol * dCol)
              if (dist === 0) continue
              const sign = eff.direction === 'away' ? 1 : -1
              const tRow = Math.round(eTile.row + (dRow / dist) * sign * eff.tiles)
              const tCol = Math.round(eTile.col + (dCol / dist) * sign * eff.tiles)
              const clampedRow = Math.max(0, Math.min(this.grid.rows - 1, tRow))
              const clampedCol = Math.max(0, Math.min(this.grid.cols - 1, tCol))
              enemy.displaceTo(clampedRow, clampedCol)
              if (this.enemyManager) {
                this.enemyManager.onEnemyDisplaced(enemy)
              }
            }
          }
          spawnExpandRing(this, pos.x, pos.y, 0x00bcd4, dispRadius * 2, 400)
        }
      },
      onChargeChanged: (unit, current, max) => {
        const sprite = this.unitSprites.find(u => u.deployedUnit === unit)
        if (sprite) sprite.updateCharges(current, max)
      },
      onSkillDeactivated: (unit) => {
        this.flashMessage(`SKILL END // ${unit.skillState?.config.name ?? 'END'}`, 0xff9100)
      },
    })

    this.buildInspectPanel()
    this.buildHUD()
    this.buildCardBar()
    this.buildResultText()

    this.rangePreview = this.add.graphics()
    this.rangePreview.setDepth(8)
    this.rangePreview.setAlpha(0)

    this.facingArrow = this.add.graphics()
    this.facingArrow.setDepth(9)
    this.facingArrow.setAlpha(0)

    this.cancelDeployIndicator = this.add.graphics()
    this.cancelDeployIndicator.setDepth(10)
    this.cancelDeployIndicator.setAlpha(0)

    this.selectionDiamond = this.add.graphics()
    this.selectionDiamond.setDepth(7)
    this.selectionDiamond.setAlpha(0)

    this.unitPreview = this.add.graphics()
    this.unitPreview.setDepth(8)
    this.unitPreview.setAlpha(0)

    this.setupInput()

    this.pauseOverlay = this.add.graphics()
    this.pauseOverlay.setDepth(40)
    this.pauseOverlay.setAlpha(0)

    this.pauseText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'PAUSED', {
      fontSize: '42px', color: '#ffffff', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.pauseText.setOrigin(0.5)
    this.pauseText.setDepth(45)
    this.pauseText.setAlpha(0)

    this.wavePreviewLine = this.add.graphics()
    this.wavePreviewLine.setDepth(6)
    this.wavePreviewLine.setAlpha(0)

    this.buildPauseButton()

    if (this.levelData?.guideText) {
      this.showGuide(this.levelData.guideText)
    } else if (this.autoStart) {
      this.battleActive = true
      this.time.delayedCall(2000, () => this.enemyManager.startBattle())
      this.flashMessage('MEMORY STREAM READY // Deploy units', 0x00c853)
    }
  }

  private buildPauseButton(): void {
    this.speedButton = makeNodeButton(this, this.scale.width - 136, 4, 'x1', () => this.toggleSpeed(), {
      w: 60, h: 44, textSize: '13px',
    })

    this.pauseButton = makeNodeButton(this, this.scale.width - 68, 4, '[ II ]', () => {
      if (!this.battleActive || this.battleEnded) return
      this.togglePause()
    }, {
      w: 60, h: 44, textSize: '13px',
    })
  }

  private toggleSpeed(): void {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1
    const txt = this.speedButton.getAt(2) as Phaser.GameObjects.Text
    txt.setText(`x${this.speedMultiplier}`)
    txt.setColor(this.speedMultiplier > 1 ? '#4fc3f7' : COLORS.text.dim)
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused
    if (this.isPaused) {
      this.pauseOverlay.clear()
      this.pauseOverlay.fillStyle(0x000000, 0.55)
      this.pauseOverlay.fillRect(0, 0, this.scale.width, this.scale.height)
      this.pauseOverlay.setAlpha(1)
      this.pauseText.setAlpha(1)
      ;(this.pauseButton.getAt(2) as Phaser.GameObjects.Text).setColor(COLORS.text.accent)

      const cx = this.scale.width / 2

      const mkBtn = (label: string, color: string, yOff: number, cb: () => void) => {
        const btn = makeNodeButton(this, cx - 100, this.scale.height / 2 + yOff, label, () => { this.togglePause(); cb() }, {
          w: 200, h: 38, textSize: FONT_SIZE.sm,
        })
        btn.setDepth(50)
        return btn
      }

      const backBtn = mkBtn('[ Back to Squad ]', COLORS.text.secondary, 50, () => {
        this.scene.start(this.fromSquad ? 'SquadScene' : 'EditorScene', {
          chapterId: this.chapterId, levelId: this.levelId, levelData: this.levelData,
        })
      })
      this.pauseButtons = [backBtn]
    } else {
      this.pauseOverlay.setAlpha(0)
      this.pauseText.setAlpha(0)
      ;(this.pauseButton.getAt(2) as Phaser.GameObjects.Text).setColor(COLORS.text.dim)
      this.pauseButtons?.forEach(b => b.destroy())
      this.pauseButtons = []
    }
  }

  private getSelectedUnit(): UnitConfig | null {
    if (this.selectedSquadIndex === null) return null
    return this.unitConfigs[this.selectedSquadIndex] ?? null
  }

  private setupInput(): void {
    this.input.mouse?.disableContextMenu()

    this.buildInspectActionIcons()
    this.facingCancelBtn = makeNodeButton(this, 10, this.scale.height - 108, '[ CANCEL ]', () => this.cancelDeployment(), {
      w: 100, h: 28, textSize: FONT_SIZE.xs, role: 'danger',
    })
    this.facingCancelBtn.setDepth(50)
    this.facingCancelBtn.setAlpha(0)

    let facingDragActive = false
    let facingDragStartX = 0
    let facingDragStartY = 0

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return

      if (this.deployState === 'facing' && this.pendingTile && this.selectedSquadIndex !== null) {
        const selected = this.getSelectedUnit()
        if (selected) {
          this.pendingFacing = this.computeFacingFromPointer(pointer)
          this.confirmDeployment()
        }
        return
      }

      const pos = this.grid.pixelToTile(pointer.x, pointer.y)
      if (!pos) return

      if (this.battleEnded) {
        this.flashMessage('SIMULATION TERMINATED', 0xff9100)
        return
      }

      if (!this.battleActive) {
        this.flashMessage('INITIALIZE SIMULATION FIRST', 0xff9100)
        return
      }

      if (this.decisionMode && this.inspectingUnit) {
        const clickedOccupied = this.depSystem.getUnitAt(pos.row, pos.col)
        if (clickedOccupied && clickedOccupied !== this.inspectingUnit) {
          this.enterInspectMode(pos)
        } else {
          this.exitDecisionMode()
        }
        return
      }

      const clickedTile = this.grid.getTile(pos.row, pos.col)
      if (clickedTile && clickedTile.type === TileType.StnGen && !this.decisionMode) {
        if (this.depSystem.currentDP < 10) {
          this.flashMessage('NEED 10 DP TO ACTIVATE', 0xff9100)
          return
        }
        this.depSystem.currentDP -= 10
        this.grid.setTile(pos.row, pos.col, TileType.Floor)
        this.grid.render()
        for (const enemy of this.enemyManager.getEnemies()) {
          if (!enemy.alive) continue
          const eTile = enemy.getCurrentTile()
          if (!eTile) continue
          if (Math.abs(eTile.row - pos.row) <= 1 && Math.abs(eTile.col - pos.col) <= 1) {
            enemy.takeDamage(1000)
            enemy.applyStatusEffect({ type: 'stun', remainingDuration: 7, factor: 0 })
          }
        }
        this.flashMessage('STUN GENERATOR ACTIVATED', 0xffd700)
        return
      }

      if (this.deployState === 'placing') {
        const occupiedUnit = this.depSystem.getUnitAt(pos.row, pos.col)
        if (occupiedUnit) {
          this.enterInspectMode(pos)
          return
        }
        if (this.selectedSquadIndex === null) return
        const selected = this.getSelectedUnit()
        if (!selected) return
        const check = this.depSystem.canDeploy(selected, pos.row, pos.col, this.selectedSquadIndex)
        if (check.ok) {
          this.pendingTile = pos
          this.pendingFacing = computeFacingTowardGoal(pos, this.getGoalPositions())
          this.deployState = 'facing'
          this.showSelectionDiamond(pos.row, pos.col, 0x555555)
          this.showUnitPreview(selected, pos.row, pos.col, this.pendingFacing)
          this.showRangePreview(selected, pos, this.pendingFacing)
          this.showFacingArrow(pos, this.pendingFacing)
          this.hoverIndicator.setAlpha(0)
          this.facingCancelBtn.setAlpha(1)
          this.flashMessage(`DIRECTION // ${selected.name}`, selected.color)
        } else {
          this.cancelDeployment()
          this.flashMessage(check.reason ?? 'Cannot deploy', 0xd32f2f)
        }
        facingDragStartX = pointer.x
        facingDragStartY = pointer.y
        facingDragActive = false
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.deployState === 'facing' && this.pendingTile && this.selectedSquadIndex !== null && facingDragActive) {
        this.pendingFacing = this.computeFacingFromPointer(pointer)
        this.confirmDeployment()
      }
      facingDragActive = false
    })

    this.hoverIndicator = this.add.graphics()
    this.hoverIndicator.setDepth(15)
    this.hoverIndicator.setAlpha(0)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.deployState === 'facing') {
        if (!this.pendingTile || this.selectedSquadIndex === null) return
        const selected = this.getSelectedUnit()
        if (!selected) return
        this.showUnitPreview(selected, this.pendingTile.row, this.pendingTile.col, this.pendingFacing)
        const center = this.grid.tileToPixel(this.pendingTile.row, this.pendingTile.col)
        const dx = pointer.x - center.x
        const dy = pointer.y - center.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 12) {
          this.facingArrow.setAlpha(0)
          this.rangePreview.setAlpha(0)
        } else {
          facingDragActive = true
          this.facingArrow.setAlpha(1)
          this.rangePreview.setAlpha(1)
          const facing = this.computeFacingFromPointer(pointer)
          if (facing !== this.pendingFacing) {
            this.pendingFacing = facing
            this.showRangePreview(selected, this.pendingTile, facing)
            this.showFacingArrow(this.pendingTile, facing)
          }
        }
        return
      }

      if (!this.battleActive || this.battleEnded) {
        this.hoverIndicator.setAlpha(0)
        this.hideUnitPreview()
        return
      }
      const pos = this.grid.pixelToTile(pointer.x, pointer.y)
      if (!pos || this.selectedSquadIndex === null) { this.hoverIndicator.setAlpha(0); this.hideUnitPreview(); return }
      const selected = this.getSelectedUnit()
      if (!selected) { this.hoverIndicator.setAlpha(0); this.hideUnitPreview(); return }
      const check = this.depSystem.canDeploy(selected, pos.row, pos.col, this.selectedSquadIndex)
      const { tL, tR, bR, bL } = this.grid.getTileCorners(pos.row, pos.col)
      this.hoverIndicator.clear()
      this.hoverIndicator.fillStyle(check.ok ? 0x00c853 : 0xd32f2f, 0.25)
      this.hoverIndicator.fillPoints([tL, tR, bR, bL], true)
      this.hoverIndicator.lineStyle(2, check.ok ? 0x00c853 : 0xd32f2f, 0.6)
      this.hoverIndicator.beginPath()
      this.hoverIndicator.moveTo(tL.x, tL.y)
      this.hoverIndicator.lineTo(tR.x, tR.y)
      this.hoverIndicator.lineTo(bR.x, bR.y)
      this.hoverIndicator.lineTo(bL.x, bL.y)
      this.hoverIndicator.closePath()
      this.hoverIndicator.strokePath()
      this.hoverIndicator.setAlpha(1)
      if (check.ok && this.deployState === 'placing') {
        this.showUnitPreview(selected, pos.row, pos.col, computeFacingTowardGoal(pos, this.getGoalPositions()))
      } else {
        this.hideUnitPreview()
      }
    })

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (!this.cardBarContainer) return
      const totalW = this.unitConfigs.length * (96 + 6) + 10
      const maxScroll = Math.max(0, totalW - this.scale.width)
      this.cardBarScrollX = Phaser.Math.Clamp(this.cardBarScrollX + dy * 0.5, 0, maxScroll)
      this.cardBarContainer.setX(this.cardBarScrollX)
    })

    let dragStartX = 0
    let dragStartWorldX = 0
    let dragStarted = false
    const dragThreshold = 10
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > this.scale.height - 140) {
        dragStartX = pointer.x
        dragStartWorldX = pointer.worldX
        dragStarted = false
      }
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (dragStartWorldX === 0 && dragStartX === 0) return
      if (!this.cardBarContainer) return
      const dist = Math.abs(pointer.worldX - dragStartWorldX)
      if (!dragStarted && dist < dragThreshold) return
      if (!dragStarted) dragStarted = true
      const dx2 = pointer.x - dragStartX
      dragStartX = pointer.x
      const totalW = this.unitConfigs.length * (96 + 6) + 10
      const maxScroll = Math.max(0, totalW - this.scale.width)
      this.cardBarScrollX = Phaser.Math.Clamp(this.cardBarScrollX - dx2, 0, maxScroll)
      this.cardBarContainer.setX(this.cardBarScrollX)
    })
    this.input.on('pointerup', () => { dragStartX = 0; dragStartWorldX = 0; dragStarted = false })
  }

  private getGoalPositions(): Position[] {
    if (this.levelData?.routes) {
      return this.levelData.routes.map(r => r.goal)
    }
    return []
  }

  private computeFacingFromPointer(pointer: Phaser.Input.Pointer): Direction {
    if (!this.pendingTile) return 'up'
    const center = this.grid.tileToPixel(this.pendingTile.row, this.pendingTile.col)
    const dx = pointer.x - center.x
    const dy = pointer.y - center.y
    const threshold = 8
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return this.pendingFacing
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }

  private showRangePreview(config: UnitConfig, pos: Position, facing: Direction): void {
    const tiles = positionsInRange(pos, config.altRangePattern ?? config.rangePattern, this.grid.rows, this.grid.cols, facing)
    this.rangePreview.clear()
    this.rangePreview.setAlpha(1)
    for (const t of tiles) {
      const { tL, tR, bR, bL } = this.grid.getTileCorners(t.row, t.col)
      this.rangePreview.fillStyle(0x00a2ff, 0.2)
      this.rangePreview.fillPoints([tL, tR, bR, bL], true)
      this.rangePreview.lineStyle(2, 0x00a2ff, 0.6)
      this.rangePreview.beginPath()
      this.rangePreview.moveTo(tL.x, tL.y)
      this.rangePreview.lineTo(tR.x, tR.y)
      this.rangePreview.lineTo(bR.x, bR.y)
      this.rangePreview.lineTo(bL.x, bL.y)
      this.rangePreview.closePath()
      this.rangePreview.strokePath()
    }
  }

  private showFacingArrow(pos: Position, facing: Direction): void {
    const center = this.grid.tileToPixel(pos.row, pos.col)
    this.facingArrow.clear()
    this.facingArrow.setAlpha(1)
    const len = 16
    const head = 6
    let ex = center.x, ey = center.y
    switch (facing) {
      case 'up':    ey = center.y - len; break
      case 'down':  ey = center.y + len; break
      case 'right': ex = center.x + len; break
      case 'left':  ex = center.x - len; break
    }
    this.facingArrow.lineStyle(3, 0x00a2ff, 0.9)
    this.facingArrow.beginPath()
    this.facingArrow.moveTo(center.x, center.y)
    this.facingArrow.lineTo(ex, ey)
    this.facingArrow.strokePath()
    this.facingArrow.fillStyle(0x00a2ff, 0.9)
    if (facing === 'up' || facing === 'down') {
      const dir = facing === 'up' ? -1 : 1
      this.facingArrow.fillTriangle(ex, ey + dir * head, ex - head / 2, ey - dir * head / 2, ex + head / 2, ey - dir * head / 2)
    } else {
      const dir = facing === 'right' ? 1 : -1
      this.facingArrow.fillTriangle(ex + dir * head, ey, ex - dir * head / 2, ey - head / 2, ex - dir * head / 2, ey + head / 2)
    }
  }

  private clearRangePreview(): void {
    this.rangePreview.clear()
    this.rangePreview.setAlpha(0)
    this.facingArrow.clear()
    this.facingArrow.setAlpha(0)
    this.hideSelectionDiamond()
    this.hideUnitPreview()
  }

  private showSelectionDiamond(row: number, col: number, color: number): void {
    const center = this.grid.tileToPixel(row, col)
    const size = TILE_SIZE * 1.5

    this.selectionDiamond.clear()

    // shadow offset for depth illusion
    ;[-1, 1].forEach(dx => {
      ;[-1, 1].forEach(dy => {
        this.selectionDiamond.fillStyle(0x000000, 0.06)
        this.selectionDiamond.beginPath()
        this.selectionDiamond.moveTo(center.x + dx * 2, center.y - size + dy * 2)
        this.selectionDiamond.lineTo(center.x + size + dx * 2, center.y + dy * 2)
        this.selectionDiamond.lineTo(center.x + dx * 2, center.y + size + dy * 2)
        this.selectionDiamond.lineTo(center.x - size + dx * 2, center.y + dy * 2)
        this.selectionDiamond.closePath()
        this.selectionDiamond.fillPath()
      })
    })

    this.selectionDiamond.fillStyle(color, 0.2)
    this.selectionDiamond.beginPath()
    this.selectionDiamond.moveTo(center.x, center.y - size)
    this.selectionDiamond.lineTo(center.x + size, center.y)
    this.selectionDiamond.lineTo(center.x, center.y + size)
    this.selectionDiamond.lineTo(center.x - size, center.y)
    this.selectionDiamond.closePath()
    this.selectionDiamond.fillPath()
    this.selectionDiamond.lineStyle(2, color, 0.7)
    this.selectionDiamond.strokePath()
    this.selectionDiamond.lineStyle(1, color, 0.3)
    this.selectionDiamond.beginPath()
    this.selectionDiamond.moveTo(center.x, center.y - size)
    this.selectionDiamond.lineTo(center.x, center.y + size)
    this.selectionDiamond.strokePath()
    this.selectionDiamond.setAlpha(1)
  }

  private hideSelectionDiamond(): void {
    this.selectionDiamond.clear()
    this.selectionDiamond.setAlpha(0)
  }

  private showUnitPreview(config: UnitConfig, row: number, col: number, facing: Direction): void {
    const center = this.grid.tileToPixel(row, col)
    const size = 36
    const half = size / 2

    this.unitPreview.clear()
    this.unitPreview.fillStyle(config.color, 0.35)

    if (config.type === 'ground') {
      this.unitPreview.fillRect(center.x - half, center.y - half, size, size)
    } else {
      this.unitPreview.fillTriangle(center.x, center.y - half, center.x - half, center.y + half, center.x + half, center.y + half)
    }

    const halfSmall = size / 4
    this.unitPreview.fillStyle(0xffffff, 0.15)
    if (config.type === 'ground') {
      this.unitPreview.fillRect(center.x - halfSmall, center.y - halfSmall, halfSmall * 2, halfSmall * 2)
    } else {
      this.unitPreview.fillTriangle(center.x, center.y - halfSmall / 2, center.x - halfSmall, center.y + halfSmall, center.x + halfSmall, center.y + halfSmall)
    }

    this.unitPreview.setAlpha(1)
  }

  private hideUnitPreview(): void {
    this.unitPreview.clear()
    this.unitPreview.setAlpha(0)
  }

  private confirmDeployment(): void {
    if (!this.pendingTile || this.selectedSquadIndex === null) return
    const selected = this.getSelectedUnit()
    if (!selected) return
    const deployed = this.depSystem.deployUnit(selected, this.pendingTile.row, this.pendingTile.col, this.pendingFacing, this.selectedSquadIndex)
    if (deployed) {
      const skillId = this.pickedSkills[this.selectedSquadIndex] ?? selected.skills[0]?.id
      if (skillId) this.skillSystem.initSkillState(deployed, skillId)
      const sprite = new UnitSprite(this, this.grid, selected, this.pendingTile.row, this.pendingTile.col, selected.hp, this.pendingFacing)
      sprite.container.setScale(0.3)
      this.tweens.add({ targets: sprite.container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' })
      sprite.container.setInteractive(new Phaser.Geom.Rectangle(-TILE_SIZE * 0.35, -TILE_SIZE * 0.35, TILE_SIZE * 0.7, TILE_SIZE * 0.7), Phaser.Geom.Rectangle.Contains)
      if (sprite.container.input) sprite.container.input.cursor = 'pointer'
      sprite.container.on('pointerup', (p: Phaser.Input.Pointer) => {
        const moved = Math.abs(p.x - p.downX) + Math.abs(p.y - p.downY)
        if (moved > 10) return
        this.inspectUnit(sprite)
      })
      this.unitSprites.push(sprite)
      this.deployedIndices.add(this.selectedSquadIndex)
      const cost = this.depSystem.getCurrentCost(this.selectedSquadIndex, selected)
      const deployPos = this.grid.tileToPixel(this.pendingTile.row, this.pendingTile.col)
      spawnExpandRing(this, deployPos.x, deployPos.y, selected.color, 28, 350)
      this.flashMessage(`DEPLOY // ${selected.name}  -${cost} DP`, selected.color)
      this.selectedSquadIndex = null
      this.rebuildCardBar()

      if (selected.id === 'roadblock' && this.enemyManager) {
        this.enemyManager.onRoadblockDeployed(this.pendingTile!.row, this.pendingTile!.col)
      }
    }
    this.clearRangePreview()
    this.cancelDeployIndicator.setAlpha(0)
    this.facingCancelBtn.setAlpha(0)
    this.pendingTile = null
    this.deployState = 'idle'
    this.exitDecisionMode()
  }

  private cancelDeployment(): void {
    this.clearRangePreview()
    this.cancelDeployIndicator.setAlpha(0)
    this.facingCancelBtn.setAlpha(0)
    this.pendingTile = null
    this.deployState = 'idle'
    this.exitDecisionMode()
    this.flashMessage('DEPLOYMENT CANCELLED', 0xff9100)
  }

  private enterInspectMode(pos: Position): void {
    const unit = this.depSystem.getUnitAt(pos.row, pos.col)
    if (!unit) return
    this.enterInspectUnit(unit)
  }

  private enterInspectUnit(unit: DeployedUnit): void {
    this.inspectingUnit = unit
    this.decisionMode = true
    this.showSelectionDiamond(unit.row, unit.col, 0x555555)
    this.showRangePreview(unit.config, { row: unit.row, col: unit.col }, unit.facing)
    this.showFacingArrow({ row: unit.row, col: unit.col }, unit.facing)
    this.showInspectPanel(unit)
    this.positionActionIcons(unit)
    this.flashMessage(`INSPECT // ${unit.config.name}`, 0x00a2ff)
  }

  private activateInspectSkill(): void {
    if (!this.inspectingUnit) return
    const unit = this.inspectingUnit
    const state = unit.skillState
    if (!state) return

    if (state.isActive && state.config.activation === 'toggle') {
      this.skillSystem.deactivateSkill(unit)
      this.enterInspectUnit(unit)
      this.flashMessage(`TOGGLE OFF // ${state.config.name}`, 0xff9100)
      return
    }

    if (this.skillSystem.canActivateSkill(unit)) {
      this.skillSystem.activateSkill(unit)
      this.enterInspectUnit(unit)
      this.flashMessage(`SKILL // ${state.config.name}`, 0x00c853)
    }
  }

  private inspectUnit(sprite: UnitSprite): void {
    const unit = this.depSystem.getUnitAt(sprite.row, sprite.col)
    if (unit) this.enterInspectUnit(unit)
  }

  private exitDecisionMode(): void {
    if (this.inspectingUnit) {
      this.inspectingUnit = null
      this.hideActionIcons()
    }
    this.decisionMode = false
    this.hideSelectionDiamond()
    this.clearRangePreview()
    if (this.selectedSquadIndex !== null) {
      const unit = this.unitConfigs[this.selectedSquadIndex]
      if (unit) this.showCardPanel(unit, this.selectedSquadIndex)
    } else {
      this.hideInspectPanel()
    }
  }

  private retreatInspectedUnit(): void {
    if (!this.inspectingUnit) return
    if (this.inspectingUnit.skillState?.isActive) {
      this.skillSystem.deactivateSkill(this.inspectingUnit)
    }
    const { row, col, config, instanceId } = this.inspectingUnit
    const refund = this.depSystem.retreatUnit(row, col)
    if (refund > 0) {
      const retreatPos = this.grid.tileToPixel(row, col)
      spawnBurstParticles(this, retreatPos.x, retreatPos.y, config.color, 8)
      this.removeUnitSprite(row, col)
      this.deployedIndices.delete(instanceId)
      this.flashMessage(`RETREAT // ${config.name}  +${refund} DP`, 0x00c853)

      if (config.id === 'roadblock' && this.enemyManager) {
        this.enemyManager.onRoadblockRemoved(row, col)
      }
    }
    this.exitDecisionMode()
    this.rebuildCardBar()
  }

  private get effectiveSpeed(): number {
    return this.speedMultiplier * (this.decisionMode ? 0.5 : 1)
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000
    const speed = this.effectiveSpeed

    if (this.battleActive && !this.battleEnded && !this.isPaused) {
      this.depSystem.update(dt * speed)
      this.enemyManager.update(dt * speed)
      const enemies = this.enemyManager.getEnemies()
      const allUnits = this.depSystem.getAllUnits()
      this.skillSystem.update(delta * speed, allUnits)
      for (const du of allUnits) {
        const sprite = this.unitSprites.find(s => s.row === du.row && s.col === du.col)
        if (sprite) {
          du.currentHp = sprite.currentHp
          if (du.skillState) {
            const isPrimed = du.skillState.isActive && du.skillState.config.durationType === 'instant'
            sprite.updateSp(isPrimed ? 1 : this.skillSystem.getSpProgress(du))
          }
        }
      }
      for (const du of allUnits) {
        const actEff = du.skillState?.isActive ? du.skillState.config.effect : null
        if (actEff?.type === 'statBuff' && actEff.blockBonus) {
          du.effectiveBlockCount = du.config.blockCount + actEff.blockBonus
        } else if (actEff?.type === 'statToggle' && actEff.blockBonus) {
          du.effectiveBlockCount = du.config.blockCount + actEff.blockBonus
        } else {
          du.effectiveBlockCount = undefined
        }
      }
      const now = this.time.now
      for (const du of allUnits) {
        if (!du.maelstromActive || !du.maelstromEndTime || now >= du.maelstromEndTime) {
          if (du.maelstromActive) du.maelstromActive = false
          continue
        }
        const key = `${du.row},${du.col}`
        const lastPull = this.maelstromTimers.get(key) ?? 0
        if (now - lastPull < 1500) continue
        this.maelstromTimers.set(key, now)
        for (const enemy of enemies) {
          if (!enemy.alive || enemy.config.isAerial) continue
          const eTile = enemy.getCurrentTile()
          if (!eTile) continue
          const dist = Math.abs(eTile.row - du.row) + Math.abs(eTile.col - du.col)
          if (dist > 2) continue
          const dRow = du.row - eTile.row
          const dCol = du.col - eTile.col
          const tRow = Math.max(0, Math.min(this.grid.rows - 1, eTile.row + Math.sign(dRow)))
          const tCol = Math.max(0, Math.min(this.grid.cols - 1, eTile.col + Math.sign(dCol)))
          enemy.displaceTo(tRow, tCol)
          enemy.applyStatusEffect({ type: 'slow', remainingDuration: 1.5, factor: 0.5 })
          if (this.enemyManager) this.enemyManager.onEnemyDisplaced(enemy)
        }
      }
      this.combatSystem.update(delta * speed, this.unitSprites, enemies)
      this.healingSystem.update(delta * speed, this.unitSprites, (target, amount, source) => {
        this.showHealNumber(amount, target)
      })
      this.checkBattleEnd()
    }

    if (this.inspectingUnit) {
      this.updateInspectPanel(this.inspectingUnit)
    }

    this.updateHUD()
    this.updateCardVisuals()
  }

  private buildInspectPanel(): void {
    const H = this.scale.height

    this.inspectPanel = this.add.container(0, 0)
    this.inspectPanel.setDepth(20)
    this.inspectPanel.setX(-PANEL_W)

    const bg = this.add.graphics()
    bg.fillStyle(0x1a1d23, 0.95)
    bg.fillRect(0, 0, PANEL_W, H)
    bg.lineStyle(1, 0x343a46, 0.6)
    bg.strokeRect(0, 0, PANEL_W, H)
    this.inspectPanel.add(bg)

    const closeBtn = this.add.text(PANEL_W - 10, 6, '\u2715', {
      fontSize: '14px', color: '#9aa4b8',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    }).setOrigin(1, 0)
    closeBtn.setInteractive(new Phaser.Geom.Rectangle(-20, -6, 40, 30), Phaser.Geom.Rectangle.Contains)
    if (closeBtn.input) closeBtn.input.cursor = 'pointer'
    closeBtn.on('pointerdown', () => this.exitDecisionMode())
    this.inspectPanel.add(closeBtn)

    const fs = '13px'
    const ff = '"Share Tech Mono", "Roboto Mono", monospace'
    const wrapW = PANEL_W - 16

    const lines: Phaser.GameObjects.Text[] = []
    const baseY = 66
    const lineH = 22
    for (let i = 0; i < 10; i++) {
      const t = this.add.text(8, baseY + i * lineH, '', {
        fontSize: fs, fontFamily: ff, color: '#9aa4b8',
        wordWrap: { width: wrapW },
      })
      this.inspectPanel.add(t)
      lines.push(t)
    }
    this.inspectPanelTexts = lines
  }

  private showInspectPanel(unit: DeployedUnit): void {
    this.ensurePanelVisible()
    this.populateInspectPanel(unit)
  }

  private showCardPanel(unit: UnitConfig, squadIndex: number): void {
    this.ensurePanelVisible()
    const lines = this.inspectPanelTexts
    const cWhite = '#f0f2f5'
    const cDim = '#9aa4b8'

    const dmIcon = unit.damageType === 'thermal' ? '~' : unit.damageType === 'true' ? '!!' : '>'
    const typeLabel = unit.type === 'ground' ? 'GND' : 'RNG'

    lines[0].setText(`${unit.subtypeLabel}  ${typeLabel}`)
    lines[0].setColor(cWhite)
    lines[0].setFontStyle('bold')

    lines[1].setText(`HP  ${unit.hp}`)
    lines[1].setColor(cDim)

    lines[2].setText(`ATK  ${dmIcon}${unit.atk}`)
    lines[2].setColor(cDim)

    lines[3].setText(`DEF  ${unit.def}`)
    lines[3].setColor(cDim)

    lines[4].setText(`RES  ${unit.res}%`)
    lines[4].setColor(cDim)

    lines[5].setText(`BLK  ${unit.blockCount}  INT  ${unit.attackInterval.toFixed(2)}s  DP  ${unit.dpCost}`)
    lines[5].setColor(cDim)

    if (this._facingArrowText) this._facingArrowText.setText('')

    const pickedSkillId = this.pickedSkills[squadIndex]
    const skill = unit.skills?.find(s => s.id === pickedSkillId) ?? unit.skills?.[0]

    if (skill) {
      const recIcon = skill.spRecovery === 'auto' ? '\u27F3' : skill.spRecovery === 'offensive' ? '\u2694' : '\u2291'
      const actIcon = skill.activation === 'auto' ? 'A' : skill.activation === 'manual' ? 'M' : skill.activation === 'toggle' ? 'T' : 'P'
      lines[6].setText('\u2500\u2500\u2500 SKILL \u2500\u2500\u2500')
      lines[6].setColor(cDim)
      lines[7].setText(`${skill.name}  SP${skill.spCost}  ${recIcon} ${actIcon}`)
      lines[7].setColor(cWhite)
      lines[7].setFontStyle('bold')
      lines[8].setText(skill.description)
      lines[8].setColor(cDim)
    } else {
      lines[6].setText('')
      lines[7].setText('')
      lines[8].setText('')
    }
  }

  private ensurePanelVisible(): void {
    if (this.inspectPanel.x < 0) {
      this.inspectPanel.setX(-PANEL_W)
      this.tweens.killTweensOf(this.inspectPanel)
      this.tweens.add({
        targets: this.inspectPanel,
        x: 0,
        duration: 150,
        ease: 'Sine.easeOut',
      })
    }
  }

  private hideInspectPanel(): void {
    this.tweens.killTweensOf(this.inspectPanel)
    this.tweens.add({
      targets: this.inspectPanel,
      x: -210,
      duration: 120,
      ease: 'Sine.easeIn',
    })
  }

  private updateInspectPanel(unit: DeployedUnit): void {
    this.populateInspectPanel(unit)
  }

  private getEffectiveStats(unit: DeployedUnit): { atk: number; def: number; block: number } {
    let atk = unit.config.atk
    let def = unit.config.def
    let block = unit.effectiveBlockCount ?? unit.config.blockCount
    if (unit.skillState?.isActive) {
      const eff = unit.skillState.config.effect
      if (eff.type === 'enhanceAttack' && eff.atkMultiplier) {
        atk = Math.floor(unit.config.atk * eff.atkMultiplier)
      }
      if (eff.type === 'statBuff') {
        if (eff.atkMultiplier) atk = Math.floor(unit.config.atk * eff.atkMultiplier)
        if (eff.defMultiplier) def = Math.floor(unit.config.def * eff.defMultiplier)
      }
      if (eff.type === 'statToggle') {
        if (eff.atkMultiplier) atk = Math.floor(unit.config.atk * eff.atkMultiplier)
        if (eff.defMultiplier) def = Math.floor(unit.config.def * eff.defMultiplier)
      }
    }
    const tile = this.grid.getTile(unit.row, unit.col)
    if (tile && tile.type === TileType.ArmorGrid) def += 100
    return { atk, def, block }
  }

  private populateInspectPanel(unit: DeployedUnit): void {
    const cfg = unit.config
    const effStats = this.getEffectiveStats(unit)
    const lines = this.inspectPanelTexts
    const cWhite = '#f0f2f5'
    const cDim = '#9aa4b8'
    const cHP = Math.round(unit.currentHp / unit.config.hp * 100) > 50 ? '#4caf50' : '#ff9100'

    const dmIcon = cfg.damageType === 'thermal' ? '~' : cfg.damageType === 'true' ? '!!' : '>'
    const typeLabel = cfg.type === 'ground' ? 'GND' : 'RNG'
    const hpPct = Math.round(unit.currentHp / unit.config.hp * 100)

    lines[0].setText(`${cfg.subtypeLabel}  ${typeLabel}`)
    lines[0].setColor(cWhite)
    lines[0].setFontStyle('bold')

    const hpStr = `HP  ${unit.currentHp}/${unit.config.hp}  (${hpPct}%)`
    const dirArrow: Record<string, string> = { up: '\u2191', down: '\u2193', left: '\u2190', right: '\u2192' }
    const facingStr = dirArrow[unit.facing] ?? ''
    lines[1].setText(facingStr ? `${hpStr}  ${facingStr}` : hpStr)
    lines[1].setColor(cHP)

    const atkBase = cfg.atk
    const atkV = effStats.atk !== atkBase ? `${effStats.atk} (${atkBase})` : `${atkBase}`
    lines[2].setText(`ATK  ${dmIcon}${atkV}`)
    lines[2].setColor(cDim)

    const defBase = cfg.def
    const defV = effStats.def !== defBase ? `${effStats.def} (${defBase})` : `${defBase}`
    lines[3].setText(`DEF  ${defV}`)
    lines[3].setColor(cDim)

    lines[4].setText(`RES  ${cfg.res}%`)
    lines[4].setColor(cDim)

    const blkBase = cfg.blockCount
    const blkV = effStats.block !== blkBase ? `${effStats.block} (${blkBase})` : `${blkBase}`
    lines[5].setText(`BLK  ${blkV}  INT  ${cfg.attackInterval.toFixed(2)}s`)
    lines[5].setColor(cDim)

    if (this._facingArrowText) this._facingArrowText.setText('')

    const skill = unit.skillState
    if (skill) {
      const maxCh = skill.config.charges ?? 0
      const isPrimed = skill.isActive && skill.config.durationType === 'instant'
      const max = maxCh > 0 ? maxCh * skill.config.spCost : skill.config.spCost
      const spInt = maxCh > 0
        ? skill.charges * skill.config.spCost + Math.floor(skill.currentSp)
        : (isPrimed ? max : Math.floor(skill.currentSp))
      const spBar = '\u2588'.repeat(Math.round(spInt / max * 8)).padEnd(8, '\u2591')
      const statusMark = skill.config.activation === 'toggle'
        ? (skill.isActive ? '[ON]' : '[OFF]')
        : (maxCh > 0
          ? (skill.charges > 0 ? '[CHARGED]' : '')
          : (isPrimed ? '[PRIMED]' : (skill.isActive ? '[ACTIVE]' : '')))
      const isReady = maxCh > 0
        ? skill.charges > 0 && !skill.isActive
        : (isPrimed || (spInt >= max && !skill.isActive))

      lines[6].setText('\u2500\u2500\u2500 SKILL \u2500\u2500\u2500')
      lines[6].setColor(cDim)

      lines[7].setText(skill.config.name)
      lines[7].setColor(isReady ? '#00c853' : cWhite)
      lines[7].setFontStyle('bold')

      const recIcon = skill.config.spRecovery === 'auto' ? '\u27F3' : skill.config.spRecovery === 'offensive' ? '\u2694' : '\u2291'
      const actIcon = skill.config.activation === 'auto' ? 'A' : skill.config.activation === 'manual' ? 'M' : skill.config.activation === 'toggle' ? 'T' : 'P'
      const chargeStr = maxCh > 0 ? `  CHG:${skill.charges}/${maxCh}` : ''
      lines[8].setText(`SP  [${spBar}]  ${spInt}/${max}${chargeStr}  ${statusMark}  ${recIcon} ${actIcon}`)
      lines[8].setColor(cDim)
      lines[9].setText(skill.config.description)
      lines[9].setColor(cDim)
    } else {
      lines[6].setText('')
      lines[7].setText('')
      lines[8].setText('')
      lines[9].setText('')
    }
  }

  private buildInspectActionIcons(): void {
    const dSize = 40
    const half = dSize / 2

    const mkIcon = (fillColor: number, sym: string, onClick: () => void): Phaser.GameObjects.Container => {
      const c = this.add.container(0, 0)
      const g = this.add.graphics()
      g.fillStyle(fillColor, 1)
      g.beginPath()
      g.moveTo(0, -half)
      g.lineTo(half, 0)
      g.lineTo(0, half)
      g.lineTo(-half, 0)
      g.closePath()
      g.fillPath()
      g.lineStyle(2, 0xffffff, 0.3)
      g.strokePath()
      c.add(g)

      const txt = this.add.text(0, 0, sym, {
        fontSize: '16px', color: '#ffffff',
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0.5)
      c.add(txt)

      c.setSize(dSize, dSize)
      c.setInteractive(new Phaser.Geom.Rectangle(-half, -half, dSize, dSize), Phaser.Geom.Rectangle.Contains)
      if (c.input) c.input.cursor = 'pointer'

      c.on('pointerdown', onClick)
      c.setAlpha(0)
      c.setDepth(50)
      return c
    }

    this.inspectActionSkill = mkIcon(0x1976d2, '\u26A1', () => this.activateInspectSkill())
    this.inspectActionRetreat = mkIcon(0xc62828, '\u27F3', () => this.retreatInspectedUnit())
  }

  private positionActionIcons(unit: DeployedUnit): void {
    const pos = this.grid.tileToPixel(unit.row, unit.col)
    const off = 64  // outside selection diamond (TILE_SIZE * 1.5)

    this.inspectActionSkill.setPosition(pos.x + off, pos.y)
    this.inspectActionSkill.setAlpha(1)

    this.inspectActionRetreat.setPosition(pos.x - off, pos.y)
    this.inspectActionRetreat.setAlpha(1)
  }

  private hideActionIcons(): void {
    this.inspectActionSkill.setAlpha(0)
    this.inspectActionRetreat.setAlpha(0)
  }

  private buildCardBar(): void {
    this.cardBarContainer = this.add.container(0, this.scale.height - 140)
    this.cardBarContainer.setDepth(35)
    this.unitCards = []
    this.cardBarScrollX = 0
    this.rebuildCardBar()
  }

  private rebuildCardBar(): void {
    if (!this.cardBarContainer) return
    this.cardBarContainer.removeAll(true)
    this.unitCards = []

    const cardW = 96
    const cardH = 128
    const gap = 6
    const px = 10
    const py = 6

    const entries: { unit: UnitConfig; squadIndex: number }[] = []
    this.unitConfigs.forEach((c, i) => {
      if (!this.deployedIndices.has(i)) {
        entries.push({ unit: c, squadIndex: i })
      }
    })
    entries.sort((a, b) => this.depSystem.getCurrentCost(b.squadIndex, b.unit) - this.depSystem.getCurrentCost(a.squadIndex, a.unit))

    entries.forEach(({ unit, squadIndex }, i) => {
      const x = this.scale.width - px - cardW - i * (cardW + gap)
      const card = this.makeUnitCard(x, py, cardW, cardH, unit, squadIndex)
      this.unitCards.push(card)
      this.cardBarContainer.add(card.container)
    })
  }

  private makeUnitCard(cx: number, cy: number, cardW: number, cardH: number, unit: UnitConfig, squadIndex: number): { container: Phaser.GameObjects.Container; squadIndex: number } {
    const cost = this.depSystem.getCurrentCost(squadIndex, unit)
    const canAfford = this.depSystem.currentDP >= cost
    const onCooldown = this.depSystem.isOnCooldown(squadIndex)
    const isSelected = this.selectedSquadIndex === squadIndex

    const bg = this.add.graphics()
    bg.fillStyle(0x1A1A3E, 1)
    bg.fillRect(0, 0, cardW, cardH)
    bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x4488FF : 0x6B7280, 1)
    bg.setAlpha(!canAfford && !onCooldown ? 0.45 : 1)

    const iconX = cardW / 2
    const iconY = 44
    const iconSize = 48
    const icon = this.add.graphics()
    if (unit.id === 'core_caster') {
      drawCoreCasterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'splash_caster') {
      drawSplashCasterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'blast_caster') {
      drawBlastCasterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'chain_caster') {
      drawChainCasterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'mech_accord_caster') {
      drawMechAccordCasterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'protector') {
      drawProtectorIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'guardian') {
      drawGuardianIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'juggernaut') {
      drawJuggernautIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'fortress_defender') {
      drawFortressIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'arts_protector') {
      drawArtsProtectorIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'sentry_protector') {
      drawSentryProtectorIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'centurion_guard') {
      drawCenturionGuardIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'lord_guard') {
      drawLordGuardIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'arts_fighter') {
      drawArtsFighterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'instructor_guard') {
      drawInstructorGuardIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'fighter') {
      drawFighterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'swordmaster') {
      drawSwordmasterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'soloblade') {
      drawSolobladeIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'reaper') {
      drawReaperIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'earthshaker') {
      drawEarthshakerIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'crusher') {
      drawCrusherIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'medic_st') {
      drawMedicIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'medic_multi') {
      drawMultiMedicIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'incantation_medic') {
      drawIncantationMedicIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'chain_medic') {
      drawChainMedicIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'sniper') {
      drawMarksmanIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'artilleryman') {
      drawArtillerymanIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'deadeye') {
      drawDeadeyeIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'heavyshooter') {
      drawHeavyshooterIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'pioneer') {
      drawPioneerIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.id === 'charger') {
      drawChargerIcon(icon, iconX, iconY, iconSize, unit.color)
    } else if (unit.type === 'ground') {
      icon.fillStyle(unit.color, 1)
      icon.fillRect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize)
      icon.fillStyle(0xffffff, 0.2)
      icon.fillRect(iconX - iconSize / 4, iconY - iconSize / 4, iconSize / 2, iconSize / 2)
    } else {
      icon.fillStyle(unit.color, 1)
      icon.fillTriangle(iconX, iconY - iconSize / 2, iconX - iconSize / 2, iconY + iconSize / 2, iconX + iconSize / 2, iconY + iconSize / 2)
      icon.fillStyle(0xffffff, 0.2)
      icon.fillTriangle(iconX, iconY - iconSize / 4, iconX - iconSize / 4, iconY + iconSize / 4, iconX + iconSize / 4, iconY + iconSize / 4)
    }

    const pickedId = this.pickedSkills[squadIndex]
    const skill = unit.skills?.find(s => s.id === pickedId) ?? unit.skills?.[0]
    const skillName = skill?.name ?? ''
    const skillCost = skill?.spCost ?? 0

    const nameLabel = this.add.text(cardW / 2, 69, unit.subtypeLabel, {
      fontSize: '15px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    nameLabel.setOrigin(0.5, 0)

    const skillLabel = this.add.text(cardW / 2, 89, `${skillName} SP${skillCost}`, {
      fontSize: '10px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    skillLabel.setOrigin(0.5, 0)

    const dpLabel = this.add.text(cardW / 2, 102, `DP ${cost}`, {
      fontSize: FONT_SIZE.xs, color: onCooldown ? COLORS.text.danger : COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    dpLabel.setOrigin(0.5, 0)

    const cdRing = this.add.graphics()

    const children: Phaser.GameObjects.GameObject[] = [bg, icon, nameLabel, skillLabel, dpLabel, cdRing]

    if (onCooldown) {
      const remaining = Math.max(0, this.depSystem.getCooldownRemaining(squadIndex))
      this.drawCooldownRing(cdRing, cardW - 14, 14, 10, remaining / unit.redeployTime)
      const cdText = this.add.text(cardW / 2, cardH / 2 - 4, `${remaining.toFixed(1)}s`, {
        fontSize: '15px', color: '#d32f2f', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
      })
      cdText.setOrigin(0.5)
      children.push(cdText)
    }

    const container = this.add.container(cx, cy, children)
    container.setSize(cardW, cardH)
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, cardW, cardH), Phaser.Geom.Rectangle.Contains)
    if (container.input) container.input.cursor = 'pointer'
    container.on('pointerdown', () => this.selectUnit(squadIndex))
    return { container, squadIndex }
  }

  private drawCooldownRing(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, progress: number): void {
    g.clear()
    g.lineStyle(3, 0x303030, 1)
    g.strokeCircle(x, y, radius)
    if (progress > 0) {
      g.lineStyle(3, 0xd32f2f, 1)
      g.beginPath()
      g.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
      g.strokePath()
    }
  }

  private updateCardVisuals(): void {
    for (const { container, squadIndex } of this.unitCards) {
      const unit = this.unitConfigs[squadIndex]
      if (!unit) continue
      const cost = this.depSystem.getCurrentCost(squadIndex, unit)
      const canAfford = this.depSystem.currentDP >= cost
      const onCooldown = this.depSystem.isOnCooldown(squadIndex)
      const isSelected = this.selectedSquadIndex === squadIndex

      container.y = isSelected ? 2 : 6

      const bg = container.getAt(0) as Phaser.GameObjects.Graphics
      bg.clear()
      bg.fillStyle(isSelected ? 0x0004EB : 0x0D0D30, 1)
      bg.fillRect(0, 0, 96, 128)
      bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x4488FF : 0x6B7280, 1)
      bg.setAlpha(!canAfford && !onCooldown ? 0.45 : 1)

      const skillLabel = container.getAt(3) as Phaser.GameObjects.Text
      const pickedId = this.pickedSkills[squadIndex]
      const skillCfg = unit.skills?.find(s => s.id === pickedId) ?? unit.skills?.[0]
      skillLabel.setText(skillCfg ? `${skillCfg.name} SP${skillCfg.spCost}` : '')

      const dpLabel = container.getAt(4) as Phaser.GameObjects.Text
      dpLabel.setText(`DP ${cost}`)
      dpLabel.setColor(onCooldown ? COLORS.text.danger : COLORS.text.accent)

      const cdRing = container.getAt(5) as Phaser.GameObjects.Graphics
      if (onCooldown) {
        const remaining = Math.max(0, this.depSystem.getCooldownRemaining(squadIndex))
        this.drawCooldownRing(cdRing, 96 - 14, 14, 10, remaining / unit.redeployTime)
        if (container.length >= 7) {
          const cdText = container.getAt(6) as Phaser.GameObjects.Text
          cdText.setText(`${remaining.toFixed(1)}s`)
          cdText.setAlpha(1)
        }
      } else {
        cdRing.clear()
        if (container.length >= 7) {
          const cdText = container.getAt(6) as Phaser.GameObjects.Text
          cdText.setAlpha(0)
        }
      }
    }
  }

  private buildHUD(): void {
    const W = this.scale.width
    const col1 = Math.round(W * 0.12)
    const col2 = Math.round(W * 0.32)

    this.limitText = this.add.text(col1, 10, '', {
      fontSize: FONT_SIZE.sm, color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.livesText = this.add.text(col2, 10, '', {
      fontSize: FONT_SIZE.lg, color: COLORS.text.danger, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.waveText = this.add.text(col2, 32, '', {
      fontSize: FONT_SIZE.sm, color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.statusText = this.add.text(col1, 32, '', {
      fontSize: FONT_SIZE.sm, color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })

    const nodeW = 90
    const nodeH = 26
    const tagH = 12
    const rightX = W - 10
    const gap = 10
    const baseY = this.scale.height - 140 - gap

    const shadow = this.add.graphics()
    shadow.fillStyle(0x000000, 0.15)
    shadow.fillRect(rightX - nodeW + 2, baseY - nodeH + 2, nodeW, nodeH)
    shadow.fillRect(rightX - nodeW + 2, baseY + 2, nodeW, tagH)

    const dpBg = this.add.graphics()
    dpBg.fillGradientStyle(0x4a4a4a, 0x4a4a4a, 0x383838, 0x383838, 1)
    dpBg.fillRect(rightX - nodeW, baseY - nodeH, nodeW, nodeH)

    this.dpText = this.add.text(rightX - nodeW / 2, baseY - nodeH / 2, '', {
      fontSize: '13px', color: '#cfd8dc', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5)

    this.dpBarBg = this.add.graphics()
    this.dpBarBg.fillStyle(0x303030, 1)
    this.dpBarBg.fillRect(rightX - nodeW, baseY, nodeW, tagH)
    this.dpBarFill = this.add.graphics()
    this.dpBarFill.fillStyle(0xffffff, 1)
    this.dpBarFill.fillRect(rightX - nodeW, baseY, 0, tagH)
    this.dpBarFill = this.add.graphics()
    this.dpBarFill.fillStyle(0xffffff, 1)

    if (this.levelData) {
      this.add.text(W - 20, 10, this.levelData.name, {
        fontSize: FONT_SIZE.base, color: '#5a6a7a', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(1, 0)
    }
  }

  private buildResultText(): void {
    this.resultText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, '', {
      fontSize: '32px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.resultText.setOrigin(0.5)
    this.resultText.setAlpha(0)
    this.resultText.setDepth(50)
  }

  private selectUnit(squadIndex: number): void {
    const unit = this.unitConfigs[squadIndex]
    if (!unit) return

    if (this.selectedSquadIndex === squadIndex && this.deployState !== 'idle') {
      this.cancelDeployment()
      this.selectedSquadIndex = null
      this.hideInspectPanel()
      this.updateCardVisuals()
      return
    }

    this.selectedSquadIndex = squadIndex
    if (this.inspectingUnit) {
      this.exitDecisionMode()
    }
    this.showCardPanel(unit, squadIndex)
    if (this.battleActive && !this.battleEnded && !this.isPaused) {
      if (this.deployState === 'facing') {
        this.cancelDeployment()
      }
      this.deployState = 'placing'
      this.decisionMode = true
    }
    this.updateCardVisuals()
  }

  private removeUnitSprite(row: number, col: number): void {
    const idx = this.unitSprites.findIndex(s => s.row === row && s.col === col)
    if (idx !== -1) {
      this.unitSprites[idx].destroy()
      this.unitSprites.splice(idx, 1)
    }
  }

  private clearAllUnits(): void {
    this.depSystem.activeUnits.forEach((_, key) => {
      const [r, c] = key.split(',').map(Number)
      this.removeUnitSprite(r, c)
    })
    this.depSystem.activeUnits.clear()
    this.depSystem.redeployTimers.clear()
    this.depSystem.deployCostMultiplier.clear()
    this.deployedIndices.clear()
    this.exitDecisionMode()
    this.selectedSquadIndex = null
    this.flashMessage('All units cleared', 0xd32f2f)
    this.rebuildCardBar()
  }

  private updateHUD(): void {
    const nodeW = 90
    const tagH = 12
    const rightX = this.scale.width - 10
    const baseY = this.scale.height - 140 - 10

    this.dpText.setText(`DP: ${Math.floor(this.depSystem.currentDP)}/${this.depSystem.dpCap}`)

    this.dpBarFill.clear()
    this.dpBarFill.fillStyle(0xffffff, 1)
    this.dpBarFill.fillRect(rightX - nodeW, baseY, nodeW * this.depSystem.getDPProgress(), tagH)
    this.limitText.setText(`Units: ${this.depSystem.activeUnits.size}/${this.depSystem.deploymentLimit}`)
    this.livesText.setText(`Lives: ${this.enemyManager.getLives()}`)
    this.waveText.setText(`Hostiles: ${this.enemyManager.getDealtWith()}/${this.enemyManager.getTotalEnemyCount()}`)
    if (this.battleEnded) {
      this.statusText.setText(this.enemyManager.hasWon() ? 'SYNC COMPLETE // VICTORY' : 'DESYNC // DEFEAT')
    } else if (this.battleActive) {
      this.statusText.setText('[ RUNNING ]')
    } else if (this.autoStart) {
      this.statusText.setText('READY // Deploy units to prepare')
    } else {
      this.statusText.setText('')
    }
  }

  private checkBattleEnd(): void {
    if (this.battleEnded) return

    if (this.enemyManager.getLives() <= 0) {
      this.battleEnded = true
      this.battleActive = false
      this.cameras.main.flash(300, 211, 47, 47)
      this.flashMessage('DESYNCHRONIZATION — All sync lost', 0xd32f2f)
      this.showResult('DESYNC', 0xd32f2f)
      return
    }

    if (this.enemyManager.isAllWavesComplete()) {
      this.battleEnded = true
      this.battleActive = false
      this.cameras.main.flash(300, 0, 200, 83)
      this.flashMessage('MEMORY STREAM COMPLETE — 100% synchronized', 0x00c853)
      this.showResult('SYNC COMPLETE', 0x00c853)
    }
  }

  private showResult(label: string, color: number): void {
    if (!this.fromSquad) {
      const hex = '#' + color.toString(16).padStart(6, '0')
      this.resultText.setText(label)
      this.resultText.setStyle({ color: hex, fontSize: '28px' })
      this.resultText.setAlpha(1)
      this.tweens.add({
        targets: this.resultText,
        alpha: 0.8,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      const restartBtn = makeNodeButton(this, this.scale.width / 2, this.scale.height / 2 + 10, 'Restart Simulation', () => {
        if (this.levelData) this.loadLevel(this.levelData)
      }, { w: 200, h: 36, textSize: FONT_SIZE.sm })
      restartBtn.setDepth(50)

      const editorBtn = makeNodeButton(this, this.scale.width / 2, this.scale.height / 2 + 46, 'Back to Editor', () => {
        this.scene.start(this.fromSquad ? 'SquadScene' : 'EditorScene')
      }, { w: 200, h: 36, textSize: FONT_SIZE.sm })
      editorBtn.setDepth(50)
      return
    }

    const outcome = label.includes('FAIL') || label === 'DESYNC' ? 'defeat' : 'victory'
    const stars = outcome === 'defeat' ? 0 : this.calculateStars()

    if (outcome === 'victory') {
      saveCompletion(this.levelId, stars, this.enemiesDefeated)
    }

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultScene', {
        chapterId: this.chapterId,
        levelId: this.levelId,
        outcome,
        stars,
        livesRemaining: this.enemyManager.getLives(),
        enemiesDefeated: this.enemiesDefeated,
      })
    })
  }

  private positionAlongPath(dist: number, points: { x: number; y: number }[], cumDists: number[]): { x: number; y: number } {
    let segIdx = cumDists.length - 2
    for (let i = 0; i < cumDists.length - 1; i++) {
      if (dist >= cumDists[i] && dist <= cumDists[i + 1]) { segIdx = i; break }
    }
    const segT = (dist - cumDists[segIdx]) / (cumDists[segIdx + 1] - cumDists[segIdx])
    return {
      x: Phaser.Math.Linear(points[segIdx].x, points[segIdx + 1].x, segT),
      y: Phaser.Math.Linear(points[segIdx].y, points[segIdx + 1].y, segT),
    }
  }

  private showWavePreview(route: Route): void {
    this.wavePreviewLine.clear()
    this.wavePreviewLine.setAlpha(1)
    const waypoints = [route.spawn, ...route.waypoints, route.goal]
    const points = waypoints.map(wp => this.grid.tileToPixel(wp.row, wp.col))
    let totalDist = 0
    const cumDists: number[] = [0]
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x
      const dy = points[i + 1].y - points[i].y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      cumDists.push(totalDist)
    }
    if (totalDist === 0) return
    const duration = Math.max(1000, totalDist * 0.8)
    const trailSpacing = 7

    this.wavePreviewTween = this.tweens.addCounter({
      from: 0, to: 1, duration, ease: 'Linear',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0
        const headDist = t * totalDist
        this.wavePreviewLine.clear()
        for (let ti = 0; ti < 14; ti++) {
          const d = Math.max(0, headDist - ti * trailSpacing)
          const pos = this.positionAlongPath(d, points, cumDists)
          const frac = 1 - ti / 14
          const radius = 2 + frac * 3
          const alpha = 0.1 + frac * 0.7
          this.wavePreviewLine.fillStyle(0xffffff, alpha * 0.8)
          this.wavePreviewLine.fillCircle(pos.x, pos.y, radius + 4)
          this.wavePreviewLine.fillStyle(0xffee58, alpha * 0.4)
          this.wavePreviewLine.fillCircle(pos.x, pos.y, radius + 2)
          this.wavePreviewLine.fillStyle(0xffffff, alpha)
          this.wavePreviewLine.fillCircle(pos.x, pos.y, radius)
        }
      },
      onComplete: () => this.clearWavePreview(),
    })
  }

  private clearWavePreview(): void {
    if (this.wavePreviewTween) { this.wavePreviewTween.stop(); this.wavePreviewTween = null }
    this.wavePreviewLine.clear()
    this.wavePreviewLine.setAlpha(0)
  }

  private showEnemyToast(config: EnemyConfig): void {
    if (this.encounteredTypes.has(config.id)) return
    this.encounteredTypes.add(config.id)

    const W = 280
    const pad = 10
    const iconSize = 28

    const bg = this.add.graphics()
    bg.fillStyle(0x1a1a2e, 0.85)
    bg.fillRect(0, 0, W, 72)

    const icon = this.add.graphics()
    icon.fillStyle(config.color, 1)
    icon.fillCircle(pad + iconSize / 2, pad + iconSize / 2 + 2, iconSize / 2)
    icon.fillStyle(0xffffff, 0.3)
    icon.fillCircle(pad + iconSize / 2, pad + iconSize / 2 + 2, iconSize / 4)

    const nameText = this.add.text(pad + iconSize + pad, pad, config.name, {
      fontSize: FONT_SIZE.sm, color: '#ffffff', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })

    const desc = config.description ?? 'No intelligence available.'
    const descText = this.add.text(pad + iconSize + pad, pad + 20, desc, {
      fontSize: FONT_SIZE.xs, color: '#b0b8c4', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', wordWrap: { width: W - pad - iconSize - pad - pad },
    })

    const container = this.add.container(10, 10, [bg, icon, nameText, descText])
    container.setDepth(45)

    this.activeToasts.push(container)
    this.repositionToasts()

    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          container.destroy()
          const idx = this.activeToasts.indexOf(container)
          if (idx !== -1) this.activeToasts.splice(idx, 1)
          this.repositionToasts()
        },
      })
    })
  }

  private repositionToasts(): void {
    for (let i = 0; i < this.activeToasts.length; i++) {
      this.activeToasts[i].setY(10 + i * 78)
    }
  }

  private clearEnemyToasts(): void {
    for (const t of this.activeToasts) t.destroy()
    this.activeToasts = []
    this.encounteredTypes.clear()
  }

  private calculateStars(): number {
    const ratio = this.startingLives > 0 ? this.enemyManager.getLives() / this.startingLives : 0
    if (this.enemyManager.getLives() >= this.startingLives) return 3
    if (ratio >= 0.5) return 2
    return 1
  }

  private showHealNumber(amount: number, target: UnitSprite): void {
    const pos = this.grid.tileToPixel(target.row, target.col)
    const text = this.add.text(pos.x, pos.y - 20, `+${amount}`, {
      fontSize: '15px', color: '#00c853', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    text.setOrigin(0.5)
    text.setDepth(20)
    this.tweens.add({
      targets: text,
      alpha: 0, y: pos.y - 50,
      duration: 800,
      onComplete: () => text.destroy(),
    })
  }

  private showUnitDamageNumber(damage: number, unit: UnitSprite, damageType: string): void {
    const pos = this.grid.tileToPixel(unit.row, unit.col)
    const color = damageType === 'thermal' ? '#9c27b0' : '#d32f2f'
    const label = damageType === 'thermal' ? `~${damage}` : `${damage}`
    const text = this.add.text(pos.x, pos.y - 16, label, {
      fontSize: FONT_SIZE.xs, color, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    text.setOrigin(0.5)
    text.setDepth(20)
    this.tweens.add({
      targets: text,
      alpha: 0, y: pos.y - 46,
      duration: 800,
      onComplete: () => text.destroy(),
    })
  }

  private showDamageNumber(damage: number, enemy: EnemySprite, damageType: string): void {
    const color = damageType === 'thermal' ? '#9c27b0' : '#1a1a2e'
    const label = damageType === 'thermal' ? `~${damage}` : `${damage}`
    const text = this.add.text(enemy.x, enemy.y - 20, label, {
      fontSize: '15px', color, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    text.setOrigin(0.5)
    text.setDepth(20)
    this.tweens.add({
      targets: text,
      alpha: 0, y: enemy.y - 50,
      duration: 800,
      onComplete: () => text.destroy(),
    })
  }

  private flashMessage(msg: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0')
    const text = this.add.text(this.scale.width / 2, this.scale.height - 54, msg, {
      fontSize: FONT_SIZE.sm, color: hex, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    text.setOrigin(0.5)
    this.tweens.add({
      targets: text,
      alpha: 0, y: this.scale.height - 70,
      duration: 1500,
      onComplete: () => text.destroy(),
    })
  }

  private computeGridOffsetX(cols: number): number {
    const gridW = cols * TILE_SIZE
    const availW = this.scale.width
    return Math.floor((availW - gridW) / 2)
  }

  private loadLevel(data: LevelData): void {
    this.unitSprites.forEach(s => s.destroy())
    this.unitSprites = []
    this.enemyManager.cleanup()
    this.clearEnemyToasts()
    this.clearWavePreview()
    this.grid.destroy()
    this.grid = new Grid(this, data.cols, data.rows, this.computeGridOffsetX(data.cols), GRID_OFFSET_Y)
    this.grid.fromLevelData(data)
    this.grid.render()
    this.levelData = data
    this.healingSystem = new HealingSystem(this.grid)
    this.depSystem.reset(data.startingDP, data.dpRegenRate, data.dpCap, data.deploymentLimit)
    this.enemyManager.setWaves(data.waves, data.routes, data.lives)
    this.battleActive = false
    this.battleEnded = false
    this.deployState = 'idle'
    this.pendingTile = null
    this.selectedSquadIndex = null
    this.deployedIndices.clear()
    this.exitDecisionMode()
    this.clearRangePreview()
    this.resultText.setAlpha(0)
    this.cardBarScrollX = 0
    if (this.cardBarContainer) {
      this.cardBarContainer.removeAll(true)
      this.unitCards = []
    }
    this.rebuildCardBar()
    this.updateHUD()
  }

  private showGuide(texts: string[]): void {
    const w = this.scale.width
    const h = this.scale.height

    this.guideActive = true
    this.guideTexts = texts
    this.guidePageIndex = 0

    const overlay = this.add.graphics()
    overlay.setDepth(60)
    overlay.fillStyle(0x000000, 0.6)
    overlay.fillRect(0, 0, w, h)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)

    const pH = 130
    const pY = h - pH

    const panel = this.add.graphics()
    panel.setDepth(61)
    panel.fillStyle(0x0D0D30, 1)
    panel.fillRect(0, pY, w, pH)

    const cx = 34
    const cy = pY + pH / 2
    const isz = 20
    const icon = this.add.graphics()
    icon.setDepth(62)
    icon.fillStyle(0x4fc3f7, 1)
    icon.fillPoints([
      new Phaser.Geom.Point(cx, cy - isz),
      new Phaser.Geom.Point(cx + isz, cy),
      new Phaser.Geom.Point(cx, cy + isz),
      new Phaser.Geom.Point(cx - isz, cy),
    ], true)

    const tx = cx + isz + 18
    const tw = w - tx - 20
    const guideTextObj = this.add.text(tx, pY + 16, texts[0], {
      fontSize: '17px',
      color: '#333333',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      align: 'left',
      wordWrap: { width: tw },
      lineSpacing: 4,
    })
    guideTextObj.setDepth(62)

    const isLastPage = texts.length === 1
    const dismissText = this.add.text(w - 16, pY + pH - 16, isLastPage ? '[ tap to dismiss ]' : '[ tap to continue ]', {
      fontSize: '15px',
      color: '#5a6a7a',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    dismissText.setOrigin(1, 1)
    dismissText.setDepth(62)

    const advance = () => {
      if (this.guidePageIndex < texts.length - 1) {
        this.guidePageIndex++
        guideTextObj.setText(texts[this.guidePageIndex])
        if (this.guidePageIndex === texts.length - 1) {
          dismissText.setText('[ tap to dismiss ]')
        }
      } else {
        overlay.destroy()
        panel.destroy()
        icon.destroy()
        guideTextObj.destroy()
        dismissText.destroy()
        this.guideActive = false
        this.guideTexts = null
        this.guidePageIndex = 0
        if (this.autoStart) {
          this.battleActive = true
          this.time.delayedCall(2000, () => this.enemyManager.startBattle())
          this.flashMessage('MEMORY STREAM READY // Deploy units', 0x00c853)
        }
      }
    }

    overlay.on('pointerdown', advance)
  }

  private drawBgGradient(): void {
    const g = this.add.graphics()
    const { width: w, height: h } = this.scale
    for (let y = 0; y < h; y++) {
      const t = y / h
      const r = Phaser.Math.Interpolation.Linear([0xf4, 0xf0], t)
      const gv = Phaser.Math.Interpolation.Linear([0xf6, 0xf4], t)
      const b = Phaser.Math.Interpolation.Linear([0xf8, 0xf8], t)
      g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b), 1)
      g.fillRect(0, y, w, 1)
    }
    g.setDepth(-100)
  }

  private drawGridOverlay(): void {
    const g = this.add.graphics()
    g.lineStyle(1, 0xf0f0f0, 0.3)
    const { rows, cols, offsetX, offsetY } = this.grid
    for (let c = 0; c <= cols; c++) {
      const x = offsetX + c * TILE_SIZE
      g.moveTo(x, offsetY)
      g.lineTo(x, offsetY + rows * TILE_SIZE)
      g.strokePath()
    }
    for (let r = 0; r <= rows; r++) {
      const y = offsetY + r * TILE_SIZE
      g.moveTo(offsetX, y)
      g.lineTo(offsetX + cols * TILE_SIZE, y)
      g.strokePath()
    }
    g.setDepth(-5)
  }
}
