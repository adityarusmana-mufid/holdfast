import Phaser from 'phaser'
import { Tile, TileType, LevelData } from '../types/index'
import { tileColor, tileBorderColor, tileLabel, tileTextColor, Position, getNeighbors } from '../shared/utils/GridMath'

export const TILE_SIZE = 64
export const GRID_OFFSET_X = 148
export const GRID_OFFSET_Y = 128

export class Grid {
  private scene: Phaser.Scene
  private tileGraphics: Phaser.GameObjects.Graphics
  private labelTexts: Phaser.GameObjects.Text[]
  private waypointTexts: Phaser.GameObjects.Text[]
  private markerGraphics: Phaser.GameObjects.Graphics
  private spawnMarker: Position | null
  private goalMarker: Position | null
  private waypointGraphics: Phaser.GameObjects.Graphics
  private gridLines: Phaser.GameObjects.Graphics

  cols: number
  rows: number
  tiles: Tile[][]
  routePath: Position[] = []
  disconnectedTiles: Set<string> = new Set()

  constructor(scene: Phaser.Scene, cols: number = 12, rows: number = 8) {
    this.scene = scene
    this.cols = cols
    this.rows = rows
    this.tiles = []
    this.labelTexts = []
    this.waypointTexts = []
    this.spawnMarker = null
    this.goalMarker = null

    this.tileGraphics = scene.add.graphics()
    this.markerGraphics = scene.add.graphics()
    this.waypointGraphics = scene.add.graphics()
    this.gridLines = scene.add.graphics()

    this.initEmpty(cols, rows)
  }

  private initEmpty(cols: number, rows: number): void {
    this.tiles = []
    for (let r = 0; r < rows; r++) {
      const row: Tile[] = []
      for (let c = 0; c < cols; c++) {
        const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1
        row.push({
          row: r,
          col: c,
          type: isEdge ? TileType.Wall : TileType.Floor,
        })
      }
      this.tiles.push(row)
    }
  }

