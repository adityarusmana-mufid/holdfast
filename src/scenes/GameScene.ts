import Phaser from 'phaser'
import { DeployedUnit, Direction, LevelData, UnitConfig, Position, UnitTrait, EnemyConfig, Route } from '../types/index'
import { positionsInRange, computeFacingTowardGoal } from '../shared/utils/GridMath'
import { Grid, TILE_SIZE, GRID_OFFSET_Y } from '../entities/Grid'
import { UnitSprite } from '../entities/Unit'
import { EnemySprite } from '../entities/Enemy'
import { DeploymentSystem } from '../systems/DeploymentSystem'
import { EnemyManager } from '../systems/EnemyManager'
import { CombatSystem } from '../systems/CombatSystem'
import { HealingSystem } from '../systems/HealingSystem'
import { UNIT_CONFIGS } from '../config/units'
import { COLORS, FONT_SIZE } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'
import { spawnProjectile, playSwing, showWindUp, flashDamage } from '../effects/CombatEffects'
import { saveCompletion } from '../shared/SaveData'

export class GameScene extends Phaser.Scene {
  private grid!: Grid
  private depSystem!: DeploymentSystem
  private enemyManager!: EnemyManager
  private combatSystem!: CombatSystem
  private healingSystem!: HealingSystem
  private unitSprites: UnitSprite[] = []
  private cardBarScrollX: number = 0
  private cardBarContainer!: Phaser.GameObjects.Container
  private selectedSquadIndex: number | null = null
  private deployedIndices: Set<number> = new Set()
  private unitCards: { container: Phaser.GameObjects.Container; squadIndex: number }[] = []
  private dpText!: Phaser.GameObjects.Text
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

  private deployState: 'idle' | 'placing' | 'facing' = 'idle'
  private pendingTile: Position | null = null
  private pendingFacing: Direction = 'up'
  private statsPanel!: Phaser.GameObjects.Container
  private statsTexts!: Phaser.GameObjects.Text[]
  private rangePreview!: Phaser.GameObjects.Graphics
  private facingArrow!: Phaser.GameObjects.Graphics
  private cancelDeployIndicator!: Phaser.GameObjects.Graphics

  private decisionMode: boolean = false
  private inspectingUnit: DeployedUnit | null = null
  private inspectRetreatBtn!: Phaser.GameObjects.Container
  private inspectCloseBtn!: Phaser.GameObjects.Container
  private facingCancelBtn!: Phaser.GameObjects.Container

