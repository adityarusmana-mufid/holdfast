import { LevelData } from '../types/index'
import { validateLevelData } from '../shared/utils/LevelValidation'
import tr1json from '../../levels/TR-1.json'
import s01json from '../../levels/0-1.json'
import tr2json from '../../levels/TR-2.json'
import s02json from '../../levels/0-2.json'
import s03json from '../../levels/0-3.json'
import s04json from '../../levels/0-4.json'
import s05json from '../../levels/0-5.json'
import s06json from '../../levels/0-6.json'
import tr3json from '../../levels/TR-3.json'
import tr4json from '../../levels/TR-4.json'
import tr5json from '../../levels/TR-5.json'
import tr6json from '../../levels/TR-6.json'
import tr7json from '../../levels/TR-7.json'
import ch11json from '../../levels/1-1.json'
import ch12json from '../../levels/1-2.json'
import ch13json from '../../levels/1-3.json'
import ch14json from '../../levels/1-4.json'
import ch15json from '../../levels/1-5.json'
import ch16json from '../../levels/1-6.json'
import tr8json from '../../levels/TR-8.json'
import tr9json from '../../levels/TR-9.json'
import tr10json from '../../levels/TR-10.json'
import ch21json from '../../levels/2-1.json'
import ch22json from '../../levels/2-2.json'
import ch23json from '../../levels/2-3.json'
import ch24json from '../../levels/2-4.json'
import c25json from '../../levels/2-5.json'
import tr11json from '../../levels/TR-11.json'
import tr12json from '../../levels/TR-12.json'
import tr13json from '../../levels/TR-13.json'
import tr14json from '../../levels/TR-14.json'
import c31json from '../../levels/3-1.json'
import c32json from '../../levels/3-2.json'
import c33json from '../../levels/3-3.json'
import c34json from '../../levels/3-4.json'
import c35json from '../../levels/3-5.json'
import c36json from '../../levels/3-6.json'
import c37json from '../../levels/3-7.json'
import tr15json from '../../levels/TR-15.json'
import c41json from '../../levels/4-1.json'
import c42json from '../../levels/4-2.json'
import c43json from '../../levels/4-3.json'
import c44json from '../../levels/4-4.json'
import c45json from '../../levels/4-5.json'
import c46json from '../../levels/4-6.json'
import c47json from '../../levels/4-7.json'

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
    guideText: (json.guideText as string[] | undefined)?.filter(s => typeof s === 'string'),
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
  nodePositions: { x: number; y: number }[]
}

/**
 * Level JSON files that are intentionally kept out of the player campaign
 * while they are being authored or balanced. The campaign-data test requires
 * every other JSON level file to be registered in a chapter.
 */
export const DRAFT_LEVEL_IDS = ['3-8', '4-8', '4-9'] as const

function makePositions(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => ({
    x: 40 + i * 160,
    y: i % 2 === 0 ? 0 : -30,
  }))
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'chapter_0',
    title: 'Chapter 0',
    subtitle: 'Tactical Readiness',
    levels: ['TR-1', '0-1', 'TR-2', '0-2', '0-3', 'TR-3', '0-4', 'TR-4', '0-5', '0-6', 'TR-5', 'TR-6', 'TR-7'],
    nodePositions: makePositions(13),
  },
  {
    id: 'chapter_1',
    title: 'Chapter 1',
    subtitle: 'Logistics & Airspace',
    levels: ['1-1', '1-2', 'TR-8', '1-3', '1-4', 'TR-9', '1-5', '1-6', 'TR-10'],
    nodePositions: makePositions(9),
  },
  {
    id: 'chapter_2',
    title: 'Chapter 2',
    subtitle: 'Heavy Ordnance',
    levels: ['2-1', 'TR-11', '2-2', '2-3', 'TR-12', '2-4', '2-5', 'TR-13', 'TR-14'],
    nodePositions: makePositions(9),
  },
  {
    id: 'chapter_3',
    title: 'Chapter 3',
    subtitle: 'Advanced Tactics',
    levels: ['TR-15', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7'],
    nodePositions: makePositions(8),
  },
  {
    id: 'chapter_4',
    title: 'Chapter 4',
    subtitle: 'Medical Reinforcement',
    levels: ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7'],
    nodePositions: makePositions(7),
  },
]

