import Phaser from 'phaser'
import { DeployedUnit, Direction, LevelData, UnitConfig, Position } from '../types/index'
import { positionsInRange, computeFacingTowardGoal } from '../shared/utils/GridMath'
import { Grid } from '../entities/Grid'
import { UnitSprite } from '../entities/Unit'
import { EnemySprite } from '../entities/Enemy'
import { DeploymentSystem } from '../systems/DeploymentSystem'
import { EnemyManager } from '../systems/EnemyManager'
import { CombatSystem } from '../systems/CombatSystem'
import { UNIT_CONFIGS } from '../config/units'
import { importLevelFromFile } from '../editor/LevelSerializer'
import { COLORS } from '../ui/Constants'

export class GameScene extends Phaser.Scene {
  private grid!: Grid
  private depSystem!: DeploymentSystem
  private enemyManager!: EnemyManager
  private combatSystem!: CombatSystem
  private unitSprites: UnitSprite[] = []
  private selectedUnitIndex: number = 0
  private unitButtons: Phaser.GameObjects.Container[] = []
  private dpText!: Phaser.GameObjects.Text
  private limitText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private levelData: LevelData | null = null
  private battleActive: boolean = false
  private battleEnded: boolean = false
  private battleButton!: Phaser.GameObjects.Text
  private resultText!: Phaser.GameObjects.Text
  private hoverIndicator!: Phaser.GameObjects.Graphics

  private deployState: 'idle' | 'placing' | 'facing' = 'idle'
  private pendingTile: Position | null = null
  private pendingFacing: Direction = 'up'
  private statsPanel!: Phaser.GameObjects.Container
  private statsTexts!: Phaser.GameObjects.Text[]
  private rangePreview!: Phaser.GameObjects.Graphics
  private facingArrow!: Phaser.GameObjects.Graphics
  private cancelFacingBtn!: Phaser.GameObjects.Text

  private decisionMode: boolean = false
  private inspectingUnit: DeployedUnit | null = null
  private inspectRetreatBtn!: Phaser.GameObjects.Text
  private inspectCloseBtn!: Phaser.GameObjects.Text

