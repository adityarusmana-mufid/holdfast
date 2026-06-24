export interface LevelCompletion {
  stars: number
  enemiesDefeated: number
}

interface SaveData {
  levelCompletions: Record<string, LevelCompletion>
  squads: Record<string, (string | null)[]>
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
      }
    }
  } catch { /* ignore */ }
  return { levelCompletions: {}, squads: {} }
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

export function resetAllProgress(): void {
  localStorage.removeItem(SAVE_KEY)
}
