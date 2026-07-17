import Phaser from 'phaser'
import { Direction } from '../types/index'
import { COLORS, FONTS, FONT_SIZE } from '../ui/Constants'
import { makeNodeButton } from '../ui/Components'

type CellState = 'empty' | 'range' | 'unit'

const CELL_SIZE = 32
const COLORS_CELL = {
  empty: 0x1a1d23,
  emptyStroke: 0x343a46,
  range: 0x00a2ff,
  rangeAlpha: 0.5,
  unit: 0x00a2ff,
  unitAlpha: 1.0,
}

export class RangeEditorScene extends Phaser.Scene {
  private gridSize = 7
  private facing: Direction = 'up'
  private cells: CellState[][] = []
  private cellRects: Phaser.GameObjects.Rectangle[][] = []
  private unitPos: { r: number; c: number } = { r: 3, c: 3 }
  private arrowGfx: Phaser.GameObjects.Graphics | null = null
  private exportText!: Phaser.GameObjects.Text
  private sizeBtns: Phaser.GameObjects.Container[] = []
  private facingBtns: Phaser.GameObjects.Container[] = []

  constructor() {
    super({ key: 'RangeEditorScene' })
  }

  create(): void {
    const W = 1280
    const H = 720

    this.input.mouse?.disableContextMenu()

    this.add.text(W / 2, 30, 'RANGE EDITOR', {
      ...FONTS.h1, color: COLORS.text.primary,
    }).setOrigin(0.5)

    this.add.text(W / 2, 70, 'Left-click = paint range tile. Right-click = move unit tile.',
      { ...FONTS.small, color: COLORS.text.dim }).setOrigin(0.5)

    this.cells = []
    this.cellRects = []
    this.buildGrid()

    makeNodeButton(this, 16, 16, '< BACK', () => this.scene.start('HomeBridgeScene'),
      { w: 72, h: 32, textSize: '11px' })

    this.buildSizeSelector(W - 220, 120)
    this.buildFacingSelector(W - 220, 240)
    this.buildActions(W - 220, 360)

    this.exportText = this.add.text(W / 2, H - 60, '', {
      ...FONTS.small, color: COLORS.text.primary,
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      wordWrap: { width: W - 280 },
      align: 'center',
    }).setOrigin(0.5)

    this.refreshExport()
  }

  private buildGrid(): void {
    const gridW = this.gridSize * CELL_SIZE
    const gridH = this.gridSize * CELL_SIZE
    const ox = 40
    const oy = 120

    const frame = this.add.graphics()
    frame.lineStyle(1, 0x343a46, 0.8)
    frame.strokeRect(ox - 1, oy - 1, gridW + 2, gridH + 2)

    if (this.cells.length === 0) {
      this.cells = Array.from({ length: this.gridSize }, () =>
        Array<CellState>(this.gridSize).fill('empty'))
      this.unitPos = { r: Math.floor(this.gridSize / 2), c: Math.floor(this.gridSize / 2) }
      this.cells[this.unitPos.r][this.unitPos.c] = 'unit'
    }

    for (let r = 0; r < this.gridSize; r++) {
      this.cellRects[r] = []
      for (let c = 0; c < this.gridSize; c++) {
        const rect = this.add.rectangle(
          ox + c * CELL_SIZE + CELL_SIZE / 2,
          oy + r * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE, CELL_SIZE,
          this.getCellColor(this.cells[r][c]),
          this.getCellAlpha(this.cells[r][c]),
        )
        rect.setStrokeStyle(1, COLORS_CELL.emptyStroke, 0.6)
        rect.setInteractive(new Phaser.Geom.Rectangle(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE),
          Phaser.Geom.Rectangle.Contains)
        if (rect.input) rect.input.cursor = 'pointer'

        const row = r
        const col = c
        rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.button === 2) {
            this.moveUnit(row, col)
          } else {
            this.onCellClick(row, col)
          }
        })

