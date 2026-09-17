import { describe, expect, it } from 'vitest'
import { ENEMY_CONFIGS } from './enemies'
import { CHAPTERS, DRAFT_LEVEL_IDS, getLevelData } from './chapters'
import { validateLevelData } from '../shared/utils/LevelValidation'

const levelModules = import.meta.glob('../../levels/*.json', { eager: true })

function levelIdFromPath(path: string): string {
  const filename = path.split('/').pop()
  if (!filename) throw new Error(`Could not read level filename from ${path}`)
  return filename.replace(/\.json$/, '')
}

describe('campaign level data', () => {
  const registeredIds = CHAPTERS.flatMap(chapter => chapter.levels)
  const levelFileIds = Object.keys(levelModules).map(levelIdFromPath)

  it('uses each registered level exactly once', () => {
    expect(new Set(registeredIds).size).toBe(registeredIds.length)
  })

  it('loads and validates every registered level', () => {
    for (const levelId of registeredIds) {
      const level = getLevelData(levelId)
      expect(level, `${levelId} should be registered in LEVEL_MAP`).toBeDefined()
      expect(validateLevelData(level!), `${levelId} should have valid campaign data`).toEqual([])
    }
  })

  it('uses only configured enemy IDs', () => {
    const knownEnemyIds = new Set(ENEMY_CONFIGS.map(enemy => enemy.id))

    for (const levelId of registeredIds) {
      const level = getLevelData(levelId)!
      for (const wave of level.waves) {
        for (const entry of wave.entries) {
          expect(knownEnemyIds, `${levelId} uses ${entry.enemyType}`).toContain(entry.enemyType)
        }
      }
    }
  })

  it('accounts for every level JSON as registered or explicitly draft', () => {
    const accountedFor = new Set([...registeredIds, ...DRAFT_LEVEL_IDS])

    expect(new Set(levelFileIds)).toEqual(accountedFor)
  })
})