  private unitConfigs: UnitConfig[] = UNIT_CONFIGS
  private fromSquad: boolean = false

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { level?: LevelData; squad?: UnitConfig[] }): void {
    if (data?.level) {
      this.levelData = data.level
    }
    if (data?.squad) {
      this.unitConfigs = data.squad
      this.fromSquad = true
    } else {
      this.unitConfigs = UNIT_CONFIGS
      this.fromSquad = false
    }
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0)
    this.drawBgGradient()
    this.unitSprites = []
    this.unitButtons = []
    this.selectedUnitIndex = 0
    this.battleActive = false
    this.battleEnded = false
    this.deployState = 'idle'
    this.pendingTile = null
    this.pendingFacing = 'up'
    this.decisionMode = false
    this.inspectingUnit = null

    this.grid = new Grid(this, this.levelData?.cols ?? 12, this.levelData?.rows ?? 3)
    if (this.levelData) {
      this.grid.fromLevelData(this.levelData)
    }
    this.grid.render()

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
      onEnemyKilled: () => {},
    })
    if (this.levelData) {
      this.enemyManager.setWaves(this.levelData.waves, this.levelData.routes, this.levelData.lives)
    }

    this.combatSystem = new CombatSystem(this.grid, {
      onEnemyKilled: (enemy: EnemySprite, _killer: UnitSprite | null) => {
        this.depSystem.addDP(enemy.config.dpOnKill)
      },
      onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => {
        this.showDamageNumber(damage, enemy, damageType)
      },
    })

    this.buildStatsPanel()
    this.updateStatsPanel(0)
    this.buildUnitPalette()
    this.buildHUD()
    this.buildBattleButton()

    this.rangePreview = this.add.graphics()
    this.rangePreview.setDepth(8)
    this.rangePreview.setAlpha(0)

    this.facingArrow = this.add.graphics()
    this.facingArrow.setDepth(9)
    this.facingArrow.setAlpha(0)

    this.setupInput()
  }

  private setupInput(): void {
    this.input.mouse?.disableContextMenu()

    this.cancelFacingBtn = this.add.text(10, this.scale.height - 20, 'CANCEL', {
      fontSize: '13px',
      color: COLORS.text.danger,
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
    })
    this.cancelFacingBtn.setDepth(50)
    this.cancelFacingBtn.setAlpha(0)
    this.cancelFacingBtn.setInteractive({ cursor: 'pointer' })
    this.cancelFacingBtn.on('pointerdown', () => this.cancelDeployment())

    this.inspectRetreatBtn = this.add.text(10, 70, '', {
      fontSize: '13px',
      color: COLORS.text.danger,
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
    })
    this.inspectRetreatBtn.setDepth(50)
    this.inspectRetreatBtn.setAlpha(0)
    this.inspectRetreatBtn.setInteractive({ cursor: 'pointer' })
    this.inspectRetreatBtn.on('pointerdown', () => this.retreatInspectedUnit())

    this.inspectCloseBtn = this.add.text(10, 88, '[ CLOSE ]', {
      fontSize: '12px',
      color: COLORS.text.secondary,
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.inspectCloseBtn.setDepth(50)
    this.inspectCloseBtn.setAlpha(0)
    this.inspectCloseBtn.setInteractive({ cursor: 'pointer' })
    this.inspectCloseBtn.on('pointerdown', () => this.exitDecisionMode())

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.deployState === 'facing') {
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
        const config = this.unitConfigs[this.selectedUnitIndex]
        const check = this.depSystem.canDeploy(config, pos.row, pos.col)
        if (check.ok) {
          this.pendingTile = pos
          this.pendingFacing = computeFacingTowardGoal(pos, this.getGoalPositions())
          this.deployState = 'facing'
          this.showRangePreview(config, pos, this.pendingFacing)
          this.showFacingArrow(pos, this.pendingFacing)
          this.hoverIndicator.setAlpha(0)
          this.cancelFacingBtn.setAlpha(1)
          this.flashMessage(`DIRECTION // ${config.name}`, config.color)
        } else {
          this.flashMessage(check.reason ?? 'Cannot deploy', 0xd32f2f)
        }
      }
    })

    this.input.on('pointerup', () => {
      if (this.deployState === 'facing') {
        this.confirmDeployment()
      }
    })

    this.hoverIndicator = this.add.graphics()
    this.hoverIndicator.setDepth(15)
    this.hoverIndicator.setAlpha(0)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.deployState === 'facing') {
        if (!this.pendingTile) return
        const unitConfig = this.unitConfigs[this.selectedUnitIndex]
        const facing = this.computeFacingFromPointer(pointer)
        if (facing !== this.pendingFacing) {
          this.pendingFacing = facing
          this.showRangePreview(unitConfig, this.pendingTile, facing)
          this.showFacingArrow(this.pendingTile, facing)
        }
        return
      }

      if (!this.battleActive || this.battleEnded) {
        this.hoverIndicator.setAlpha(0)
        return
      }
      const pos = this.grid.pixelToTile(pointer.x, pointer.y)
      if (!pos) { this.hoverIndicator.setAlpha(0); return }
      const config = this.unitConfigs[this.selectedUnitIndex]
      const check = this.depSystem.canDeploy(config, pos.row, pos.col)
      const px = this.grid.tileToPixel(pos.row, pos.col)
      this.hoverIndicator.clear()
      this.hoverIndicator.fillStyle(check.ok ? 0x00c853 : 0xd32f2f, 0.25)
      this.hoverIndicator.fillRect(px.x - 32, px.y - 32, 64, 64)
      this.hoverIndicator.lineStyle(2, check.ok ? 0x00c853 : 0xd32f2f, 0.6)
      this.hoverIndicator.strokeRect(px.x - 32, px.y - 32, 64, 64)
      this.hoverIndicator.setAlpha(1)
    })
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
    const half = 32
    for (const t of tiles) {
      const px = this.grid.tileToPixel(t.row, t.col)
      this.rangePreview.fillStyle(0x00a2ff, 0.2)
      this.rangePreview.fillRect(px.x - half, px.y - half, 64, 64)
      this.rangePreview.lineStyle(2, 0x00a2ff, 0.6)
      this.rangePreview.strokeRect(px.x - half, px.y - half, 64, 64)
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
  }

  private confirmDeployment(): void {
    if (!this.pendingTile) return
    const config = this.unitConfigs[this.selectedUnitIndex]
    const deployed = this.depSystem.deployUnit(config, this.pendingTile.row, this.pendingTile.col, this.pendingFacing)
    if (deployed) {
      const sprite = new UnitSprite(this, this.grid, config, this.pendingTile.row, this.pendingTile.col, config.hp, this.pendingFacing)
      this.unitSprites.push(sprite)
      this.flashMessage(`DEPLOY // ${config.name}  -${config.dpCost} DP`, config.color)
    }
    this.clearRangePreview()
    this.cancelFacingBtn.setAlpha(0)
    this.pendingTile = null
    this.deployState = 'placing'
    this.exitDecisionMode()
  }

  private cancelDeployment(): void {
    this.clearRangePreview()
    this.cancelFacingBtn.setAlpha(0)
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
    this.updateStatsPanel(unit.config, unit)
    const refund = Math.floor(unit.config.dpCost / 2)
    this.inspectRetreatBtn.setText(`RETREAT  [+${refund} DP]`)
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
    this.updateStatsPanel(this.selectedUnitIndex)
  }

  private retreatInspectedUnit(): void {
    if (!this.inspectingUnit) return
    const { row, col, config } = this.inspectingUnit
    const refund = this.depSystem.retreatUnit(row, col)
    if (refund > 0) {
      this.removeUnitSprite(row, col)
      this.flashMessage(`RETREAT // ${config.name}  +${refund} DP`, 0x00c853)
    }
    this.exitDecisionMode()
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000

    if (this.battleActive && !this.battleEnded) {
      const speed = this.decisionMode ? 0.5 : 1
      this.depSystem.update(dt * speed)
      this.enemyManager.update(dt * speed)
      this.combatSystem.update(delta * speed, this.unitSprites, this.enemyManager.getEnemies())
      this.checkBattleEnd()
    }

    this.updateHUD()
  }

  private buildStatsPanel(): void {
    const px = 10
    const py = 10
    const texts: Phaser.GameObjects.Text[] = []
    const lines = ['', '', '']
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(px + 6, py + 4 + i * 16, lines[i], {
        fontSize: '12px',
        color: COLORS.text.secondary,
        fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      texts.push(t)
    }
    this.statsTexts = texts
    this.statsPanel = this.add.container(0, 0, texts)
  }

  private updateStatsPanel(indexOrConfig: number | UnitConfig, deployed?: DeployedUnit): void {
    const unit = typeof indexOrConfig === 'number' ? this.unitConfigs[indexOrConfig] : indexOrConfig
    if (!unit) {
      this.statsTexts.forEach(t => t.setText(''))
      return
    }
    const dmIcon = unit.damageType === 'thermal' ? '~' : '>'
    const typeLabel = unit.type === 'ground' ? 'GND' : 'RNG'
    this.statsTexts[0].setText(`${unit.name} (${typeLabel})`)
    if (deployed) {
      const dirArrow: Record<string, string> = { up: '\u2191', down: '\u2193', left: '\u2190', right: '\u2192' }
      this.statsTexts[1].setText(`HP: ${deployed.currentHp}/${unit.hp}  ${dirArrow[deployed.facing] ?? ''}`)
      this.statsTexts[2].setText(`ATK:${dmIcon}${unit.atk}  DEF:${unit.def}  BLK:${unit.blockCount}`)
    } else {
      this.statsTexts[1].setText(`HP:${unit.hp} ATK:${dmIcon}${unit.atk} DEF:${unit.def}`)
      this.statsTexts[2].setText(`BLK:${unit.blockCount}  DP:${unit.dpCost}`)
    }
  }

  private buildUnitPalette(): void {
    const px = 10
    let startY = 70
    const btnW = 140
    const btnH = 48

    this.add.text(px, startY - 16, 'UNIT SELECT', {
      fontSize: '12px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })

    this.unitConfigs.forEach((unit, i) => {
      const y = startY + i * (btnH + 2)
      this.unitButtons.push(this.makeUnitButton(px, y, btnW, btnH, unit, i))
      startY = y
    })

    const actionY = startY + btnH + 10
    this.add.text(px, actionY - 12, 'ACTIONS', {
      fontSize: '12px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })

    const actionBtn = (tx: number, text: string, color: string, cb: () => void) => {
      const t = this.add.text(tx, 0, text, {
        fontSize: '12px', color, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
      t.setInteractive({ cursor: 'pointer' })
      t.on('pointerdown', cb)
      return t
    }

    actionBtn(px, '[Clear All]', COLORS.text.danger, () => this.clearAllUnits()).setY(actionY)
    actionBtn(px, '[Restart]', COLORS.text.warning, () => {
      if (this.levelData) this.loadLevel(this.levelData)
    }).setY(actionY + 20)
    actionBtn(px, '[Load Level]', COLORS.text.accent, async () => {
      const data = await importLevelFromFile()
      if (data) this.loadLevel(data)
    }).setY(actionY + 40)

    const backLabel = this.fromSquad ? '< Back to Squad Selection' : '< Back to Editor'
    const editorBtn = this.add.text(px, actionY + 60, backLabel, {
      fontSize: '11px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    editorBtn.setInteractive({ cursor: 'pointer' })
    editorBtn.on('pointerover', () => editorBtn.setColor(COLORS.text.primary))
    editorBtn.on('pointerout', () => editorBtn.setColor(COLORS.text.accent))
    editorBtn.on('pointerdown', () => this.scene.start(this.fromSquad ? 'SquadScene' : 'EditorScene'))
  }

  private makeUnitButton(px: number, y: number, btnW: number, btnH: number, unit: UnitConfig, index: number): Phaser.GameObjects.Container {
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 1)
    bg.fillRoundedRect(0, 0, btnW, btnH, 4)
    bg.lineStyle(index === this.selectedUnitIndex ? 2 : 1, index === this.selectedUnitIndex ? 0x00a2ff : 0xcfd8dc, 1)

    const icon = this.add.graphics()
    if (unit.type === 'ground') {
      icon.fillStyle(unit.color, 1)
      icon.fillRoundedRect(6, 8, 16, 16, 3)
    } else {
      icon.fillStyle(unit.color, 1)
      icon.fillTriangle(14, 8, 4, 28, 24, 28)
    }

    const nameLabel = this.add.text(28, 8, unit.name, {
      fontSize: '13px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    const dmIcon = unit.damageType === 'thermal' ? '~' : '>'
    const infoLabel = this.add.text(28, 26, `DP ${unit.dpCost} | ${dmIcon}${unit.atk}`, {
      fontSize: '10px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })

    const container = this.add.container(px, y, [bg, icon, nameLabel, infoLabel])
    container.setSize(btnW, btnH)
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnW, btnH), Phaser.Geom.Rectangle.Contains); if (container.input) container.input.cursor = 'pointer'
    container.on('pointerdown', () => this.selectUnit(index))
    return container
  }

  private buildHUD(): void {
    this.dpText = this.add.text(200, 10, '', {
      fontSize: '15px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.limitText = this.add.text(200, 30, '', {
      fontSize: '12px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.livesText = this.add.text(400, 10, '', {
      fontSize: '15px', color: COLORS.text.danger, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.waveText = this.add.text(400, 30, '', {
      fontSize: '12px', color: COLORS.text.secondary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    this.statusText = this.add.text(200, 50, '', {
      fontSize: '12px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })

    if (this.levelData) {
      this.add.text(580, 10, this.levelData.name, {
        fontSize: '14px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      })
    }
  }

  private buildBattleButton(): void {
    this.battleButton = this.add.text(512, this.scale.height - 24, '[ START SIMULATION ]', {
      fontSize: '15px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.battleButton.setOrigin(0.5)
    this.battleButton.setInteractive({ cursor: 'pointer' })
    this.battleButton.on('pointerdown', () => {
      if (!this.battleActive && !this.battleEnded) {
        if (this.deployState === 'facing') {
          this.cancelDeployment()
        }
        this.deployState = 'placing'
        this.battleActive = true
        this.enemyManager.startBattle()
        this.battleButton.setText('[ SIMULATION ACTIVE ]')
        this.battleButton.setStyle({ color: COLORS.text.danger })
        this.flashMessage('SIMULATION INITIALIZED // Deploy units', 0x00c853)
      }
    })

    this.resultText = this.add.text(512, this.scale.height / 2 - 40, '', {
      fontSize: '32px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.resultText.setOrigin(0.5)
    this.resultText.setAlpha(0)
    this.resultText.setDepth(50)
  }

  private selectUnit(index: number): void {
    this.selectedUnitIndex = index
    this.updateStatsPanel(index)
    if (this.battleActive && !this.battleEnded) {
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
    this.unitButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics
      bg.clear()
      const unit = this.unitConfigs[i]
      bg.fillStyle(0xffffff, 1)
      bg.fillRoundedRect(0, 0, 140, 48, 4)
      bg.lineStyle(i === index ? 2 : 1, i === index ? 0x00a2ff : 0xcfd8dc, 1)
    })
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
    this.exitDecisionMode()
    this.flashMessage('All units cleared', 0xd32f2f)
  }

  private updateHUD(): void {
    this.dpText.setText(`DP: ${Math.floor(this.depSystem.currentDP)}/${this.depSystem.dpCap}`)
    this.limitText.setText(`Units: ${this.depSystem.activeUnits.size}/${this.depSystem.deploymentLimit}`)
    this.livesText.setText(`Lives: ${this.enemyManager.getLives()}`)
    this.waveText.setText(`Hostiles: ${this.enemyManager.getEnemies().length}`)
    if (this.battleEnded) {
      this.statusText.setText(this.enemyManager.hasWon() ? 'SYNC COMPLETE // VICTORY' : 'DESYNC // DEFEAT')
    } else if (this.battleActive) {
      this.statusText.setText('Simulation active')
    } else {
      this.statusText.setText('Press START SIMULATION to begin')
    }
  }

  private checkBattleEnd(): void {
    if (this.battleEnded) return

    if (this.enemyManager.getLives() <= 0) {
      this.battleEnded = true
      this.battleActive = false
      this.battleButton.setText('[ DESYNC ]')
      this.battleButton.setStyle({ color: COLORS.text.danger })
      this.cameras.main.flash(300, 211, 47, 47)
      this.flashMessage('DESYNCHRONIZATION — All sync lost', 0xd32f2f)
      this.showResult('DESYNC', 0xd32f2f)
      return
    }

    if (this.enemyManager.isAllWavesComplete()) {
      this.battleEnded = true
      this.battleActive = false
      this.battleButton.setText('[ SYNC COMPLETE ]')
      this.battleButton.setStyle({ color: COLORS.text.success })
      this.cameras.main.flash(300, 0, 200, 83)
      this.flashMessage('MEMORY STREAM COMPLETE — 100% synchronized', 0x00c853)
      this.showResult('SYNC COMPLETE', 0x00c853)
    }
  }

  private showResult(label: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0')
    this.resultText.setText(label)
    this.resultText.setStyle({ color: hex, fontSize: '26px' })
    this.resultText.setAlpha(1)
    this.tweens.add({
      targets: this.resultText,
      alpha: 0.8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const restartBtn = this.add.text(512, this.scale.height / 2 + 10, '[ Restart Simulation ]', {
      fontSize: '14px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    restartBtn.setOrigin(0.5)
    restartBtn.setDepth(50)
    restartBtn.setInteractive({ cursor: 'pointer' })
    restartBtn.on('pointerdown', () => {
      if (this.levelData) this.loadLevel(this.levelData)
    })

    const editorBtn = this.add.text(512, this.scale.height / 2 + 36, '[ Back to Editor ]', {
      fontSize: '14px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    editorBtn.setOrigin(0.5)
    editorBtn.setDepth(50)
    editorBtn.setInteractive({ cursor: 'pointer' })
    editorBtn.on('pointerdown', () => this.scene.start(this.fromSquad ? 'SquadScene' : 'EditorScene'))
  }

  private showDamageNumber(damage: number, enemy: EnemySprite, damageType: string): void {
    const color = damageType === 'thermal' ? '#9c27b0' : '#1a1a2e'
    const label = damageType === 'thermal' ? `~${damage}` : `${damage}`
    const text = this.add.text(enemy.x, enemy.y - 20, label, {
      fontSize: '13px', color, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
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
    const text = this.add.text(512, this.scale.height - 50, msg, {
      fontSize: '14px', color: hex, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    text.setOrigin(0.5)
    this.tweens.add({
      targets: text,
      alpha: 0, y: this.scale.height - 70,
      duration: 1500,
      onComplete: () => text.destroy(),
    })
  }

  private loadLevel(data: LevelData): void {
    this.unitSprites.forEach(s => s.destroy())
    this.unitSprites = []
    this.enemyManager.cleanup()
    this.grid.destroy()
    this.grid = new Grid(this, data.cols, data.rows)
    this.grid.fromLevelData(data)
    this.grid.render()
    this.levelData = data
    this.depSystem.reset(data.startingDP, data.dpRegenRate, data.dpCap, data.deploymentLimit)
    this.enemyManager.setWaves(data.waves, data.routes, data.lives)
    this.battleActive = false
    this.battleEnded = false
    this.deployState = 'idle'
    this.pendingTile = null
    this.exitDecisionMode()
    this.inspectRetreatBtn.setAlpha(0)
    this.inspectCloseBtn.setAlpha(0)
    this.clearRangePreview()
    this.resultText.setAlpha(0)
    this.battleButton.setText('[ START SIMULATION ]')
    this.battleButton.setStyle({ color: COLORS.text.accent })
    this.updateStatsPanel(this.selectedUnitIndex)
    this.updateHUD()
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
}
