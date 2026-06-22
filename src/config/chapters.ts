import { LevelData } from '../types/index'
import { validateLevelData } from '../shared/utils/LevelValidation'
import s01json from '../../levels/0-1.json'
import tr1json from '../../levels/TR-1.json'
import s02json from '../../levels/0-2.json'
import tr2json from '../../levels/TR-2.json'
import s03json from '../../levels/0-3.json'
import tr3json from '../../levels/TR-3.json'
import s04json from '../../levels/0-4.json'
import tr4json from '../../levels/TR-4.json'
import s05json from '../../levels/0-5.json'
import tr5json from '../../levels/TR-5.json'
import s06json from '../../levels/0-6.json'
import tr6json from '../../levels/TR-6.json'
import s07json from '../../levels/0-7.json'
import tr7json from '../../levels/TR-7.json'
import s08json from '../../levels/0-8.json'

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
    tutorial: json.tutorial as boolean | undefined,
    guideText: json.guideText as string | undefined,
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

// Prologue interlacing matches Arknights Episode 00 pattern:
//   0-1 → TR-1 → 0-2 → TR-2 → 0-3 → TR-3 → 0-4 → TR-4
//   → 0-5 → TR-5 → 0-6 → TR-6 → 0-7 → TR-7 → 0-8
export const CHAPTERS: ChapterDef[] = [
  {
    id: 'prologue',
    title: 'Prologue',
    subtitle: 'Tactical Readiness',
    levels: [
      '0-1', 'TR-1',
      '0-2', 'TR-2',
      '0-3', 'TR-3',
      '0-4', 'TR-4',
      '0-5', 'TR-5',
      '0-6', 'TR-6',
      '0-7', 'TR-7',
      '0-8',
    ],
  },
]

const LEVEL_MAP: Record<string, LevelData> = {
  '0-1': jsonToLevelData(s01json as Record<string, unknown>),
  'TR-1': jsonToLevelData(tr1json as Record<string, unknown>),
  '0-2': jsonToLevelData(s02json as Record<string, unknown>),
  'TR-2': jsonToLevelData(tr2json as Record<string, unknown>),
  '0-3': jsonToLevelData(s03json as Record<string, unknown>),
  'TR-3': jsonToLevelData(tr3json as Record<string, unknown>),
  '0-4': jsonToLevelData(s04json as Record<string, unknown>),
  'TR-4': jsonToLevelData(tr4json as Record<string, unknown>),
  '0-5': jsonToLevelData(s05json as Record<string, unknown>),
  'TR-5': jsonToLevelData(tr5json as Record<string, unknown>),
  '0-6': jsonToLevelData(s06json as Record<string, unknown>),
  'TR-6': jsonToLevelData(tr6json as Record<string, unknown>),
  '0-7': jsonToLevelData(s07json as Record<string, unknown>),
  'TR-7': jsonToLevelData(tr7json as Record<string, unknown>),
  '0-8': jsonToLevelData(s08json as Record<string, unknown>),
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
