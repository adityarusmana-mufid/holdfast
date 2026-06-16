import Phaser from 'phaser'
import { Tile, TileType, LevelData, Route, Position } from '../types/index'
import { tileColor, tileBorderColor, tileLabel, tileTextColor, ROUTE_COLORS } from '../shared/utils/GridMath'

export const TILE_SIZE = 64
export const GRID_OFFSET_X = 148
export const GRID_OFFSET_Y = 128

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

  cols: number
  rows: number
  tiles: Tile[][]

  constructor(scene: Phaser.Scene, cols: number = 12, rows: number = 8) {
    this.scene = scene
    this.cols = cols
    this.rows = rows
    this.tiles = []
    this.labelTexts = []

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

    this.gridLines.lineStyle(1, 0x333333, 0.3)
    for (let r = 0; r <= this.rows; r++) {
      const y = GRID_OFFSET_Y + r * TILE_SIZE
      this.gridLines.lineBetween(GRID_OFFSET_X, y, GRID_OFFSET_X + this.cols * TILE_SIZE, y)
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = GRID_OFFSET_X + c * TILE_SIZE
      this.gridLines.lineBetween(x, GRID_OFFSET_Y, x, GRID_OFFSET_Y + this.rows * TILE_SIZE)
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
