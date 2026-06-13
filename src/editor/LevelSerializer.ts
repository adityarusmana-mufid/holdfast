import { LevelData, Tile, TileType } from '../types/index'

export function serializeLevel(data: LevelData): string {
  return JSON.stringify(data, null, 2)
}

export function deserializeLevel(json: string): LevelData | null {
  try {
    const data = JSON.parse(json) as LevelData
    if (!validateLevel(data)) return null
    return data
  } catch {
    return null
  }
}

function validateLevel(data: LevelData): boolean {
  if (!data.name || typeof data.name !== 'string') return false
  if (!Number.isInteger(data.cols) || data.cols < 1) return false
  if (!Number.isInteger(data.rows) || data.rows < 1) return false
  if (!Array.isArray(data.tiles) || data.tiles.length !== data.rows) return false
  for (const row of data.tiles) {
    if (!Array.isArray(row) || row.length !== data.cols) return false
    for (const tile of row) {
      if (!tile || typeof tile.row !== 'number' || typeof tile.col !== 'number') return false
      if (!Object.values(TileType).includes(tile.type)) return false
    }
  }
  return true
}

export function exportLevelToFile(data: LevelData): void {
  const json = serializeLevel(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importLevelFromFile(): Promise<LevelData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => {
        const data = deserializeLevel(reader.result as string)
        resolve(data)
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
