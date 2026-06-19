import { LevelData } from '../types/index'
import { validateLevelData } from '../shared/utils/LevelValidation'
import level01json from '../../levels/level-01.json'
import level02json from '../../levels/level-02.json'
import level03json from '../../levels/level-03.json'
import level04json from '../../levels/level-04.json'
import level05json from '../../levels/level-05.json'

function jsonToLevelData(json: Record<string, unknown>): LevelData {
  const waypoints = json.waypoints as { row: number; col: number }[]
  const data: LevelData = {
    name: json.name as string,
    cols: json.cols as number,
    rows: json.rows as number,
    tiles: json.tiles as LevelData['tiles'],
    routes: [{
      color: 0x4fc3f7,
      spawn: waypoints[0],
      goal: waypoints[waypoints.length - 1],
      waypoints,
    }],
    waves: (json.waves as LevelData['waves']).map(w => ({
      ...w,
      routeIndex: w.routeIndex ?? 0,
    })),
    startingDP: json.startingDP as number,
    dpRegenRate: json.dpRegenRate as number,
    dpCap: json.dpCap as number,
    deploymentLimit: json.deploymentLimit as number,
    lives: json.lives as number,
  }
  const errors = validateLevelData(data)
  if (errors.length > 0) {
    console.error(`Level "${data.name}" validation failed:`, errors)
  }
  return data
}

export interface ChapterDef {
  id: string
  title: string
  subtitle: string
  levels: string[]
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'chapter-1',
    title: 'Chapter 1',
    subtitle: 'Signal Intercept',
    levels: ['1-1', '1-2', '1-3', '1-4', '1-5'],
  },
]

const LEVEL_MAP: Record<string, LevelData> = {
  '1-1': jsonToLevelData(level01json as Record<string, unknown>),
  '1-2': jsonToLevelData(level02json as Record<string, unknown>),
  '1-3': jsonToLevelData(level03json as Record<string, unknown>),
  '1-4': jsonToLevelData(level04json as Record<string, unknown>),
  '1-5': jsonToLevelData(level05json as Record<string, unknown>),
}

export function getLevelData(levelId: string): LevelData | undefined {
  return LEVEL_MAP[levelId]
}

export function getLevelIdsForChapter(chapterId: string): string[] {
  const ch = CHAPTERS.find(c => c.id === chapterId)
  return ch ? ch.levels : []
}

export function getLevelDef(levelId: string): { id: string; name: string; chapterId: string } | undefined {
  for (const ch of CHAPTERS) {
    if (ch.levels.includes(levelId)) {
      const data = LEVEL_MAP[levelId]
      return { id: levelId, name: data?.name ?? levelId, chapterId: ch.id }
    }
  }
  return undefined
}

export function getNextLevelId(levelId: string): string | undefined {
  for (const ch of CHAPTERS) {
    const idx = ch.levels.indexOf(levelId)
    if (idx !== -1 && idx < ch.levels.length - 1) {
      return ch.levels[idx + 1]
    }
  }
  return undefined
}