  private unitConfigs: UnitConfig[] = UNIT_CONFIGS
  private fromSquad: boolean = false
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
  private selectionDiamond!: Phaser.GameObjects.Graphics
  private unitPreview!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { level?: LevelData; squad?: UnitConfig[]; chapterId?: string; levelId?: string; autoStart?: boolean }): void {
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
      onEnemySpawned: (config) => this.showEnemyToast(config),
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
        const speed = this.effectiveSpeed
        const tile = target.getCurrentTile()
        if (!tile) return
        const dist = Math.abs(unit.row - tile.row) + Math.abs(unit.col - tile.col)
        if (dist > 1) {
          const from = this.grid.tileToPixel(unit.row, unit.col)
          const dur = Math.min(0.4, Math.max(0.15, dist * 0.08)) / speed
          spawnProjectile(this, from.x, from.y, target, damageType, dur)
        } else {
          const tPos = this.grid.tileToPixel(tile.row, tile.col)
          playSwing(this, unit.container, tPos.x, tPos.y, speed)
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
    })

    this.healingSystem = new HealingSystem(this.grid)

    this.buildStatsPanel()
    this.updateStatsPanel(null)
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
    this.speedButton = makeNodeButton(this, this.scale.width - 128, 4, 'x1', () => this.toggleSpeed(), {
      w: 56, h: 36, textSize: '13px',
    })

    this.pauseButton = makeNodeButton(this, this.scale.width - 64, 4, '[ II ]', () => {
      if (!this.battleActive || this.battleEnded) return
      this.togglePause()
    }, {
      w: 56, h: 36, textSize: '13px',
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
        const btn = makeNodeButton(this, cx, this.scale.height / 2 + yOff, label, () => { this.togglePause(); cb() }, {
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

    this.inspectRetreatBtn = makeNodeButton(this, 10, this.scale.height - 168, '', () => this.retreatInspectedUnit(), {
      w: 220, h: 28, textSize: '13px', role: 'danger',
    })
    this.inspectRetreatBtn.setDepth(50)
    this.inspectRetreatBtn.setAlpha(0)

    this.inspectCloseBtn = makeNodeButton(this, 10, this.scale.height - 138, '[ CLOSE ]', () => this.exitDecisionMode(), {
      w: 100, h: 28, textSize: FONT_SIZE.xs,
    })
    this.inspectCloseBtn.setDepth(50)
    this.inspectCloseBtn.setAlpha(0)

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
    const tiles = positionsInRange(pos, config.rangePattern, this.grid.rows, this.grid.cols, facing)
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
      this.unitPreview.fillRoundedRect(center.x - half, center.y - half, size, size, 4)
    } else {
      this.unitPreview.fillTriangle(center.x, center.y - half, center.x - half, center.y + half, center.x + half, center.y + half)
    }

    const halfSmall = size / 4
    this.unitPreview.fillStyle(0xffffff, 0.15)
    if (config.type === 'ground') {
      this.unitPreview.fillRoundedRect(center.x - halfSmall, center.y - halfSmall, halfSmall * 2, halfSmall * 2, 2)
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
      const sprite = new UnitSprite(this, this.grid, selected, this.pendingTile.row, this.pendingTile.col, selected.hp, this.pendingFacing)
      sprite.container.setScale(0.3)
      this.tweens.add({ targets: sprite.container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' })
      this.unitSprites.push(sprite)
      this.deployedIndices.add(this.selectedSquadIndex)
      const cost = this.depSystem.getCurrentCost(this.selectedSquadIndex, selected)
      this.flashMessage(`DEPLOY // ${selected.name}  -${cost} DP`, selected.color)
      this.selectedSquadIndex = null
      this.rebuildCardBar()
    }
    this.clearRangePreview()
    this.cancelDeployIndicator.setAlpha(0)
    this.facingCancelBtn.setAlpha(0)
    this.pendingTile = null
    this.deployState = 'placing'
    this.exitDecisionMode()
  }

  private cancelDeployment(): void {
    this.clearRangePreview()
    this.cancelDeployIndicator.setAlpha(0)
    this.facingCancelBtn.setAlpha(0)
    this.pendingTile = null
    this.deployState = 'placing'
    this.exitDecisionMode()
    this.flashMessage('DEPLOYMENT CANCELLED', 0xff9100)
  }

  private enterInspectMode(pos: Position): void {
    const unit = this.depSystem.getUnitAt(pos.row, pos.col)
    if (!unit) return
    this.inspectRetreatBtn.setAlpha(0)
    this.inspectCloseBtn.setAlpha(0)
    this.inspectingUnit = unit
    this.decisionMode = true
    this.showSelectionDiamond(unit.row, unit.col, 0x555555)
    this.updateStatsPanel(unit.config, unit)
    const isFullRefund = unit.config.traits?.some(t => t.traitId === UnitTrait.FullRefundRetreat)
    const refund = isFullRefund ? unit.dpCostPaid : Math.floor(unit.dpCostPaid / 2)
    ;(this.inspectRetreatBtn.getAt(2) as Phaser.GameObjects.Text).setText(`RETREAT  [+${refund} DP]`)
    this.inspectRetreatBtn.setAlpha(1)
    this.inspectCloseBtn.setAlpha(1)
    this.flashMessage(`INSPECT // ${unit.config.name}`, 0x00a2ff)
  }

  private exitDecisionMode(): void {
    if (this.inspectingUnit) {
      this.inspectRetreatBtn.setAlpha(0)
      this.inspectCloseBtn.setAlpha(0)
      this.inspectingUnit = null
    }
    this.decisionMode = false
    this.hideSelectionDiamond()
    this.updateStatsPanel(this.getSelectedUnit())
  }

  private retreatInspectedUnit(): void {
    if (!this.inspectingUnit) return
    const { row, col, config, instanceId } = this.inspectingUnit
    const refund = this.depSystem.retreatUnit(row, col)
    if (refund > 0) {
      this.removeUnitSprite(row, col)
      this.deployedIndices.delete(instanceId)
      this.flashMessage(`RETREAT // ${config.name}  +${refund} DP`, 0x00c853)
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
      this.combatSystem.update(delta * speed, this.unitSprites, this.enemyManager.getEnemies())
      this.healingSystem.update(delta * speed, this.unitSprites, (target, amount, source) => {
        this.showHealNumber(amount, target)
      })
      this.checkBattleEnd()
    }

    if (this.inspectingUnit) {
      this.updateStatsPanel(this.inspectingUnit.config, this.inspectingUnit)
    }

    this.updateHUD()
    this.updateCardVisuals()
  }

  private buildStatsPanel(): void {
    const py = this.scale.height - 155
    const texts: Phaser.GameObjects.Text[] = []
    const lines = ['', '', '']
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(16, py + i * 20, lines[i], {
        fontSize: FONT_SIZE.xs,
        color: COLORS.text.secondary,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      texts.push(t)
    }
    this.statsTexts = texts
    this.statsPanel = this.add.container(0, 0, texts)
  }

  private updateStatsPanel(unit: UnitConfig | null, deployed?: DeployedUnit): void {
    if (!unit) { this.statsTexts.forEach(t => t.setText('')); return }
    const dmIcon = unit.damageType === 'thermal' ? '~' : unit.damageType === 'true' ? '!!' : '>'
    const typeLabel = unit.type === 'ground' ? 'GND' : 'RNG'
    const resLabel = unit.res > 0 ? `RES:${unit.res}%` : ''
    this.statsTexts[0].setText(`${unit.subtypeLabel} (${typeLabel})`)
    if (deployed) {
      const dirArrow: Record<string, string> = { up: '\u2191', down: '\u2193', left: '\u2190', right: '\u2192' }
      this.statsTexts[1].setText(`HP: ${deployed.currentHp}/${unit.hp}  ${dirArrow[deployed.facing] ?? ''}`)
      this.statsTexts[2].setText(`ATK:${dmIcon}${unit.atk}  DEF:${unit.def}  ${resLabel}  BLK:${unit.blockCount}`)
    } else {
      this.statsTexts[1].setText(`HP:${unit.hp} ATK:${dmIcon}${unit.atk} DEF:${unit.def} ${resLabel}`)
      this.statsTexts[2].setText(`BLK:${unit.blockCount}  DP:${unit.dpCost}`)
    }
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
    bg.fillStyle(0xffffff, 1)
    bg.fillRoundedRect(0, 0, cardW, cardH, 6)
    bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x00a2ff : 0xcfd8dc, 1)
    bg.setAlpha(!canAfford && !onCooldown ? 0.45 : 1)

    const iconX = cardW / 2
    const iconY = 44
    const iconSize = 48
    const icon = this.add.graphics()
    if (unit.type === 'ground') {
      icon.fillStyle(unit.color, 1)
      icon.fillRoundedRect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize, 6)
      icon.fillStyle(0xffffff, 0.2)
      icon.fillRoundedRect(iconX - iconSize / 4, iconY - iconSize / 4, iconSize / 2, iconSize / 2, 3)
    } else {
      icon.fillStyle(unit.color, 1)
      icon.fillTriangle(iconX, iconY - iconSize / 2, iconX - iconSize / 2, iconY + iconSize / 2, iconX + iconSize / 2, iconY + iconSize / 2)
      icon.fillStyle(0xffffff, 0.2)
      icon.fillTriangle(iconX, iconY - iconSize / 4, iconX - iconSize / 4, iconY + iconSize / 4, iconX + iconSize / 4, iconY + iconSize / 4)
    }

    const nameLabel = this.add.text(cardW / 2, 75, unit.subtypeLabel, {
      fontSize: '15px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    nameLabel.setOrigin(0.5, 0)

    const dpLabel = this.add.text(cardW / 2, 96, `DP ${cost}`, {
      fontSize: FONT_SIZE.xs, color: onCooldown ? COLORS.text.danger : COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    dpLabel.setOrigin(0.5, 0)

    const children: Phaser.GameObjects.GameObject[] = [bg, icon, nameLabel, dpLabel]

    if (onCooldown) {
      const overlay = this.add.graphics()
      overlay.fillStyle(0xd32f2f, 0.12)
      overlay.fillRoundedRect(0, 0, cardW, cardH, 6)
      const remaining = Math.max(0, this.depSystem.getCooldownRemaining(squadIndex))
      const cdText = this.add.text(cardW / 2, cardH / 2 - 4, `${remaining.toFixed(1)}s`, {
        fontSize: '15px', color: '#d32f2f', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
      })
      cdText.setOrigin(0.5)
      children.push(overlay, cdText)
    }

    const container = this.add.container(cx, cy, children)
    container.setSize(cardW, cardH)
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, cardW, cardH), Phaser.Geom.Rectangle.Contains)
    if (container.input) container.input.cursor = 'pointer'
    container.on('pointerdown', () => this.selectUnit(squadIndex))
    return { container, squadIndex }
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
      bg.fillStyle(isSelected ? 0xe3f2fd : 0xffffff, 1)
      bg.fillRoundedRect(0, 0, 96, 128, 6)
      bg.lineStyle(isSelected ? 3 : 1, isSelected ? 0x00a2ff : 0xcfd8dc, 1)
      bg.setAlpha(!canAfford && !onCooldown ? 0.45 : 1)

      const dpLabel = container.getAt(3) as Phaser.GameObjects.Text
      dpLabel.setText(`DP ${cost}`)
      dpLabel.setColor(onCooldown ? COLORS.text.danger : COLORS.text.accent)

      if (onCooldown) {
        if (container.length >= 6) {
          const cdText = container.getAt(5) as Phaser.GameObjects.Text
          const remaining = Math.max(0, this.depSystem.getCooldownRemaining(squadIndex))
          cdText.setText(`${remaining.toFixed(1)}s`)
          cdText.setAlpha(1)
        }
      } else {
        for (let i = 4; i < container.length; i++) {
          const obj = container.getAt(i) as Phaser.GameObjects.Graphics | Phaser.GameObjects.Text
          obj.setAlpha(0)
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

    this.dpText = this.add.text(W - 10, this.scale.height - 140 - 26, '', {
      fontSize: FONT_SIZE.lg, color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    }).setOrigin(1, 0)

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
      this.updateStatsPanel(null)
      this.updateCardVisuals()
      return
    }

    this.selectedSquadIndex = squadIndex
    this.updateStatsPanel(unit)
    if (this.battleActive && !this.battleEnded && !this.isPaused) {
      if (this.deployState === 'facing') {
        this.cancelDeployment()
      }
      if (this.inspectingUnit) {
        this.inspectRetreatBtn.setAlpha(0)
        this.inspectCloseBtn.setAlpha(0)
        this.inspectingUnit = null
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
    this.dpText.setText(`DP: ${Math.floor(this.depSystem.currentDP)}/${this.depSystem.dpCap}`)
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
        squad: this.unitConfigs,
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
    bg.fillRoundedRect(0, 0, W, 72, 6)

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
    this.inspectRetreatBtn.setAlpha(0)
    this.inspectCloseBtn.setAlpha(0)
    this.clearRangePreview()
    this.resultText.setAlpha(0)
    this.cardBarScrollX = 0
    if (this.cardBarContainer) {
      this.cardBarContainer.removeAll(true)
      this.unitCards = []
    }
    this.rebuildCardBar()
    this.updateStatsPanel(null)
    this.updateHUD()
  }

  private showGuide(text: string): void {
    const w = this.scale.width
    const h = this.scale.height

    this.guideActive = true

    const overlay = this.add.graphics()
    overlay.setDepth(60)
    overlay.fillStyle(0x000000, 0.6)
    overlay.fillRect(0, 0, w, h)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)

    const pH = 130
    const pY = h - pH

    const panel = this.add.graphics()
    panel.setDepth(61)
    panel.fillStyle(0xffffff, 1)
    panel.fillRoundedRect(0, pY, w, pH, { tl: 14, tr: 14, bl: 0, br: 0 })

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
    const guideTextObj = this.add.text(tx, pY + 16, text, {
      fontSize: '17px',
      color: '#333333',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      align: 'left',
      wordWrap: { width: tw },
      lineSpacing: 4,
    })
    guideTextObj.setDepth(62)

    const dismissText = this.add.text(w - 16, pY + pH - 16, '[ tap to continue ]', {
      fontSize: '15px',
      color: '#5a6a7a',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    dismissText.setOrigin(1, 1)
    dismissText.setDepth(62)

    const dismiss = () => {
      overlay.destroy()
      panel.destroy()
      icon.destroy()
      guideTextObj.destroy()
      dismissText.destroy()
      this.guideActive = false
      if (this.autoStart) {
        this.battleActive = true
        this.time.delayedCall(2000, () => this.enemyManager.startBattle())
        this.flashMessage('MEMORY STREAM READY // Deploy units', 0x00c853)
      }
    }

    overlay.on('pointerdown', dismiss)
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
