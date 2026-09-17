export interface LevelCompletion {
  stars: number
  enemiesDefeated: number
}

interface SaveData {
  levelCompletions: Record<string, LevelCompletion>
  squads: Record<string, (string | null)[]>
  squadSkills: Record<string, Record<number, string>>
  presets: Record<string, (string | null)[]>
  presetSkills: Record<string, Record<number, string>>
  presetNames: Record<number, string>
  activePreset: number
}

const SAVE_KEY = 'holdfast_save'

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const data: SaveData = {
        levelCompletions: parsed.levelCompletions ?? {},
        squads: parsed.squads ?? {},
        squadSkills: parsed.squadSkills ?? {},
        presets: {},
        presetSkills: {},
        presetNames: { 0: 'Preset 1', 1: 'Preset 2', 2: 'Preset 3', 3: 'Preset 4' },
        activePreset: 0,
      }
      if (!parsed.presets && parsed.squads?.['menu_squad']) {
        data.presets['preset_0'] = parsed.squads['menu_squad']
        if (parsed.squadSkills?.['menu_squad']) {
          data.presetSkills['preset_0'] = parsed.squadSkills['menu_squad']
        }
      }
      for (let i = 0; i < 4; i++) {
        const key = `preset_${i}`
        data.presets[key] = parsed.presets?.[key] ?? new Array(12).fill(null)
        data.presetSkills[key] = parsed.presetSkills?.[key] ?? {}
      }
      if (parsed.presetNames) data.presetNames = parsed.presetNames
      if (typeof parsed.activePreset === 'number') data.activePreset = parsed.activePreset
      return data
    }
  } catch { /* ignore */ }
  return {
    levelCompletions: {}, squads: {}, squadSkills: {},
    presets: { preset_0: new Array(12).fill(null), preset_1: new Array(12).fill(null), preset_2: new Array(12).fill(null), preset_3: new Array(12).fill(null) },
    presetSkills: { preset_0: {}, preset_1: {}, preset_2: {}, preset_3: {} },
    presetNames: { 0: 'Preset 1', 1: 'Preset 2', 2: 'Preset 3', 3: 'Preset 4' },
    activePreset: 0,
  }
}

function persist(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function saveCompletion(levelId: string, stars: number, enemiesDefeated: number): void {
  const data = loadSave()
  data.levelCompletions[levelId] = { stars, enemiesDefeated }
  persist(data)
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

export function savePreset(index: number, slotIds: (string | null)[]): void {
  const data = loadSave()
  data.presets[`preset_${index}`] = slotIds
  persist(data)
}

export function loadPreset(index: number): (string | null)[] {
  return loadSave().presets[`preset_${index}`] ?? new Array(12).fill(null)
}

export function savePresetSkills(index: number, skills: Record<number, string>): void {
  const data = loadSave()
  data.presetSkills[`preset_${index}`] = skills
  persist(data)
}

export function loadPresetSkills(index: number): Record<number, string> {
  return loadSave().presetSkills[`preset_${index}`] ?? {}
}

export function setActivePreset(index: number): void {
  const data = loadSave()
  data.activePreset = index
  persist(data)
}

export function getActivePreset(): number {
  return loadSave().activePreset ?? 0
}

export function setPresetName(index: number, name: string): void {
  const data = loadSave()
  data.presetNames[index] = name
  persist(data)
}

export function getPresetName(index: number): string {
  return loadSave().presetNames?.[index] ?? `Preset ${index + 1}`
}

export function resetAllProgress(): void {
  localStorage.removeItem(SAVE_KEY)
}
