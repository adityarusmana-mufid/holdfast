import Phaser from 'phaser'
import { Tile, TileType, LevelData, Route, Position } from '../types/index'
import { tileColor, tileBorderColor, tileLabel, tileTextColor, ROUTE_COLORS } from '../shared/utils/GridMath'

export const TILE_SIZE = 64
export const GRID_OFFSET_X = 148
export const GRID_OFFSET_Y = 128
const ROW_INSET = 6

function migrateTileTypeStatic(type: string): TileType {
  switch (type) {
    case 'deploy_ground': return TileType.Ground
    case 'deploy_ranged': return TileType.Ranged
    case 'route': return TileType.Ground
    case 'spawn': return TileType.Spawn
    case 'goal': return TileType.Goal
    default: return type as TileType
  }
}

export class Grid {
  private scene: Phaser.Scene
  private tileGraphics: Phaser.GameObjects.Graphics
  private labelTexts: Phaser.GameObjects.Text[]
  private gridLines: Phaser.GameObjects.Graphics
  offsetX: number
  offsetY: number

  cols: number
  rows: number
  tiles: Tile[][]

  constructor(scene: Phaser.Scene, cols: number = 12, rows: number = 8, offsetX: number = GRID_OFFSET_X, offsetY: number = GRID_OFFSET_Y) {
    this.scene = scene
    this.cols = cols
    this.rows = rows
    this.tiles = []
    this.labelTexts = []
    this.offsetX = offsetX
    this.offsetY = offsetY

    this.tileGraphics = scene.add.graphics()
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
          type: isEdge ? TileType.Wall : TileType.Ground,
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

  private rowLeftX(row: number): number {
    return this.offsetX + ROW_INSET * (this.rows - row)
  }

  private rowRightX(row: number): number {
    return this.offsetX + this.cols * TILE_SIZE - ROW_INSET * (this.rows - row)
  }

  private tileLeftX(row: number, col: number): number {
    const left = this.rowLeftX(row)
    const right = this.rowRightX(row)
    return Phaser.Math.Linear(left, right, col / this.cols)
  }

  private tileRightX(row: number, col: number): number {
    return this.tileLeftX(row, col + 1)
  }

  getTileCenter(row: number, col: number): { x: number; y: number } {
    const topX = Phaser.Math.Linear(this.tileLeftX(row, col), this.tileRightX(row, col), 0.5)
    const bottomX = Phaser.Math.Linear(this.tileLeftX(row + 1, col), this.tileRightX(row + 1, col), 0.5)
    return {
      x: Phaser.Math.Linear(topX, bottomX, 0.5),
      y: this.offsetY + row * TILE_SIZE + TILE_SIZE / 2,
    }
  }

  getTileCorners(row: number, col: number): { tL: { x: number; y: number }; tR: { x: number; y: number }; bR: { x: number; y: number }; bL: { x: number; y: number } } {
    const y0 = this.offsetY + row * TILE_SIZE
    const y1 = this.offsetY + (row + 1) * TILE_SIZE
    return {
      tL: { x: this.tileLeftX(row, col) + 1, y: y0 + 1 },
      tR: { x: this.tileRightX(row, col) - 1, y: y0 + 1 },
      bR: { x: this.tileRightX(row + 1, col) - 1, y: y1 - 1 },
      bL: { x: this.tileLeftX(row + 1, col) + 1, y: y1 - 1 },
    }
  }

  tileToPixel(row: number, col: number): { x: number; y: number } {
    return this.getTileCenter(row, col)
  }

  pixelToTile(x: number, y: number): Position | null {
    const row = Math.floor((y - this.offsetY) / TILE_SIZE)
    if (row < 0 || row >= this.rows) return null
    const left = this.rowLeftX(row)
    const right = this.rowRightX(row)
    const colWidth = (right - left) / this.cols
    const col = Math.floor((x - left) / colWidth)
    if (col < 0 || col >= this.cols) return null
    return { row, col }
  }

  toLevelData(name: string): LevelData {
    return {
      name,
      cols: this.cols,
      rows: this.rows,
      tiles: this.tiles.map(row => row.map(t => ({ ...t }))),
      routes: [],
      waves: [],
      startingDP: 30,
      dpRegenRate: 1,
      dpCap: 99,
      deploymentLimit: 8,
      lives: 10,
    }
  }

  fromLevelData(data: LevelData): void {
    this.cols = data.cols
    this.rows = data.rows
    this.tiles = data.tiles.map((row, r) =>
      row.map((tile, c) => ({
        row: r,
        col: c,
        type: migrateTileTypeStatic(tile.type),
      }))
    )
  }

  static migrateLevelData(data: any): LevelData {
    const tiles: Tile[][] = data.tiles.map((row: any[], r: number) =>
      row.map((tile: any, c: number) => ({
        row: r, col: c,
        type: migrateTileTypeStatic(tile.type),
      }))
    )

    let spawnPos: Position = { row: 0, col: 0 }
    let goalPos: Position = { row: 0, col: 0 }
    for (const row of tiles) {
      for (const tile of row) {
        if (tile.type === TileType.Spawn) spawnPos = { row: tile.row, col: tile.col }
        if (tile.type === TileType.Goal) goalPos = { row: tile.row, col: tile.col }
      }
    }

    const oldWaypoints: any[] = data.waypoints || []
    if (oldWaypoints.length > 0 && !tiles.some(r => r.some(t => t.type === TileType.Spawn))) {
      spawnPos = { row: oldWaypoints[0].row, col: oldWaypoints[0].col }
    }
    if (oldWaypoints.length > 0 && !tiles.some(r => r.some(t => t.type === TileType.Goal))) {
      goalPos = { row: oldWaypoints[oldWaypoints.length - 1].row, col: oldWaypoints[oldWaypoints.length - 1].col }
    }

    const route: Route = {
      color: ROUTE_COLORS[0],
      spawn: spawnPos,
      goal: goalPos,
      waypoints: oldWaypoints.slice(1, -1).map((wp: any) => ({ row: wp.row, col: wp.col })),
    }

    return {
      name: data.name || '',
      cols: data.cols || 12,
      rows: data.rows || 8,
      tiles,
      routes: [route],
      waves: (data.waves || []).map((w: any) => ({ ...w, routeIndex: w.routeIndex ?? 0 })),
      startingDP: data.startingDP ?? 30,
      dpRegenRate: data.dpRegenRate ?? 1,
      dpCap: data.dpCap ?? 99,
      deploymentLimit: data.deploymentLimit ?? 8,
      lives: data.lives ?? 10,
    }
  }

  render(): void {
    this.tileGraphics.clear()
    this.gridLines.clear()

    this.labelTexts.forEach(t => t.destroy())
    this.labelTexts = []

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.tiles[r][c]
        const y0 = this.offsetY + r * TILE_SIZE
        const y1 = this.offsetY + (r + 1) * TILE_SIZE

        // Perspective-adjusted tile corners
        const tL = { x: this.tileLeftX(r, c) + 1, y: y0 + 1 }
        const tR = { x: this.tileRightX(r, c) - 1, y: y0 + 1 }
        const bR = { x: this.tileRightX(r + 1, c) - 1, y: y1 - 1 }
        const bL = { x: this.tileLeftX(r + 1, c) + 1, y: y1 - 1 }

        // Tile body fill — elevated tiles adopt color of tile below for platform continuity
        const isElevated = tile.type === TileType.Ranged || tile.type === TileType.Wall
        let tileFillColor = tileColor(tile.type)
        if (isElevated) {
          const below = r + 1 < this.rows ? this.tiles[r + 1]?.[c] : null
          const belowElevated = below && (below.type === TileType.Ranged || below.type === TileType.Wall)
          if (belowElevated) {
            tileFillColor = tileColor(below.type)
          }
        }
        this.tileGraphics.fillStyle(tileFillColor, 1)
        this.tileGraphics.fillPoints([tL, tR, bR, bL], true)

        // Shadow strip on elevated tiles — only if nothing elevated below
        if (isElevated) {
          const below = r + 1 < this.rows ? this.tiles[r + 1]?.[c] : null
          const belowElevated = below && (below.type === TileType.Ranged || below.type === TileType.Wall)
          if (!belowElevated) {
            const shadowColor = tile.type === TileType.Ranged ? 0x8a8e92 : 0x0a0a0a
            this.tileGraphics.fillStyle(shadowColor, 1)
            const sL = this.tileLeftX(r + 1, c)
            const sR = this.tileRightX(r + 1, c)
            this.tileGraphics.fillRect(sL + 1, y1 - 10, sR - sL - 2, 9)
          }
        }

        // Border — follows trapezoid outline
        const borderWidth = tile.type === TileType.Ranged ? 2 : 1
        const borderAlpha = tile.type === TileType.Ranged ? 0.9 : 0.6
        this.tileGraphics.lineStyle(borderWidth, tileBorderColor(tile.type), borderAlpha)
        this.tileGraphics.beginPath()
        this.tileGraphics.moveTo(this.tileLeftX(r, c), y0)
        this.tileGraphics.lineTo(this.tileRightX(r, c), y0)
        this.tileGraphics.lineTo(this.tileRightX(r + 1, c), y1)
        this.tileGraphics.lineTo(this.tileLeftX(r + 1, c), y1)
        this.tileGraphics.closePath()
        this.tileGraphics.strokePath()

        // 3D wireframe cube for spawn/goal
        if (tile.type === TileType.Spawn || tile.type === TileType.Goal) {
          const cubeColor = tile.type === TileType.Spawn ? 0xff8888 : 0x8888ff
          const cubeFill = tile.type === TileType.Spawn ? 0xff6666 : 0x6666ff
          const cubeH = 18
          const inset = 6
          const ctL = { x: tL.x + inset, y: tL.y - cubeH }
          const ctR = { x: tR.x - inset, y: tR.y - cubeH }
          const cbR = { x: bR.x - inset, y: bR.y - cubeH }
          const cbL = { x: bL.x + inset, y: bL.y - cubeH }

          // Diagonal X across the tile face
          this.tileGraphics.lineStyle(1, cubeColor, 0.3)
          this.tileGraphics.lineBetween(tL.x, tL.y, bR.x, bR.y)
          this.tileGraphics.lineBetween(tR.x, tR.y, bL.x, bL.y)

          // Vertical edges
          this.tileGraphics.lineStyle(1, cubeColor, 0.4)
          this.tileGraphics.lineBetween(tL.x, tL.y, ctL.x, ctL.y)
          this.tileGraphics.lineBetween(tR.x, tR.y, ctR.x, ctR.y)
          this.tileGraphics.lineBetween(bR.x, bR.y, cbR.x, cbR.y)
          this.tileGraphics.lineBetween(bL.x, bL.y, cbL.x, cbL.y)

          // Top face fill
          this.tileGraphics.fillStyle(cubeFill, 0.15)
          this.tileGraphics.fillPoints([ctL, ctR, cbR, cbL], true)

          // Top face outline
          this.tileGraphics.lineStyle(2, cubeColor, 0.6)
          this.tileGraphics.beginPath()
          this.tileGraphics.moveTo(ctL.x, ctL.y)
          this.tileGraphics.lineTo(ctR.x, ctR.y)
          this.tileGraphics.lineTo(cbR.x, cbR.y)
          this.tileGraphics.lineTo(cbL.x, cbL.y)
          this.tileGraphics.closePath()
          this.tileGraphics.strokePath()

          // Exclamation triangle on the top face
          const cTopX = Phaser.Math.Linear(ctL.x, ctR.x, 0.5)
          const cBotX = Phaser.Math.Linear(cbL.x, cbR.x, 0.5)
          const cY = Phaser.Math.Linear(ctL.y, cbL.y, 0.5)
          const exclamColor = tile.type === TileType.Spawn ? 0xff8888 : 0x8888ff
          this.tileGraphics.fillStyle(exclamColor, 0.9)
          this.tileGraphics.fillTriangle(cTopX, cY - 8, cTopX - 7, cY + 7, cTopX + 7, cY + 7)
          this.tileGraphics.fillStyle(0xffffff, 1)
          this.tileGraphics.fillRect(cTopX - 2, cY - 3, 4, 7)
          this.tileGraphics.fillRect(cTopX - 2, cY + 4, 4, 3)
        }

        // Repair Node / Armor Grid icons
        if (tile.type === TileType.RepairNode) {
          const cx = Phaser.Math.Linear(tL.x, tR.x, 0.5)
          const cy = (y0 + y1) / 2
          this.tileGraphics.lineStyle(3, 0x44cc55, 0.8)
          this.tileGraphics.lineBetween(cx - 8, cy, cx + 8, cy)
          this.tileGraphics.lineBetween(cx, cy - 8, cx, cy + 8)
        }

        if (tile.type === TileType.ArmorGrid) {
          const cx = Phaser.Math.Linear(tL.x, tR.x, 0.5)
          const cy = (y0 + y1) / 2
          this.tileGraphics.fillStyle(0x4488cc, 0.8)
          this.tileGraphics.fillTriangle(cx, cy - 10, cx - 10, cy + 4, cx + 10, cy + 4)
          this.tileGraphics.lineStyle(2, 0x4488cc, 0.8)
          this.tileGraphics.strokeTriangle(cx, cy - 10, cx - 10, cy + 4, cx + 10, cy + 4)
        }
      }
    }

    // Grid lines — perspective-aware
    this.gridLines.lineStyle(1, 0x333333, 0.3)
    for (let r = 0; r <= this.rows; r++) {
      const y = this.offsetY + r * TILE_SIZE
      this.gridLines.lineBetween(this.rowLeftX(r), y, this.rowRightX(r), y)
    }
    for (let c = 0; c <= this.cols; c++) {
      const x0 = this.tileLeftX(0, c)
      const x1 = this.tileLeftX(this.rows, c)
      this.gridLines.lineBetween(x0, this.offsetY, x1, this.offsetY + this.rows * TILE_SIZE)
    }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.initEmpty(cols, rows)
    this.render()
  }

  destroy(): void {
    this.tileGraphics.destroy()
    this.gridLines.destroy()
    this.labelTexts.forEach(t => t.destroy())
  }
}
