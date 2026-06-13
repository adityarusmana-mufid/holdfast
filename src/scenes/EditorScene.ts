import Phaser from 'phaser'
import { TileType, LevelData, Wave, WaveEntry } from '../types/index'
import { Grid, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../entities/Grid'
import { tileColor, Position, RANGE_PATTERNS } from '../shared/utils/GridMath'
import { generateRoute } from '../systems/RouteGenerator'
import { exportLevelToFile, importLevelFromFile } from '../editor/LevelSerializer'
import { ENEMY_CONFIGS } from '../config/enemies'
import { COLORS, FONTS, hex } from '../ui/Constants'
import { makeButton, makeLabel } from '../ui/Components'

injectEditorStyles()

const PALETTE_ITEMS: { type: TileType; label: string; color: number }[] = [
  { type: TileType.Floor, label: 'Floor', color: 0xebeff5 },
  { type: TileType.Wall, label: 'Wall', color: 0xd5dbe3 },
  { type: TileType.Route, label: 'Route', color: 0xdce3ed },
  { type: TileType.DeployGround, label: 'Ground', color: 0xd4edda },
  { type: TileType.DeployRanged, label: 'Ranged', color: 0xd4e4ed },
  { type: TileType.Spawn, label: 'Spawn', color: 0xf5d4d4 },
  { type: TileType.Goal, label: 'Goal', color: 0xd4f5de },
]

const PANEL_W = 200
const PANEL_X = 1024 - PANEL_W - 6

export class EditorScene extends Phaser.Scene {
  private grid!: Grid
  private selectedType: TileType = TileType.Route
  private editMode: EditMode = EditMode.Paint
  private waypointMode: boolean = false
  private waypointBtnLabel!: Phaser.GameObjects.Text
  private paletteButtons: Phaser.GameObjects.Container[] = []
  private statusText!: Phaser.GameObjects.Text
  private configPanel!: ConfigPanel
  private wavePanel!: WavePanel
  private isDirty: boolean = false

  constructor() {
    super({ key: 'EditorScene' })
  }

  create(): void {
    this.cameras.main.fadeIn(200, 0, 0, 0)
    drawBgGradient(this)

    this.add.text(GRID_OFFSET_X, 6, 'HOLDFAST // LEVEL EDITOR', {
      ...FONTS.small, color: COLORS.text.accent,
    })

    this.grid = new Grid(this, 12, 8)
    this.grid.render()

    this.buildPalette()
    this.buildToolbar()
    this.buildStatusBar()

    this.configPanel = new ConfigPanel(this, PANEL_X, 148, PANEL_W)
    this.wavePanel = new WavePanel(this, PANEL_X, 340, PANEL_W)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y, pointer.rightButtonDown())
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.handleClick(pointer.x, pointer.y, pointer.rightButtonDown())
    })
  }

  private buildPalette(): void {
    const px = 10
    let y = 50
    const btnH = 36
    const btnW = 140

    makeLabel(this, px, y - 16, 'TILE PALETTE', COLORS.text.secondary, '12px')

    PALETTE_ITEMS.forEach((item) => {
      const bg = this.add.rectangle(px + btnW / 2, y + btnH / 2, btnW, btnH, item.color, 1)
        .setStrokeStyle(1, 0xcfd8dc)
        .setInteractive({ cursor: 'pointer' })
      bg.on('pointerdown', () => this.selectTileType(item.type))

      const label = this.add.text(px + 8, y + btnH / 2, item.label, {
        fontSize: '14px', color: COLORS.text.primary, fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0, 0.5)

      const container = this.add.container(0, 0, [bg, label])
      this.paletteButtons.push(container)
      y += btnH + 4
    })

    makeLabel(this, px, y + 8, 'MARKERS', COLORS.text.secondary, '12px')
  }

  private buildToolbar(): void {
    const px = 10
    let y = 50 + PALETTE_ITEMS.length * 40 + 40
    const btnW = 140

    makeLabel(this, px, y, 'GRID', COLORS.text.secondary, '12px')
    y += 18
    makeButton(this, px, y, 'Clear Grid', () => { this.grid.resize(this.grid.cols, this.grid.rows); this.grid.disconnectedTiles.clear(); this.grid.clearAll(); this.setStatus('Grid cleared'); this.isDirty = true }, { w: btnW, h: 24 })
    y += 28
    makeButton(this, px, y, 'Export JSON', () => { this.exportLevel() }, { w: btnW, h: 24 })
    y += 28
    makeButton(this, px, y, 'Import JSON', () => { this.importLevel() }, { w: btnW, h: 24 })

    makeLabel(this, px, y + 8, 'ROUTE', COLORS.text.secondary, '12px')
    y += 26

    this.waypointBtnLabel = this.add.text(px + 8, y + 4, '[ Paint Waypoints ]', {
      ...FONTS.small, color: COLORS.text.accent, fontStyle: 'bold',
    })
    this.waypointBtnLabel.setInteractive({ cursor: 'pointer' })
    this.waypointBtnLabel.on('pointerdown', () => {
      this.waypointMode = !this.waypointMode
      if (this.waypointMode) {
        const hasSpawn = !!this.grid.getSpawn()
        const hasGoal = !!this.grid.getGoal()
        if (!hasSpawn) this.setStatus('Paint a Spawn tile first')
        else if (!hasGoal) this.setStatus('Paint a Goal tile first')
        else this.setStatus('Click route tiles to add waypoints between spawn → goal')
      }
      this.updateWaypointBtn()
    })
    this.waypointBtnLabel.on('pointerover', () => this.waypointBtnLabel.setColor(COLORS.text.primary))
    this.waypointBtnLabel.on('pointerout', () => this.waypointBtnLabel.setColor(this.waypointMode ? COLORS.text.success : COLORS.text.accent))
    y += 28

    makeButton(this, px, y, 'Auto Route', () => {
      this.waypointMode = false
      this.updateWaypointBtn()
      this.generateWaypoints()
    }, { w: btnW, h: 24 })
    y += 28

    makeButton(this, px, y, 'Clear Route', () => {
      this.waypointMode = false
      this.updateWaypointBtn()
      this.grid.clearWaypoints()
      this.grid.render()
      this.setStatus('Intermediate waypoints cleared (spawn/goal kept)')
    }, { w: btnW, h: 24, textColor: COLORS.text.danger })
    y += 28

    makeLabel(this, px, y + 8, 'PLAY', COLORS.text.secondary, '12px')
    y += 26
    makeButton(this, px, y, '▶ Play', () => { this.playLevel() }, { w: btnW, h: 24, textColor: COLORS.text.success })

    y += 8
    makeLabel(this, px, y, 'SIZE', COLORS.text.secondary, '12px')
    y += 18

    const sizes: { label: string; cols: number; rows: number }[] = [
      { label: '12×3', cols: 12, rows: 3 },
      { label: '12×5', cols: 12, rows: 5 },
      { label: '12×8', cols: 12, rows: 8 },
      { label: '16×10', cols: 16, rows: 10 },
    ]
    sizes.forEach((s) => {
      makeButton(this, px, y, s.label, () => { this.grid.resize(s.cols, s.rows); this.isDirty = true }, { w: 68, h: 24, textSize: '11px', textColor: COLORS.text.secondary })
      y += 28
    })
  }

  private updateWaypointBtn(): void {
    this.waypointBtnLabel.setText(this.waypointMode ? '[■ Painting Waypoints]' : '[ Paint Waypoints ]')
    this.waypointBtnLabel.setColor(this.waypointMode ? COLORS.text.success : COLORS.text.accent)
  }

  private buildStatusBar(): void {
    this.statusText = makeLabel(this, GRID_OFFSET_X, this.scale.height - 20, 'Ready', COLORS.text.dim)
  }

  private selectTileType(type: TileType): void {
    this.selectedType = type
    this.editMode = EditMode.Paint
    this.paletteButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle
      const item = PALETTE_ITEMS[i]
      bg.setFillStyle(item.color, 1)
      bg.setStrokeStyle(item.type === type ? 2 : 1, item.type === type ? 0x00a2ff : 0xcfd8dc, item.type === type ? 1 : 0.5)
    })
    this.setStatus(`Selected: ${type}`)
  }

  private handleClick(px: number, py: number, rightButton: boolean = false): void {
    const pos = this.grid.pixelToTile(px, py)
    if (!pos) return

    if (rightButton) {
      if (this.waypointMode && this.grid.getWaypointCount() > 0) {
        this.grid.clearWaypoints()
        this.grid.render()
        this.setStatus('Intermediate waypoints cleared')
        return
      }
      this.grid.setTile(pos.row, pos.col, TileType.Floor)
      this.grid.updateRouteConnectivity()
      this.grid.render()
      this.isDirty = true
      this.updateRouteStatus()
      this.setStatus(`Erased (${pos.row}, ${pos.col})`)
      return
    }

    if (this.waypointMode) {
      const isSpawnTile = this.grid.getSpawn() && this.grid.getSpawn()!.row === pos.row && this.grid.getSpawn()!.col === pos.col
      const isGoalTile = this.grid.getGoal() && this.grid.getGoal()!.row === pos.row && this.grid.getGoal()!.col === pos.col
      if (isSpawnTile) { this.setStatus('Spawn is fixed — clear route and re-paint to change'); return }
      if (isGoalTile) { this.setStatus('Goal is fixed — clear route and re-paint to change'); return }

      const existing = this.grid.routePath.findIndex(wp => wp.row === pos.row && wp.col === pos.col)
      if (existing !== -1) {
        this.grid.routePath.splice(existing, 1)
        this.setStatus(`Removed waypoint ${existing + 2}`)
      } else {
        this.grid.addWaypoint(pos)
        this.setStatus(`Waypoint ${this.grid.getWaypointCount() + 1}: (${pos.row}, ${pos.col})`)
      }
      this.grid.render()
      this.isDirty = true
      return
    }

    if (this.editMode === EditMode.Paint) {
      if (this.selectedType === TileType.Spawn) {
        this.grid.setSpawn(pos)
      } else if (this.selectedType === TileType.Goal) {
        this.grid.setGoal(pos)
      } else {
        this.grid.setTile(pos.row, pos.col, this.selectedType)
        if (this.selectedType === TileType.Route) {
          this.grid.updateRouteConnectivity()
        }
      }
      this.grid.render()
      this.isDirty = true
      this.updateRouteStatus()
    }
  }

  private exportLevel(): void {
    exportLevelToFile(this.buildLevelData())
    this.setStatus('Level exported!')
  }

  private async importLevel(): Promise<void> {
    const data = await importLevelFromFile()
    if (data) {
      this.grid.fromLevelData(data)
      this.grid.updateRouteConnectivity()
      this.grid.render()
      this.configPanel.load(data)
      this.wavePanel.load(data.waves)
      this.isDirty = true
      this.updateRouteStatus()
      this.setStatus(`Loaded: ${data.name}`)
    } else {
      this.setStatus('Import failed!')
    }
  }

  private generateWaypoints(): void {
    const spawn = this.grid.getSpawn()
    const goal = this.grid.getGoal()
    if (!spawn || !goal) { this.setStatus('Set Spawn and Goal markers first!'); return }

    this.grid.updateRouteConnectivity()
    const disconnected = this.grid.getDisconnectedTiles()
    if (disconnected.size > 0) {
      this.setStatus(`⚠ ${disconnected.size} route tile(s) disconnected! Paint them adjacent to connect.`)
      this.grid.render()
      return
    }

    const fullRoute = generateRoute(
      this.grid.tiles.map(row => row.map(t => t.type)),
      spawn, goal, this.grid.rows, this.grid.cols,
    )
    if (fullRoute.length > 0) {
      const intermediate = fullRoute.slice(1, -1)
      this.grid.setRoutePath(intermediate)
      this.grid.render()
      const total = intermediate.length + (spawn ? 1 : 0) + (goal ? 1 : 0)
      this.setStatus(`Route: ${total} waypoints ✅`)
    } else {
      this.setStatus('No route found! Ensure route tiles connect Spawn → Goal.')
    }
  }

  private updateRouteStatus(): void {
    const disconnected = this.grid.getDisconnectedTiles()
    if (disconnected.size > 0) {
      this.setStatus(`⚠ ${disconnected.size} route tile(s) have no route connection`)
    } else {
      const routeTiles = this.grid.tiles.flat().filter(t => t.type === TileType.Route).length
      if (routeTiles > 0) {
        this.setStatus(`Route: ${routeTiles} tile(s), all connected ✅`)
      }
    }
  }

  private playLevel(): void {
    const data = this.buildLevelData()
    if (data.waves.length === 0) { this.setStatus('Add waves first!'); return }
    if (data.waypoints.length < 2) { this.setStatus('Set Spawn + Goal + at least one waypoint!'); return }
    this.scene.start('GameScene', { level: data })
  }

  private buildLevelData(): LevelData {
    const data = this.grid.toLevelData(this.configPanel.getName())
    data.startingDP = this.configPanel.startingDP
    data.dpRegenRate = this.configPanel.dpRegenRate
    data.dpCap = this.configPanel.dpCap
    data.deploymentLimit = this.configPanel.deploymentLimit
    data.lives = this.configPanel.lives
    data.waves = this.wavePanel.waves
    return data
  }

  private setStatus(msg: string): void { this.statusText.setText(msg) }
}

