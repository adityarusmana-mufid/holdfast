export interface LevelCompletion {
  stars: number
  enemiesDefeated: number
}

interface SaveData {
  levelCompletions: Record<string, LevelCompletion>
  squads: Record<string, (string | null)[]>
  squadSkills: Record<string, Record<number, string>>
}

const SAVE_KEY = 'holdfast_save'

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        levelCompletions: parsed.levelCompletions ?? {},
        squads: parsed.squads ?? {},
        squadSkills: parsed.squadSkills ?? {},
      }
    }
  } catch { /* ignore */ }
  return { levelCompletions: {}, squads: {}, squadSkills: {} }
}

export function saveCompletion(levelId: string, stars: number, enemiesDefeated: number): void {
  const data = loadSave()
  data.levelCompletions[levelId] = { stars, enemiesDefeated }
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function isDevMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1'
}

export function isLevelUnlocked(levelId: string, levelOrder: string[]): boolean {
  if (isDevMode()) return true
  const data = loadSave()
  if (levelOrder.length === 0) return false
  if (levelOrder[0] === levelId) return true
  const idx = levelOrder.indexOf(levelId)
  if (idx <= 0) return false
  const prevLevel = levelOrder[idx - 1]
  return !!data.levelCompletions[prevLevel]
}

export function getCompletion(levelId: string): LevelCompletion | undefined {
  return loadSave().levelCompletions[levelId]
}

export function saveSquad(levelId: string, slotIds: (string | null)[]): void {
  const data = loadSave()
  data.squads[levelId] = slotIds
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function loadSquad(levelId: string): (string | null)[] | undefined {
  return loadSave().squads[levelId]
}

export function savePickedSkills(levelId: string, skills: Record<number, string>): void {
  const data = loadSave()
  data.squadSkills[levelId] = skills
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function loadPickedSkills(levelId: string): Record<number, string> | undefined {
  return loadSave().squadSkills[levelId]
}

export function resetAllProgress(): void {
  localStorage.removeItem(SAVE_KEY)
}