  getTile(row: number, col: number): Tile | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null
    return this.tiles[row][col]
  }

  setTile(row: number, col: number, type: TileType): void {
    const tile = this.getTile(row, col)
    if (tile) tile.type = type
  }

  setSpawn(pos: Position | null): void {
    this.spawnMarker = pos
  }

  setGoal(pos: Position | null): void {
    this.goalMarker = pos
  }

  getSpawn(): Position | null {
    return this.spawnMarker
  }

  getGoal(): Position | null {
    return this.goalMarker
  }

  tileToPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2,
      y: GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  pixelToTile(x: number, y: number): Position | null {
    const col = Math.floor((x - GRID_OFFSET_X) / TILE_SIZE)
    const row = Math.floor((y - GRID_OFFSET_Y) / TILE_SIZE)
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null
    return { row, col }
  }

  getWaypoints(): Position[] {
    const waypoints: Position[] = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tiles[r][c].type === TileType.Route) {
          waypoints.push({ row: r, col: c })
        }
      }
    }
    return waypoints
  }

  toLevelData(name: string): LevelData {
    const waypoints = this.routePath.length > 0 ? this.routePath : this.getWaypoints()
    return {
      name,
      cols: this.cols,
      rows: this.rows,
      tiles: this.tiles.map(row => row.map(t => ({ ...t }))),
      waypoints,
      waves: [],
      startingDP: 10,
      dpRegenRate: 1,
      dpCap: 99,
      deploymentLimit: 8,
      lives: 3,
    }
  }

  fromLevelData(data: LevelData): void {
    this.cols = data.cols
    this.rows = data.rows
    this.tiles = data.tiles.map(row => row.map(t => ({ ...t })))
    this.routePath = data.waypoints.map(w => ({ ...w }))
    if (data.waypoints.length > 0) {
      this.spawnMarker = data.waypoints[0]
      this.goalMarker = data.waypoints[data.waypoints.length - 1]
    }
  }

  render(): void {
    this.tileGraphics.clear()
    this.markerGraphics.clear()
    this.waypointGraphics.clear()
    this.gridLines.clear()

    this.labelTexts.forEach(t => t.destroy())
    this.labelTexts = []
    this.waypointTexts.forEach(t => t.destroy())
    this.waypointTexts = []

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.tiles[r][c]
        const x = GRID_OFFSET_X + c * TILE_SIZE
        const y = GRID_OFFSET_Y + r * TILE_SIZE

        this.tileGraphics.fillStyle(tileColor(tile.type), 1)
        this.tileGraphics.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)

        this.tileGraphics.lineStyle(1, tileBorderColor(tile.type), 0.6)
        this.tileGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE)

        const label = tileLabel(tile.type)
        if (label) {
          const text = this.scene.add.text(x + TILE_SIZE / 2, y + TILE_SIZE / 2, label, {
            fontSize: '18px',
            color: tileTextColor(tile.type),
            fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
            fontStyle: 'bold',
          })
          text.setOrigin(0.5)
          text.setAlpha(0.5)
          this.labelTexts.push(text)
        }
      }
    }

    for (const key of this.disconnectedTiles) {
      const [r, c] = key.split(',').map(Number)
      const x = GRID_OFFSET_X + c * TILE_SIZE
      const y = GRID_OFFSET_Y + r * TILE_SIZE
      this.tileGraphics.lineStyle(3, 0xd32f2f, 0.7)
      this.tileGraphics.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      this.tileGraphics.fillStyle(0xd32f2f, 0.08)
      this.tileGraphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    }

    this.gridLines.lineStyle(1, 0xe6ecf0, 0.5)
    for (let r = 0; r <= this.rows; r++) {
      const y = GRID_OFFSET_Y + r * TILE_SIZE
      this.gridLines.lineBetween(GRID_OFFSET_X, y, GRID_OFFSET_X + this.cols * TILE_SIZE, y)
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = GRID_OFFSET_X + c * TILE_SIZE
      this.gridLines.lineBetween(x, GRID_OFFSET_Y, x, GRID_OFFSET_Y + this.rows * TILE_SIZE)
    }

    if (this.spawnMarker) {
      const p = this.tileToPixel(this.spawnMarker.row, this.spawnMarker.col)
      this.markerGraphics.fillStyle(0xd32f2f, 0.7)
      this.markerGraphics.fillTriangle(
        p.x, p.y - 20,
        p.x - 16, p.y + 16,
        p.x + 16, p.y + 16,
      )
    }

    if (this.goalMarker) {
      const p = this.tileToPixel(this.goalMarker.row, this.goalMarker.col)
      this.markerGraphics.fillStyle(0x00c853, 0.7)
      this.markerGraphics.fillCircle(p.x, p.y, 14)
    }

    if (this.routePath.length > 1) {
      this.waypointGraphics.lineStyle(3, 0x00a2ff, 0.5)
      this.waypointGraphics.beginPath()
      const start = this.tileToPixel(this.routePath[0].row, this.routePath[0].col)
      this.waypointGraphics.moveTo(start.x, start.y)
      for (let i = 1; i < this.routePath.length; i++) {
        const pt = this.tileToPixel(this.routePath[i].row, this.routePath[i].col)
        this.waypointGraphics.lineTo(pt.x, pt.y)
      }
      this.waypointGraphics.strokePath()
      this.routePath.forEach((wp, i) => {
        const p = this.tileToPixel(wp.row, wp.col)
        const isFirstLast = i === 0 || i === this.routePath.length - 1
        this.waypointGraphics.fillStyle(isFirstLast ? 0x00a2ff : 0x00c853, 0.7)
        this.waypointGraphics.fillCircle(p.x, p.y, 10)
        this.waypointGraphics.fillStyle(0xffffff, 1)
        this.waypointGraphics.fillCircle(p.x, p.y, 7)
        const num = this.scene.add.text(p.x, p.y, `${i + 1}`, {
          fontSize: '10px', color: '#1a1a2e', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold',
        })
        num.setOrigin(0.5)
        num.setDepth(12)
        this.waypointTexts.push(num)
      })
    }
  }

  setRoutePath(path: Position[]): void {
    this.routePath = path
  }

  addWaypoint(pos: Position): void {
    this.routePath.push({ ...pos })
  }

  clearWaypoints(): void {
    this.routePath = []
  }

  getWaypointCount(): number {
    return this.routePath.length
  }

  updateRouteConnectivity(): void {
    this.disconnectedTiles.clear()
    const allRoute: string[] = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tiles[r][c].type === TileType.Route) {
          allRoute.push(`${r},${c}`)
        }
      }
    }
    if (allRoute.length < 2) return

    const routeSet = new Set(allRoute)
    const visited = new Set<string>()
    const queue = [allRoute[0]]
    visited.add(allRoute[0])
    while (queue.length > 0) {
      const current = queue.shift()!
      const [cr, cc] = current.split(',').map(Number)
      const neighbors = getNeighbors({ row: cr, col: cc }, this.rows, this.cols, true)
      for (const n of neighbors) {
        const nk = `${n.row},${n.col}`
        if (visited.has(nk)) continue
        if (!routeSet.has(nk)) continue
        visited.add(nk)
        queue.push(nk)
      }
    }
    for (const key of allRoute) {
      if (!visited.has(key)) {
        this.disconnectedTiles.add(key)
      }
    }
  }

  getDisconnectedTiles(): Set<string> {
    return this.disconnectedTiles
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.routePath = []
    this.initEmpty(cols, rows)
    this.render()
  }

  destroy(): void {
    this.tileGraphics.destroy()
    this.markerGraphics.destroy()
    this.waypointGraphics.destroy()
    this.gridLines.destroy()
    this.labelTexts.forEach(t => t.destroy())
  }
}