const LEVEL_MAP: Record<string, LevelData> = {
  'TR-1': jsonToLevelData(tr1json as Record<string, unknown>),
  '0-1': jsonToLevelData(s01json as Record<string, unknown>),
  'TR-2': jsonToLevelData(tr2json as Record<string, unknown>),
  '0-2': jsonToLevelData(s02json as Record<string, unknown>),
  '0-3': jsonToLevelData(s03json as Record<string, unknown>),
  '0-4': jsonToLevelData(s04json as Record<string, unknown>),
  '0-5': jsonToLevelData(s05json as Record<string, unknown>),
  '0-6': jsonToLevelData(s06json as Record<string, unknown>),
  'TR-3': jsonToLevelData(tr3json as Record<string, unknown>),
  'TR-4': jsonToLevelData(tr4json as Record<string, unknown>),
  'TR-5': jsonToLevelData(tr5json as Record<string, unknown>),
  'TR-6': jsonToLevelData(tr6json as Record<string, unknown>),
  'TR-7': jsonToLevelData(tr7json as Record<string, unknown>),
  '1-1': jsonToLevelData(ch11json as Record<string, unknown>),
  '1-2': jsonToLevelData(ch12json as Record<string, unknown>),
  '1-3': jsonToLevelData(ch13json as Record<string, unknown>),
  '1-4': jsonToLevelData(ch14json as Record<string, unknown>),
  '1-5': jsonToLevelData(ch15json as Record<string, unknown>),
  '1-6': jsonToLevelData(ch16json as Record<string, unknown>),
  'TR-8': jsonToLevelData(tr8json as Record<string, unknown>),
  'TR-9': jsonToLevelData(tr9json as Record<string, unknown>),
  'TR-10': jsonToLevelData(tr10json as Record<string, unknown>),
  '2-1': jsonToLevelData(ch21json as Record<string, unknown>),
  '2-2': jsonToLevelData(ch22json as Record<string, unknown>),
  '2-3': jsonToLevelData(ch23json as Record<string, unknown>),
  '2-4': jsonToLevelData(ch24json as Record<string, unknown>),
  '2-5': jsonToLevelData(c25json as Record<string, unknown>),
  'TR-11': jsonToLevelData(tr11json as Record<string, unknown>),
  'TR-12': jsonToLevelData(tr12json as Record<string, unknown>),
  'TR-13': jsonToLevelData(tr13json as Record<string, unknown>),
  'TR-14': jsonToLevelData(tr14json as Record<string, unknown>),
  '3-1': jsonToLevelData(c31json as Record<string, unknown>),
  '3-2': jsonToLevelData(c32json as Record<string, unknown>),
  '3-3': jsonToLevelData(c33json as Record<string, unknown>),
  '3-4': jsonToLevelData(c34json as Record<string, unknown>),
  '3-5': jsonToLevelData(c35json as Record<string, unknown>),
  '3-6': jsonToLevelData(c36json as Record<string, unknown>),
  '3-7': jsonToLevelData(c37json as Record<string, unknown>),
  'TR-15': jsonToLevelData(tr15json as Record<string, unknown>),
  '4-1': jsonToLevelData(c41json as Record<string, unknown>),
  '4-2': jsonToLevelData(c42json as Record<string, unknown>),
  '4-3': jsonToLevelData(c43json as Record<string, unknown>),
  '4-4': jsonToLevelData(c44json as Record<string, unknown>),
  '4-5': jsonToLevelData(c45json as Record<string, unknown>),
  '4-6': jsonToLevelData(c46json as Record<string, unknown>),
  '4-7': jsonToLevelData(c47json as Record<string, unknown>),
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
