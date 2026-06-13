import Phaser from 'phaser'
import { LevelData, UnitConfig } from '../types/index'
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
  private selectedIndicator!: Phaser.GameObjects.Graphics
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

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { level?: LevelData }): void {
    if (data?.level) {
      this.levelData = data.level
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

    const waypoints = this.levelData?.waypoints ?? []
    this.enemyManager = new EnemyManager(this, this.grid, this.depSystem, waypoints, {
      onEnemyReachedObjective: (_config) => {
        this.flashMessage(`DESYNC — Enemy reached objective`, 0xd32f2f)
        this.checkBattleEnd()
      },
      onEnemyKilled: () => {},
    })
    if (this.levelData) {
      this.enemyManager.setWaves(this.levelData.waves, this.levelData.lives)
    }

    this.combatSystem = new CombatSystem(this.grid, {
      onEnemyKilled: (enemy: EnemySprite) => {
        this.depSystem.addDP(enemy.config.dpOnKill)
        this.flashMessage(`SYNC +${enemy.config.dpOnKill} // ${enemy.config.name} PURGED`, 0x00c853)
      },
      onDamageDealt: (damage: number, enemy: EnemySprite, damageType: string) => {
        this.showDamageNumber(damage, enemy, damageType)
      },
    })

    this.buildUnitPalette()
    this.buildHUD()
    this.buildSelectedIndicator()
    this.buildBattleButton()

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const pos = this.grid.pixelToTile(pointer.x, pointer.y)
      if (!pos) return

      if (pointer.rightButtonDown()) {
        const refund = this.depSystem.retreatUnit(pos.row, pos.col)
        if (refund > 0) {
          this.removeUnitSprite(pos.row, pos.col)
          this.flashMessage(`RETREAT // +${refund} DP`, 0x00c853)
        }
        return
      }

      if (this.battleEnded) {
        this.flashMessage('SIMULATION TERMINATED', 0xff9100)
        return
      }

      if (!this.battleActive) {
        this.flashMessage('INITIALIZE SIMULATION FIRST', 0xff9100)
        return
      }

      const config = UNIT_CONFIGS[this.selectedUnitIndex]
      const deployed = this.depSystem.deployUnit(config, pos.row, pos.col)
      if (deployed) {
        const sprite = new UnitSprite(this, this.grid, config, pos.row, pos.col, config.hp)
        this.unitSprites.push(sprite)
        this.flashMessage(`DEPLOY // ${config.name}  -${config.dpCost} DP`, config.color)
      }
    })

    this.hoverIndicator = this.add.graphics()
    this.hoverIndicator.setDepth(15)
    this.hoverIndicator.setAlpha(0)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.battleActive || this.battleEnded) {
        this.hoverIndicator.setAlpha(0)
        return
      }
      const pos = this.grid.pixelToTile(pointer.x, pointer.y)
      if (!pos) { this.hoverIndicator.setAlpha(0); return }
      const config = UNIT_CONFIGS[this.selectedUnitIndex]
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

  update(_time: number, delta: number): void {
    const dt = delta / 1000

    if (this.battleActive && !this.battleEnded) {
      this.depSystem.update(dt)
      this.enemyManager.update(dt)
      this.combatSystem.update(delta, this.unitSprites, this.enemyManager.getEnemies())
      this.checkBattleEnd()
    }

    this.updateHUD()
  }

  private buildUnitPalette(): void {
    const px = 10
    let startY = 50
    const btnW = 140
    const btnH = 48

    this.add.text(px, startY - 16, 'UNIT SELECT', {
      fontSize: '12px', color: COLORS.text.dim, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })

    UNIT_CONFIGS.forEach((unit, i) => {
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
    actionBtn(px, '[Load Level]', COLORS.text.accent, async () => {
      const data = await importLevelFromFile()
      if (data) this.loadLevel(data)
    }).setY(actionY + 20)

    const editorBtn = this.add.text(px, actionY + 40, '< Back to Editor', {
      fontSize: '11px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
    })
    editorBtn.setInteractive({ cursor: 'pointer' })
    editorBtn.on('pointerover', () => editorBtn.setColor(COLORS.text.primary))
    editorBtn.on('pointerout', () => editorBtn.setColor(COLORS.text.accent))
    editorBtn.on('pointerdown', () => this.scene.start('EditorScene'))
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

  private buildSelectedIndicator(): void {
    this.selectedIndicator = this.add.graphics()
    this.selectedIndicator.setDepth(5)
  }

  private buildBattleButton(): void {
    this.battleButton = this.add.text(512, this.scale.height - 24, '[ START SIMULATION ]', {
      fontSize: '15px', color: COLORS.text.accent, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
    })
    this.battleButton.setOrigin(0.5)
    this.battleButton.setInteractive({ cursor: 'pointer' })
    this.battleButton.on('pointerdown', () => {
      if (!this.battleActive && !this.battleEnded) {
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
    this.unitButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics
      bg.clear()
      const unit = UNIT_CONFIGS[i]
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
    editorBtn.on('pointerdown', () => this.scene.start('EditorScene'))
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
    this.enemyManager.setWaves(data.waves, data.lives)
    this.battleActive = false
    this.battleEnded = false
    this.resultText.setAlpha(0)
    this.battleButton.setText('[ START SIMULATION ]')
    this.battleButton.setStyle({ color: COLORS.text.accent })
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