enum EditMode { Paint, MarkerSpawn, MarkerGoal, Erase }

function drawBgGradient(scene: Phaser.Scene): void {
  const g = scene.add.graphics()
  const { width: w, height: h } = scene.scale
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

function makeDomPanel(scene: Phaser.Scene, x: number, y: number, html: string): Phaser.GameObjects.DOMElement {
  const div = document.createElement('div')
  div.innerHTML = html
  const el = scene.add.dom(x, y, div)
  el.setOrigin(0, 0)
  return el
}

function fieldRow(label: string, value: string | number): string {
  return `<div class="ef-row"><span class="ef-label">${label}</span><span class="ef-value" tabindex="0">${value}</span></div>`
}

function injectEditorStyles(): void {
  const s = document.createElement('style')
  s.textContent = `
.editor-panel {
  background: #ffffff;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  padding: 10px;
  font-family: "Share Tech Mono", "Roboto Mono", monospace;
  font-size: 13px;
  color: #1a1a2e;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.editor-panel .ep-title {
  color: #00a2ff;
  font-weight: bold;
  font-size: 12px;
  margin: 0 0 8px 0;
  cursor: pointer;
  user-select: none;
}
.editor-panel .ep-title:hover { color: #0091e0; }
.ef-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 22px;
  cursor: pointer;
  padding: 0 2px;
}
.ef-row:hover { background: #f0f4ff; border-radius: 3px; }
.ef-label { color: #4a4a5a; }
.ef-value { 
  color: #1a1a2e; font-weight: bold; cursor: pointer;
  padding: 1px 4px; border-radius: 3px;
}
.ef-value:hover { background: #e3f0ff; color: #00a2ff; }
.ef-input {
  width: 60px; text-align: right;
  font-family: "Share Tech Mono", "Roboto Mono", monospace;
  font-size: 12px; font-weight: bold;
  border: 1px solid #cfd8dc; border-radius: 3px; padding: 1px 4px;
  background: #f8f9fb; color: #1a1a2e;
}
.ef-input:focus { outline: 1px solid #00a2ff; border-color: #00a2ff; }
.ef-del { color: #d32f2f; cursor: pointer; padding: 0 2px; }
.ef-del:hover { background: #ffe8e8; border-radius: 3px; }
.ef-add { color: #00c853; cursor: pointer; margin-top: 4px; display: inline-block; }
.ef-add:hover { background: #e8f8ee; border-radius: 3px; padding: 0 2px; }
.ef-cycle { cursor: pointer; font-weight: bold; }
.ef-cycle:hover { color: #00a2ff; }
.ef-header {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; user-select: none;
  color: #00a2ff; font-weight: bold; font-size: 12px;
  margin: 0 0 4px 0;
}
.ef-header:hover { color: #0091e0; }
.ef-wave {
  margin: 4px 0; padding: 4px; border: 1px solid #e8ecf0; border-radius: 4px;
  background: #fafbfc;
}
.ef-entry { margin: 2px 0 2px 8px; font-size: 12px; }
`
  document.head.appendChild(s)
}

class ConfigPanel {
  private scene: Phaser.Scene
  private x: number; private y: number; private w: number
  private domEl: Phaser.GameObjects.DOMElement | null = null
  name: string = 'level-01'
  startingDP: number = 10
  dpRegenRate: number = 1
  dpCap: number = 99
  deploymentLimit: number = 8
  lives: number = 3

  constructor(scene: Phaser.Scene, x: number, y: number, w: number) {
    this.scene = scene; this.x = x; this.y = y; this.w = w
    this.draw()
  }

  private draw(): void {
    if (this.domEl) { this.domEl.destroy(); this.domEl = null }

    const fields = [
      { id: 'name', label: 'Name', val: this.name, type: 'text' },
      { id: 'startingDP', label: 'Start DP', val: this.startingDP, type: 'num' },
      { id: 'dpRegenRate', label: 'DP Regen/s', val: this.dpRegenRate, type: 'num' },
      { id: 'dpCap', label: 'DP Cap', val: this.dpCap, type: 'num' },
      { id: 'deploymentLimit', label: 'Deploy Limit', val: this.deploymentLimit, type: 'num' },
      { id: 'lives', label: 'Lives', val: this.lives, type: 'num' },
    ]

    let rows = ''
    for (const f of fields) {
      if (f.type === 'text') {
        rows += `<div class="ef-row">
          <span class="ef-label">${f.label}</span>
          <input class="ef-input" type="text" id="cp-${f.id}" value="${f.val}" style="width:120px;text-align:left;">
        </div>`
      } else {
        rows += fieldRow(f.label, f.val)
      }
    }

    const html = `<div class="editor-panel" style="width:${this.w - 20}px">
      <div class="ep-title">LEVEL CONFIG</div>
      ${rows}
    </div>`

    this.domEl = makeDomPanel(this.scene, this.x, this.y, html)
    const d = this.domEl.node as HTMLElement

    const nameInput = d.querySelector('#cp-name') as HTMLInputElement
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        if (nameInput.value.trim()) { this.name = nameInput.value.trim() }
      })
    }

    const numFields: { id: string; set: (v: number) => void }[] = [
      { id: 'startingDP', set: (v) => { this.startingDP = v; this.draw() } },
      { id: 'dpRegenRate', set: (v) => { this.dpRegenRate = v; this.draw() } },
      { id: 'dpCap', set: (v) => { this.dpCap = v; this.draw() } },
      { id: 'deploymentLimit', set: (v) => { this.deploymentLimit = v; this.draw() } },
      { id: 'lives', set: (v) => { this.lives = v; this.draw() } },
    ]
    for (const f of numFields) {
      const span = d.querySelector(`.ef-row:has(+ * #cp-${f.id}) .ef-value`) as HTMLElement
      const allSpans = d.querySelectorAll('.ef-value')
      const idx = numFields.indexOf(f)
      if (allSpans[idx]) {
        const el = allSpans[idx] as HTMLElement
        el.addEventListener('click', () => {
          const cur = el.textContent || '0'
          const input = document.createElement('input')
          input.className = 'ef-input'
          input.type = 'number'
          input.min = '1'
          input.value = cur
          input.style.width = '60px'
          el.replaceWith(input)
          input.focus()
          input.addEventListener('blur', () => {
            const v = parseInt(input.value, 10)
            if (!isNaN(v) && v > 0) f.set(v)
            else this.draw()
          })
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur()
            if (e.key === 'Escape') this.draw()
          })
        })
      }
    }
  }

  getName(): string { return this.name }

  load(data: LevelData): void {
    this.name = data.name
    this.startingDP = data.startingDP
    this.dpRegenRate = data.dpRegenRate
    this.dpCap = data.dpCap
    this.deploymentLimit = data.deploymentLimit
    this.lives = data.lives
    this.draw()
  }
}

