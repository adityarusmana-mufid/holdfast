import Phaser from 'phaser'
import { TileType, LevelData, Wave, WaveEntry, Route, Position } from '../types/index'
import { Grid, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../entities/Grid'
import { tileColor, ROUTE_COLORS, validateRoutePath } from '../shared/utils/GridMath'
import { exportLevelToFile, importLevelFromFile } from '../editor/LevelSerializer'
import { ENEMY_CONFIGS } from '../config/enemies'
import { COLORS, FONTS } from '../ui/Constants'
import { makeButton, makeLabel } from '../ui/Components'
import { TEST_LEVEL } from '../levels/testLevel'

injectEditorStyles()

const PALETTE_ITEMS: { type: TileType; label: string; color: number }[] = [
  { type: TileType.Ground, label: 'Ground', color: 0x3a3a3a },
  { type: TileType.Floor, label: 'Floor', color: 0x2a2a2a },
  { type: TileType.Ranged, label: 'Ranged', color: 0x4a4a3a },
  { type: TileType.Wall, label: 'Wall', color: 0x1a1a1a },
  { type: TileType.Spawn, label: 'Spawn', color: 0x4a1a1a },
  { type: TileType.Goal, label: 'Goal', color: 0x1a1a4a },
]

const PANEL_W = 200
const PANEL_X = 1024 - PANEL_W - 6

export class EditorScene extends Phaser.Scene {
  private grid!: Grid
  private selectedType: TileType = TileType.Ground
  private editMode: EditMode = EditMode.Paint
  private waypointMode: boolean = false
  private paletteButtons: Phaser.GameObjects.Container[] = []
  private statusText!: Phaser.GameObjects.Text
  private addEraseBtn!: Phaser.GameObjects.Text

  private configPanel!: ConfigPanel
  private wavePanel!: WavePanel
  private isDirty: boolean = false

  private routes: Route[] = []
  private selectedRouteIndex: number = -1
  private nextRouteColorIndex: number = 0
  private routePanel: Phaser.GameObjects.DOMElement | null = null
  private routePreviewGraphics!: Phaser.GameObjects.Graphics

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

    this.routes = []
    this.selectedRouteIndex = -1
    this.nextRouteColorIndex = 0

    this.buildPalette()
    this.buildToolbar()
    this.buildRoutePanel()
    this.buildStatusBar()

    this.configPanel = new ConfigPanel(this, PANEL_X, 148, PANEL_W)
    this.wavePanel = new WavePanel(this, PANEL_X, 340, PANEL_W)

    this.routePreviewGraphics = this.add.graphics()

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y)
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.handleClick(pointer.x, pointer.y)
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
        .setStrokeStyle(1, 0x444444)
        .setInteractive({ cursor: 'pointer' })
      bg.on('pointerdown', () => this.selectTileType(item.type))

      const label = this.add.text(px + 8, y + btnH / 2, item.label, {
        fontSize: '14px', color: '#cccccc', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      }).setOrigin(0, 0.5)

      const container = this.add.container(0, 0, [bg, label])
      this.paletteButtons.push(container)
      y += btnH + 4
    })
  }

  private buildToolbar(): void {
    const px = 10
    let y = 50 + PALETTE_ITEMS.length * 40 + 8
    const btnW = 140

    makeLabel(this, px, y, 'GRID', COLORS.text.secondary, '12px')
    y += 18
    makeButton(this, px, y, 'Clear Grid', () => { this.grid.resize(this.grid.cols, this.grid.rows); this.setStatus('Grid cleared'); this.isDirty = true }, { w: btnW, h: 24 })
    y += 28
    makeButton(this, px, y, 'Export JSON', () => { this.exportLevel() }, { w: btnW, h: 24 })
    y += 28
    makeButton(this, px, y, 'Import JSON', () => { this.importLevel() }, { w: btnW, h: 24 })

    makeLabel(this, px, y + 8, 'ROUTES', COLORS.text.secondary, '12px')
    y += 26

    makeButton(this, px, y, 'Waypoints', () => {
      if (this.selectedRouteIndex < 0) {
        this.setStatus('Select a route first')
        return
      }
      this.waypointMode = !this.waypointMode
      this.setStatus(this.waypointMode ? 'Waypoint mode: click to add/remove' : 'Paint mode')
    }, { w: btnW, h: 24, textColor: this.waypointMode ? COLORS.text.success : COLORS.text.accent })
    y += 28

    makeButton(this, px, y, 'Clear Waypoints', () => {
      const route = this.routes[this.selectedRouteIndex]
      if (!route) { this.setStatus('Select a route first'); return }
      route.waypoints = []
      this.renderRouteList()
      this.drawRoutePreview()
      this.setStatus('Waypoints cleared')
    }, { w: btnW, h: 24, textColor: COLORS.text.danger })
    y += 28

    makeLabel(this, px, y + 8, 'TOOLS', COLORS.text.secondary, '12px')
    y += 26
    this.addEraseBtn = this.add.text(px + 8, y + 4, '[ Erase ]', {
      ...FONTS.small, color: COLORS.text.danger,
    })
    this.addEraseBtn.setInteractive({ cursor: 'pointer' })
    this.addEraseBtn.on('pointerdown', () => {
      this.editMode = this.editMode === EditMode.Erase ? EditMode.Paint : EditMode.Erase
      this.setStatus(this.editMode === EditMode.Erase ? 'Erase mode' : 'Paint mode')
      this.addEraseBtn.setText(this.editMode === EditMode.Erase ? '[■ Erase]' : '[ Erase ]')
      this.addEraseBtn.setColor(this.editMode === EditMode.Erase ? COLORS.text.success : COLORS.text.danger)
    })
    y += 28

    makeLabel(this, px, y + 8, 'PLAY', COLORS.text.secondary, '12px')
    y += 26
    makeButton(this, px, y, '▶ Play', () => { this.playLevel() }, { w: btnW, h: 24, textColor: COLORS.text.success })
    y += 28
    makeButton(this, px, y, 'Test Combat', () => { this.playTestLevel() }, { w: btnW, h: 24, textColor: COLORS.text.warning })

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

  private buildRoutePanel(): void {
    const panel = this.add.dom(0, 0, document.createElement('div'))
    panel.setClassName('editor-panel')
    panel.setPosition(PANEL_X, 10)
    const el = panel.node as HTMLDivElement
    el.id = 'route-panel'
    el.innerHTML = `
      <div class="ep-title">ROUTES</div>
      <button id="add-route-btn" class="ef-add" style="margin-bottom:6px;display:inline-block;">+ Add Route</button>
      <div id="route-list"></div>
    `
    el.querySelector('#add-route-btn')!.addEventListener('click', () => this.addRoute())
    this.routePanel = panel
    this.renderRouteList()
  }

  private renderRouteList(): void {
    if (!this.routePanel) return
    const el = this.routePanel.node as HTMLDivElement
    const list = el.querySelector('#route-list')
    if (!list) return

    if (this.routes.length === 0) {
      list.innerHTML = '<div style="color:#666;font-size:11px;padding:4px 0;">No routes yet</div>'
      return
    }

    list.innerHTML = this.routes.map((r, i) => {
      const valid = validateRoutePath(r) ? '' : ' !!'
      return `<div class="route-item ${i === this.selectedRouteIndex ? 'selected' : ''}" data-idx="${i}">
        <span class="route-swatch" style="background:#${r.color.toString(16).padStart(6, '0')}"></span>
        <span style="flex:1;">Route ${i + 1}${valid}</span>
        <span style="font-size:10px;color:#888;">${r.waypoints.length}wp</span>
        <span class="ef-del" data-action="del-route" data-idx="${i}" style="margin-left:4px;">[del]</span>
      </div>`
    }).join('')

    list.querySelectorAll('.route-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).dataset.action === 'del-route') return
        const idx = parseInt((el as HTMLElement).dataset.idx || '0', 10)
        this.selectRoute(idx)
      })
    })
    list.querySelectorAll('[data-action="del-route"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const idx = parseInt((el as HTMLElement).dataset.idx || '0', 10)
        this.deleteRoute(idx)
      })
    })
  }

  private addRoute(): void {
    const color = ROUTE_COLORS[this.nextRouteColorIndex % ROUTE_COLORS.length]
    this.nextRouteColorIndex++
    this.routes.push({ color, spawn: { row: 0, col: 0 }, goal: { row: 0, col: 0 }, waypoints: [] })
    this.selectedRouteIndex = this.routes.length - 1
    this.renderRouteList()
    this.drawRoutePreview()
    this.wavePanel.setRoutes(this.routes)
    this.setStatus(`Route ${this.routes.length} added`)
  }

  private deleteRoute(index: number): void {
    if (this.routes.length <= 1) { this.setStatus('Need at least 1 route'); return }
    if (!confirm(`Delete Route ${index + 1}?`)) return
    this.routes.splice(index, 1)
    if (this.selectedRouteIndex >= this.routes.length) {
      this.selectedRouteIndex = this.routes.length - 1
    }
    if (this.routes.length === 0) this.selectedRouteIndex = -1
    this.renderRouteList()
    this.drawRoutePreview()
    this.wavePanel.setRoutes(this.routes)
    this.setStatus(`Route ${index + 1} deleted`)
  }

  private selectRoute(index: number): void {
    this.selectedRouteIndex = index
    this.renderRouteList()
    this.drawRoutePreview()
    this.setStatus(`Route ${index + 1} selected`)
  }

  private drawRoutePreview(): void {
    this.routePreviewGraphics.clear()
    const route = this.routes[this.selectedRouteIndex]
    if (!route) return

    const path = [route.spawn, ...route.waypoints, route.goal]
    if (path.length < 2) return

    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1]
      const curr = path[i]
      const x0 = prev.col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X
      const y0 = prev.row * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_Y
      const x1 = curr.col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X
      const y1 = curr.row * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_Y

      this.routePreviewGraphics.lineStyle(3, route.color, 0.7)
      this.routePreviewGraphics.beginPath()
      this.routePreviewGraphics.moveTo(x0, y0)
      this.routePreviewGraphics.lineTo(x1, y1)
      this.routePreviewGraphics.strokePath()

      const angle = Math.atan2(y1 - y0, x1 - x0)
      this.routePreviewGraphics.fillStyle(route.color, 0.7)
      this.routePreviewGraphics.fillTriangle(
        x1, y1,
        x1 - 10 * Math.cos(angle - 0.4), y1 - 10 * Math.sin(angle - 0.4),
        x1 - 10 * Math.cos(angle + 0.4), y1 - 10 * Math.sin(angle + 0.4),
      )
    }

    // Spawn marker
    const sp = this.grid.tileToPixel(route.spawn.row, route.spawn.col)
    this.routePreviewGraphics.fillStyle(route.color, 0.3)
    this.routePreviewGraphics.fillCircle(sp.x, sp.y, 14)
    this.routePreviewGraphics.lineStyle(2, route.color, 0.8)
    this.routePreviewGraphics.strokeCircle(sp.x, sp.y, 14)

    // Goal marker
    const gp = this.grid.tileToPixel(route.goal.row, route.goal.col)
    this.routePreviewGraphics.fillStyle(route.color, 0.3)
    this.routePreviewGraphics.fillRect(gp.x - 10, gp.y - 10, 20, 20)
    this.routePreviewGraphics.lineStyle(2, route.color, 0.8)
    this.routePreviewGraphics.strokeRect(gp.x - 10, gp.y - 10, 20, 20)
  }

  private buildStatusBar(): void {
    this.statusText = makeLabel(this, GRID_OFFSET_X, this.scale.height - 20, 'Ready', COLORS.text.dim)
  }

  private selectTileType(type: TileType): void {
    this.selectedType = type
    this.editMode = EditMode.Paint
    if (this.addEraseBtn) {
      this.addEraseBtn.setText('[ Erase ]')
      this.addEraseBtn.setColor(COLORS.text.danger)
    }
    this.paletteButtons.forEach((btn, i) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle
      const item = PALETTE_ITEMS[i]
      bg.setFillStyle(item.color, 1)
      bg.setStrokeStyle(item.type === type ? 2 : 1, item.type === type ? 0x00a2ff : 0x444444, item.type === type ? 1 : 0.5)
    })
    this.setStatus(`Selected: ${type}`)
  }

  private handleClick(px: number, py: number): void {
    const pos = this.grid.pixelToTile(px, py)
    if (!pos) return

    if (this.editMode === EditMode.Erase) {
      this.grid.setTile(pos.row, pos.col, TileType.Ground)
      this.grid.render()
      this.isDirty = true
      this.setStatus(`Erased (${pos.row}, ${pos.col})`)
      return
    }

    if (this.waypointMode) {
      this.handleWaypointClick(pos.row, pos.col)
      return
    }

    this.grid.setTile(pos.row, pos.col, this.selectedType)
    this.grid.render()
    this.isDirty = true
  }

  private handleWaypointClick(row: number, col: number): void {
    const route = this.routes[this.selectedRouteIndex]
    if (!route) { this.setStatus('Select a route first'); return }

    const tile = this.grid.getTile(row, col)
    if (!tile) return

    if (this.editMode === EditMode.Erase) {
      const idx = route.waypoints.findIndex(wp => wp.row === row && wp.col === col)
      if (idx >= 0) {
        route.waypoints.splice(idx, 1)
        this.renderRouteList()
        this.drawRoutePreview()
        this.setStatus(`Waypoint removed (${row}, ${col})`)
      }
      return
    }

    if (tile.type === TileType.Spawn) {
      route.spawn = { row, col }
      this.renderRouteList()
      this.drawRoutePreview()
      this.setStatus(`Route ${this.selectedRouteIndex + 1} spawn set`)
      return
    }

    if (tile.type === TileType.Goal) {
      route.goal = { row, col }
      this.renderRouteList()
      this.drawRoutePreview()
      this.setStatus(`Route ${this.selectedRouteIndex + 1} goal set`)
      return
    }

    if (tile.type !== TileType.Wall) {
      const existing = route.waypoints.findIndex(wp => wp.row === row && wp.col === col)
      if (existing !== -1) {
        route.waypoints.splice(existing, 1)
        this.setStatus(`Waypoint removed (${row}, ${col})`)
      } else {
        route.waypoints.push({ row, col })
        this.setStatus(`Waypoint ${route.waypoints.length}: (${row}, ${col})`)
      }
      this.renderRouteList()
      this.drawRoutePreview()
    }
  }

  private exportLevel(): void {
    exportLevelToFile(this.buildLevelData())
    this.setStatus('Level exported!')
  }

  private async importLevel(): Promise<void> {
    const data = await importLevelFromFile()
    if (data) {
      const migrated = data.routes ? data : Grid.migrateLevelData(data)
      this.grid.fromLevelData(migrated)
      this.grid.render()
      this.configPanel.load(migrated)
      this.routes = migrated.routes.map(r => ({ ...r, waypoints: r.waypoints.map(w => ({ ...w })) }))
      this.selectedRouteIndex = this.routes.length > 0 ? 0 : -1
      this.nextRouteColorIndex = this.routes.length
      this.wavePanel.setRoutes(this.routes)
      this.wavePanel.load(migrated.waves)
      this.renderRouteList()
      this.drawRoutePreview()
      this.isDirty = true
      this.setStatus(`Loaded: ${migrated.name}`)
    } else {
      this.setStatus('Import failed!')
    }
  }

  private pathCrossesWall(a: Position, b: Position): Position | null {
    const dr = Math.abs(b.row - a.row)
    const dc = Math.abs(b.col - a.col)
    const steps = Math.max(dr, dc)
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps
      const r = Math.round(a.row + t * (b.row - a.row))
      const c = Math.round(a.col + t * (b.col - a.col))
      const tile = this.grid.getTile(r, c)
      if (tile && tile.type === TileType.Wall) return { row: r, col: c }
    }
    return null
  }

  private getRouteErrors(): string[] {
    const errors: string[] = []
    if (this.routes.length === 0) {
      errors.push('No routes defined — add a route')
      return errors
    }
    for (let ri = 0; ri < this.routes.length; ri++) {
      const route = this.routes[ri]
      const label = `Route ${ri + 1}`

      const path = [route.spawn, ...route.waypoints, route.goal]
      if (path.length < 2) {
        errors.push(`${label}: need at least spawn + goal (only ${path.length} point(s))`)
        continue
      }

      const spawnTile = this.grid.getTile(route.spawn.row, route.spawn.col)
      const goalTile = this.grid.getTile(route.goal.row, route.goal.col)
      if (!spawnTile || spawnTile.type !== TileType.Spawn) {
        errors.push(`${label}: spawn at (${route.spawn.row},${route.spawn.col}) is not a Spawn tile`)
      }
      if (!goalTile || goalTile.type !== TileType.Goal) {
        errors.push(`${label}: goal at (${route.goal.row},${route.goal.col}) is not a Goal tile`)
      }

      for (let i = 1; i < path.length; i++) {
        const wall = this.pathCrossesWall(path[i - 1], path[i])
        if (wall) {
          errors.push(`${label}: path passes through Wall at (${wall.row},${wall.col}) between ${i === 1 ? 'spawn' : 'waypoint ' + i} and ${i === path.length - 1 ? 'goal' : 'waypoint ' + (i + 1)}`)
        }
      }
    }

    if (this.routes.length > 0) {
      const usedSpawns = new Set(this.routes.map(r => `${r.spawn.row},${r.spawn.col}`))
      const usedGoals = new Set(this.routes.map(r => `${r.goal.row},${r.goal.col}`))
      for (let r = 0; r < this.grid.rows; r++) {
        for (let c = 0; c < this.grid.cols; c++) {
          const tile = this.grid.getTile(r, c)
          if (!tile) continue
          if (tile.type === TileType.Spawn && !usedSpawns.has(`${r},${c}`)) {
            errors.push(`Spawn tile at (${r},${c}) has no route using it — assign or remove it`)
          }
          if (tile.type === TileType.Goal && !usedGoals.has(`${r},${c}`)) {
            errors.push(`Goal tile at (${r},${c}) has no route using it — assign or remove it`)
          }
        }
      }
    }

    const waves = this.wavePanel.waves
    for (let wi = 0; wi < waves.length; wi++) {
      const ri = waves[wi].routeIndex
      if (ri < 0 || ri >= this.routes.length) {
        errors.push(`Wave ${wi + 1}: references route index ${ri}, but only ${this.routes.length} route(s) exist`)
      }
    }

    return errors
  }

  private playLevel(): void {
    const data = this.buildLevelData()
    if (data.waves.length === 0) { this.setStatus('Add waves first!'); return }
    const routeErrors = this.getRouteErrors()
    if (routeErrors.length > 0) {
      this.setStatus(routeErrors[0])
      return
    }
    this.scene.start('GameScene', { level: data })
  }

  private playTestLevel(): void {
    this.scene.start('GameScene', { level: TEST_LEVEL })
  }

  private buildLevelData(): LevelData {
    return {
      name: this.configPanel.getName(),
      cols: this.grid.cols,
      rows: this.grid.rows,
      tiles: this.grid.tiles,
      routes: this.routes,
      waves: this.wavePanel.waves,
      startingDP: this.configPanel.startingDP,
      dpRegenRate: this.configPanel.dpRegenRate,
      dpCap: this.configPanel.dpCap,
      deploymentLimit: this.configPanel.deploymentLimit,
      lives: this.configPanel.lives,
    }
  }

  private setStatus(msg: string): void { this.statusText.setText(msg) }
}