        this.cellRects[r][c] = rect
      }
    }

    this.drawFacingArrow(ox, oy)
  }

  private getCellColor(state: CellState): number {
    if (state === 'range') return COLORS_CELL.range
    if (state === 'unit') return COLORS_CELL.unit
    return COLORS_CELL.empty
  }

  private getCellAlpha(state: CellState): number {
    if (state === 'range') return COLORS_CELL.rangeAlpha
    if (state === 'unit') return COLORS_CELL.unitAlpha
    return 1.0
  }

  private drawFacingArrow(gridOx: number, gridOy: number): void {
    if (this.arrowGfx) {
      this.arrowGfx.destroy()
      this.arrowGfx = null
    }
    const cx = gridOx + this.unitPos.c * CELL_SIZE + CELL_SIZE / 2
    const cy = gridOy + this.unitPos.r * CELL_SIZE + CELL_SIZE / 2
    const arrow = this.add.graphics()
    arrow.setDepth(15)
    arrow.lineStyle(3, 0xff9100, 0.95)
    const dirMap: Record<Direction, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    }
    const [dx, dy] = dirMap[this.facing]
    const len = CELL_SIZE * 0.7
    arrow.beginPath()
    arrow.moveTo(cx, cy)
    arrow.lineTo(cx + dx * len, cy + dy * len)
    arrow.strokePath()
    this.arrowGfx = arrow
  }

  private setFacing(dir: Direction): void {
    this.facing = dir
    this.drawFacingArrow(40, 120)
  }

  private onCellClick(r: number, c: number): void {
    if (this.cells[r][c] === 'unit') return
    if (this.cells[r][c] === 'range') {
      this.cells[r][c] = 'empty'
    } else {
      this.cells[r][c] = 'range'
    }
    this.refreshCell(r, c)
    this.refreshExport()
  }

  private moveUnit(r: number, c: number): void {
    if (this.cells[r][c] === 'unit') return
    const oldR = this.unitPos.r
    const oldC = this.unitPos.c
    this.cells[oldR][oldC] = 'empty'
    this.cells[r][c] = 'unit'
    this.unitPos = { r, c }
    this.refreshCell(oldR, oldC)
    this.refreshCell(r, c)
    this.drawFacingArrow(40, 120)
    this.refreshExport()
  }

  private refreshCell(r: number, c: number): void {
    const rect = this.cellRects[r][c]
    rect.setFillStyle(this.getCellColor(this.cells[r][c]), this.getCellAlpha(this.cells[r][c]))
  }

  private refreshAllCells(): void {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        this.refreshCell(r, c)
      }
    }
  }

  private buildSizeSelector(x: number, y: number): void {
    this.add.text(x, y - 24, 'GRID SIZE', {
      ...FONTS.h4, color: COLORS.text.dim,
    })
    this.sizeBtns = []
    ;[5, 7, 9, 11].forEach((size, i) => {
      const btn = makeNodeButton(this, x + i * 56, y, `${size}x${size}`, () => {
        this.gridSize = size
        this.resetGrid()
      }, { w: 52, h: 32, textSize: '11px' })
      this.sizeBtns.push(btn)
    })
  }

  private buildFacingSelector(x: number, y: number): void {
    this.add.text(x, y - 24, 'FACING', {
      ...FONTS.h4, color: COLORS.text.dim,
    })
    const dirs: Direction[] = ['up', 'down', 'left', 'right']
    const labels: Record<Direction, string> = {
      up: 'UP ↑', down: 'DOWN ↓', left: 'LEFT ←', right: 'RIGHT →',
    }
    this.facingBtns = []
    dirs.forEach((dir, i) => {
      const btn = makeNodeButton(this, x + i * 56, y, labels[dir], () => {
        this.setFacing(dir)
      }, { w: 52, h: 32, textSize: '10px' })
      this.facingBtns.push(btn)
    })
  }

  private buildActions(x: number, y: number): void {
    this.add.text(x, y - 24, 'ACTIONS', {
      ...FONTS.h4, color: COLORS.text.dim,
    })
    makeNodeButton(this, x, y, 'CLEAR', () => {
      this.cells = Array.from({ length: this.gridSize }, () =>
        Array<CellState>(this.gridSize).fill('empty'))
      this.unitPos = { r: Math.floor(this.gridSize / 2), c: Math.floor(this.gridSize / 2) }
      this.cells[this.unitPos.r][this.unitPos.c] = 'unit'
      this.refreshAllCells()
      this.refreshExport()
    }, { w: 100, h: 32, textSize: '11px', role: 'danger' })

    makeNodeButton(this, x, y + 40, 'COPY JSON', () => {
      const json = this.exportPattern()
      navigator.clipboard.writeText(json).then(() => {
        this.exportText.setColor('#00c853')
        this.exportText.setText(`Copied to clipboard!\n${json}`)
      }).catch(() => {
        this.exportText.setColor('#ff9100')
        this.exportText.setText(`Clipboard blocked. JSON below:\n${json}`)
      })
    }, { w: 100, h: 32, textSize: '11px', role: 'primary' })
  }

  private resetGrid(): void {
    this.scene.restart()
  }

  private exportPattern(): string {
    const ur = this.unitPos.r - Math.floor(this.gridSize / 2)
    const uc = this.unitPos.c - Math.floor(this.gridSize / 2)
    const tiles: number[][] = []
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.cells[r][c] === 'range') {
          tiles.push([r - Math.floor(this.gridSize / 2), c - Math.floor(this.gridSize / 2)])
        }
      }
    }
    tiles.push([ur, uc])
    tiles.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    return JSON.stringify(tiles)
  }

  private refreshExport(): void {
    this.exportText.setColor(COLORS.text.primary)
    this.exportText.setText(this.exportPattern())
  }
}