class WavePanel {
  private scene: Phaser.Scene
  private x: number; private y: number; private w: number
  private domEl: Phaser.GameObjects.DOMElement | null = null
  waves: Wave[] = []
  expanded: boolean = true

  constructor(scene: Phaser.Scene, x: number, y: number, w: number) {
    this.scene = scene; this.x = x; this.y = y; this.w = w
    this.draw()
  }

  load(waves: Wave[]): void {
    this.waves = waves.map(w => ({
      preludeDuration: w.preludeDuration,
      entries: w.entries.map(e => ({ ...e })),
    }))
    this.draw()
  }

  private draw(): void {
    if (this.domEl) { this.domEl.destroy(); this.domEl = null }

    let content = ''
    if (this.expanded) {
      const enemyNames = ENEMY_CONFIGS.map(e => e.name)
      const enemyIds = ENEMY_CONFIGS.map(e => e.id)

      this.waves.forEach((wave, wi) => {
        content += `<div class="ef-wave">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:bold;color:#1a1a2e;">Wave ${wi + 1}</span>
            <span class="ef-del" data-action="del-wave" data-idx="${wi}">[del]</span>
          </div>`
        wave.entries.forEach((entry, ei) => {
          const eIdx = Math.max(0, enemyIds.indexOf(entry.enemyType))
          content += `<div class="ef-entry">
            <span style="display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;">
              <span class="ef-cycle" data-action="cycle-enemy" data-wi="${wi}" data-ei="${ei}">[${enemyNames[eIdx]}]</span>
              <span>x<span class="ef-value" data-action="edit-count" data-wi="${wi}" data-ei="${ei}">${entry.count}</span></span>
              <span>every <span class="ef-value" data-action="edit-interval" data-wi="${wi}" data-ei="${ei}">${entry.spawnInterval}</span>s</span>
              <span class="ef-del" data-action="del-entry" data-wi="${wi}" data-ei="${ei}">[x]</span>
            </span>
          </div>`
        })
        content += `<div style="margin:2px 0 0 8px;"><span class="ef-add" data-action="add-entry" data-idx="${wi}">[+ entry]</span></div>`
        content += `</div>`
      })
      content += `<div style="margin-top:6px;"><span class="ef-add" data-action="add-wave">[+ Add Wave]</span></div>`
    }

    const suffix = this.expanded ? ' [hide]' : ` [${this.waves.length}] [show]`
    const html = `<div class="editor-panel" style="width:${this.w - 20}px">
      <div class="ef-header" data-action="toggle-expand">WAVES${suffix}</div>
      ${content}
    </div>`

    this.domEl = makeDomPanel(this.scene, this.x, this.y, html)
    const d = this.domEl.node as HTMLElement

    d.querySelectorAll('[data-action="toggle-expand"]').forEach(el => {
      el.addEventListener('click', () => { this.expanded = !this.expanded; this.draw() })
    })
    d.querySelectorAll('[data-action="del-wave"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.idx || '0', 10)
        this.waves.splice(idx, 1); this.draw()
      })
    })
    d.querySelectorAll('[data-action="del-entry"]').forEach(el => {
      el.addEventListener('click', () => {
        const wi = parseInt((el as HTMLElement).dataset.wi || '0', 10)
        const ei = parseInt((el as HTMLElement).dataset.ei || '0', 10)
        this.waves[wi]?.entries.splice(ei, 1); this.draw()
      })
    })
    d.querySelectorAll('[data-action="cycle-enemy"]').forEach(el => {
      el.addEventListener('click', () => {
        const wi = parseInt((el as HTMLElement).dataset.wi || '0', 10)
        const ei = parseInt((el as HTMLElement).dataset.ei || '0', 10)
        const entry = this.waves[wi]?.entries[ei]
        if (entry) {
          const ids = ENEMY_CONFIGS.map(e => e.id)
          const cur = Math.max(0, ids.indexOf(entry.enemyType))
          entry.enemyType = ids[(cur + 1) % ids.length]
          this.draw()
        }
      })
    })
    d.querySelectorAll('[data-action="add-wave"]').forEach(el => {
      el.addEventListener('click', () => {
        this.waves.push({ preludeDuration: 0, entries: [{ enemyType: 'soldier', count: 3, spawnInterval: 2.0 }] })
        this.draw()
      })
    })
    d.querySelectorAll('[data-action="add-entry"]').forEach(el => {
      el.addEventListener('click', () => {
        const wi = parseInt((el as HTMLElement).dataset.idx || '0', 10)
        this.waves[wi]?.entries.push({ enemyType: 'soldier', count: 1, spawnInterval: 2.0 })
        this.draw()
      })
    })

    d.querySelectorAll('[data-action="edit-count"]').forEach(el => {
      el.addEventListener('click', () => {
        const wi = parseInt((el as HTMLElement).dataset.wi || '0', 10)
        const ei = parseInt((el as HTMLElement).dataset.ei || '0', 10)
        const entry = this.waves[wi]?.entries[ei]
        if (!entry) return
        const input = document.createElement('input')
        input.className = 'ef-input'
        input.type = 'number'
        input.min = '1'
        input.value = String(entry.count)
        input.style.width = '50px'
        const parent = el.parentElement
        el.replaceWith(input)
        input.focus()
        input.addEventListener('blur', () => {
          const v = parseInt(input.value, 10)
          if (!isNaN(v) && v > 0) { entry.count = v; this.draw() }
          else this.draw()
        })
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur()
          if (e.key === 'Escape') this.draw()
        })
      })
    })

    d.querySelectorAll('[data-action="edit-interval"]').forEach(el => {
      el.addEventListener('click', () => {
        const wi = parseInt((el as HTMLElement).dataset.wi || '0', 10)
        const ei = parseInt((el as HTMLElement).dataset.ei || '0', 10)
        const entry = this.waves[wi]?.entries[ei]
        if (!entry) return
        const input = document.createElement('input')
        input.className = 'ef-input'
        input.type = 'number'
        input.min = '0.1'
        input.step = '0.1'
        input.value = String(entry.spawnInterval)
        input.style.width = '50px'
        const parent = el.parentElement
        el.replaceWith(input)
        input.focus()
        input.addEventListener('blur', () => {
          const v = parseFloat(input.value)
          if (!isNaN(v) && v > 0) { entry.spawnInterval = v; this.draw() }
          else this.draw()
        })
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur()
          if (e.key === 'Escape') this.draw()
        })
      })
    })
  }
}