enum EditMode { Paint, Erase }

function drawBgGradient(scene: Phaser.Scene): void {
  const g = scene.add.graphics()
  const { width: w, height: h } = scene.scale
  for (let y = 0; y < h; y++) {
    const t = y / h
    const r = Phaser.Math.Interpolation.Linear([0x1a, 0x1a], t)
    const gv = Phaser.Math.Interpolation.Linear([0x1a, 0x1a], t)
    const b = Phaser.Math.Interpolation.Linear([0x2e, 0x2e], t)
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
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  padding: 10px;
  font-family: "Share Tech Mono", "Roboto Mono", monospace;
  font-size: 13px;
  color: #cccccc;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
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
.ef-row:hover { background: #2a2a4e; border-radius: 3px; }
.ef-label { color: #8888aa; }
.ef-value { 
  color: #cccccc; font-weight: bold; cursor: pointer;
  padding: 1px 4px; border-radius: 3px;
}
.ef-value:hover { background: #2a3a5e; color: #00a2ff; }
.ef-input {
  width: 60px; text-align: right;
  font-family: "Share Tech Mono", "Roboto Mono", monospace;
  font-size: 12px; font-weight: bold;
  border: 1px solid #2a2a4e; border-radius: 3px; padding: 1px 4px;
  background: #1a1a2e; color: #cccccc;
}
.ef-input:focus { outline: 1px solid #00a2ff; border-color: #00a2ff; }
.ef-del { color: #d32f2f; cursor: pointer; padding: 0 2px; }
.ef-del:hover { background: #3a1a1a; border-radius: 3px; }
.ef-add { color: #00c853; cursor: pointer; margin-top: 4px; display: inline-block; }
.ef-add:hover { background: #1a3a2a; border-radius: 3px; padding: 0 2px; }
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
  margin: 4px 0; padding: 4px; border: 1px solid #2a2a4e; border-radius: 4px;
  background: #16162a;
}
.ef-entry { margin: 2px 0 2px 8px; font-size: 12px; }
.route-item {
  display: flex; align-items: center; padding: 4px; cursor: pointer; border-radius: 3px;
}
.route-item:hover { background: #2a2a4e; }
.route-item.selected { background: #2a3a5e; }
.route-swatch { width: 16px; height: 16px; border-radius: 3px; margin-right: 8px; display: inline-block; }
`
  document.head.appendChild(s)
}

class ConfigPanel {
  private scene: Phaser.Scene
  private x: number; private y: number; private w: number
  private domEl: Phaser.GameObjects.DOMElement | null = null
  name: string = 'level-01'
  startingDP: number = 30
  dpRegenRate: number = 1
  dpCap: number = 99
  deploymentLimit: number = 8
  lives: number = 10

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
  private routes: Route[] = []

  constructor(scene: Phaser.Scene, x: number, y: number, w: number) {
    this.scene = scene; this.x = x; this.y = y; this.w = w
    this.draw()
  }

  setRoutes(routes: Route[]): void {
    this.routes = routes
    this.draw()
  }

  load(waves: Wave[]): void {
    this.waves = waves.map(w => ({
      routeIndex: w.routeIndex ?? 0,
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
        const routeOpts = this.routes.map((r, ri) =>
          `<option value="${ri}" ${ri === wave.routeIndex ? 'selected' : ''}>Route ${ri + 1}</option>`
        ).join('')

        content += `<div class="ef-wave">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:bold;color:#cccccc;">Wave ${wi + 1}</span>
            <select class="route-select" data-wi="${wi}" style="font-family:inherit;font-size:11px;background:#1a1a2e;color:#ccc;border:1px solid #2a2a4e;border-radius:3px;padding:1px 4px;">
              ${routeOpts}
            </select>
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
        this.waves.push({ routeIndex: 0, preludeDuration: 0, entries: [{ enemyType: 'soldier', count: 3, spawnInterval: 2.0 }] })
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

    d.querySelectorAll('.route-select').forEach(el => {
      el.addEventListener('change', (e) => {
        const wi = parseInt((el as HTMLElement).dataset.wi || '0', 10)
        this.waves[wi].routeIndex = parseInt((e.target as HTMLSelectElement).value, 10)
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
