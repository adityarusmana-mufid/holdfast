# Squad Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-stage squad saving with 4 user-switchable presets accessible from SquadScene.

**Architecture:** SaveData stores `presets`, `presetSkills`, `presetNames`, and `activePreset` (0-3). SquadScene loads the active preset on init and shows a bottom bar with 4 preset buttons + rename pencil. Every unit change auto-saves to the active preset.

**Tech Stack:** TypeScript, Phaser 3, localStorage (existing SaveData system)

---

### Task 1: SaveData — preset data model and functions

**Files:**
- Modify: `src/shared/SaveData.ts`

- [ ] **Step 1: Update the SaveData interface**

Change the existing `squads` and `squadSkills` fields to use preset keys. Add `presetNames` and `activePreset`.

```ts
interface SaveData {
  levelCompletions: Record<string, LevelCompletion>
  presets: Record<string, (string | null)[]>      // 'preset_0', 'preset_1', 'preset_2', 'preset_3'
  presetSkills: Record<string, Record<number, string>>
  presetNames: Record<number, string>              // 0-3, defaults 'Preset 1'..'Preset 4'
  activePreset: number                             // 0-3, default 0
}
```

- [ ] **Step 2: Add migration in `loadSaveData()`**

After loading from localStorage, if `squads['menu_squad']` exists and `presets['preset_0']` does not, copy it:

```ts
const migrate = (data: any): SaveData => {
  if (!data.presets && data.squads?.['menu_squad']) {
    data.presets = { 'preset_0': data.squads['menu_squad'] }
    if (data.squadSkills?.['menu_squad']) {
      data.presetSkills = { 'preset_0': data.squadSkills['menu_squad'] }
    }
  }
  // Ensure all 4 presets exist
  for (let i = 0; i < 4; i++) {
    if (!data.presets?.[`preset_${i}`]) data.presets[`preset_${i}`] = new Array(12).fill(null)
    if (!data.presetSkills?.[`preset_${i}`]) data.presetSkills[`preset_${i}`] = {}
  }
  // Ensure preset names
  if (!data.presetNames) {
    data.presetNames = { 0: 'Preset 1', 1: 'Preset 2', 2: 'Preset 3', 3: 'Preset 4' }
  }
  // Ensure active preset
  if (data.activePreset === undefined) data.activePreset = 0
  return data
}
```

- [ ] **Step 3: Add new SaveData functions**

Replace the old squad functions:

```ts
export function savePreset(index: number, slotIds: (string | null)[]): void {
  const data = loadSaveData()
  data.presets[`preset_${index}`] = slotIds
  persist(data)
}

export function loadPreset(index: number): (string | null)[] {
  return loadSaveData().presets[`preset_${index}`] ?? new Array(12).fill(null)
}

export function savePresetSkills(index: number, skills: Record<number, string>): void {
  const data = loadSaveData()
  data.presetSkills[`preset_${index}`] = skills
  persist(data)
}

export function loadPresetSkills(index: number): Record<number, string> {
  return loadSaveData().presetSkills[`preset_${index}`] ?? {}
}

export function setActivePreset(index: number): void {
  const data = loadSaveData()
  data.activePreset = index
  persist(data)
}

export function getActivePreset(): number {
  return loadSaveData().activePreset ?? 0
}

export function setPresetName(index: number, name: string): void {
  const data = loadSaveData()
  data.presetNames[index] = name
  persist(data)
}

export function getPresetName(index: number): string {
  return loadSaveData().presetNames?.[index] ?? `Preset ${index + 1}`
}
```

- [ ] **Step 4: Remove or keep old functions for backward compat**

Keep `saveSquad`/`loadSquad`/`savePickedSkills`/`loadPickedSkills` but deprecate them (mark with comment) — callers in SquadScene will be updated in Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/shared/SaveData.ts
git commit -m "feat(save): add preset data model and migrate menu_squad"
```

---

### Task 2: SquadScene — load active preset on init

**Files:**
- Modify: `src/scenes/SquadScene.ts`

- [ ] **Step 1: Change `init()` to load active preset instead of per-stage squad**

Remove the old squad loading logic (lines ~35-55 that check `loadSquad(levelId)` / `loadSquad('menu')`). Instead:

```ts
init(data: { levelId?: string; chapterId?: string; levelData?: LevelData }): void {
  this.levelId = data.levelId ?? 'menu'
  this.chapterId = data.chapterId ?? ''
  this.levelData = data.levelData ?? null

  const presetIndex = getActivePreset()
  this.activePresetIndex = presetIndex

  const savedIds = loadPreset(presetIndex)
  this.slots = savedIds.map(id => id ? UNIT_CONFIGS.find(u => u.id === id) ?? null : null)
  this.pickedSkills = { ...loadPresetSkills(presetIndex) }
  this.fillWithDefaults()
}
```

- [ ] **Step 2: Change `persistSquad()` to save to active preset**

Replace:
```ts
private persistSquad(): void {
  const ids = this.slots.map(s => s?.id ?? null)
  savePreset(this.activePresetIndex, ids)
  savePresetSkills(this.activePresetIndex, this.pickedSkills)
}
```

- [ ] **Step 3: Update subtitle text**

Change menu mode subtitle to reflect preset system:
```
Menu mode: "Build and save your squad presets. Switch between 4 setups below."
Level mode: "Tap an empty slot to pick a unit. Current preset will be used for this operation."
```

- [ ] **Step 4: Add `activePresetIndex` class property**

```ts
private activePresetIndex: number = 0
```

- [ ] **Step 5: Commit**

```bash
git add src/scenes/SquadScene.ts
git commit -m "feat(squad): load/save active preset instead of per-stage squad"
```

---

### Task 3: SquadScene — preset bar UI

**Files:**
- Modify: `src/scenes/SquadScene.ts`

- [ ] **Step 1: Add `buildPresetBar()` method**

```ts
private buildPresetBar(): void {
  const W = 1280
  const H = 720
  const barY = H - 90
  const barH = 36
  const barW = W - 40
  const barX = 20

  // Background
  const bg = this.add.graphics()
  bg.fillStyle(0xffffff, 0.95)
  bg.fillRoundedRect(barX, barY, barW, barH, 4)
  bg.lineStyle(1, 0xe0e0e0, 1)
  bg.strokeRoundedRect(barX, barY, barW, barH, 4)
  bg.setDepth(50)

  const btnW = 100
  const gap = 8
  const startX = barX + 12
  const nameY = barY + barH / 2

  for (let i = 0; i < 4; i++) {
    const x = startX + i * (btnW + gap)
    const name = getPresetName(i)
    const isActive = i === this.activePresetIndex

    const btnBg = this.add.graphics()
    btnBg.setDepth(51)
    if (isActive) {
      btnBg.fillStyle(0x1877F2, 1)
      btnBg.fillRoundedRect(x, barY + 3, btnW, barH - 6, 3)
    } else {
      btnBg.lineStyle(1, 0xcccccc, 1)
      btnBg.strokeRoundedRect(x, barY + 3, btnW, barH - 6, 3)
    }

    const txt = this.add.text(x + btnW / 2, nameY, name, {
      fontSize: '12px',
      fontFamily: '"Share Tech Mono", "Roboto Mono", monospace',
      fontStyle: 'bold',
      color: isActive ? '#ffffff' : '#4B5563',
    }).setOrigin(0.5, 0.5).setDepth(52)

    const hitArea = this.add.zone(x, barY + 3, btnW, barH - 6).setInteractive({ useHandCursor: true })
    hitArea.setDepth(53)
    hitArea.on('pointerdown', () => {
      if (i === this.activePresetIndex) return
      this.activePresetIndex = i
      setActivePreset(i)
      this.loadActivePreset()
      this.rebuildPresetBar()
    })
  }

  // Pencil icon
  const pencilX = startX + 4 * (btnW + gap) + 16
  const pencil = this.add.text(pencilX, nameY, '✎', {
    fontSize: '16px',
    color: '#4B5563',
  }).setOrigin(0.5, 0.5).setDepth(52).setInteractive({ useHandCursor: true })
  pencil.on('pointerdown', () => this.renameCurrentPreset())
}
```

- [ ] **Step 2: Add `rebuildPresetBar()` method**

Destroys existing preset bar elements and calls `buildPresetBar()` again.

Keep references to preset bar elements (bg, buttons, texts, pencil) as class properties or a container so they can be cleaned up.

```ts
private presetBarElements: Phaser.GameObjects.GameObject[] = []

private rebuildPresetBar(): void {
  this.presetBarElements.forEach(e => e.destroy())
  this.presetBarElements = []
  this.buildPresetBar()
}
```

- [ ] **Step 3: Add `loadActivePreset()` method**

```ts
private loadActivePreset(): void {
  const savedIds = loadPreset(this.activePresetIndex)
  this.slots = savedIds.map(id => id ? UNIT_CONFIGS.find(u => u.id === id) ?? null : null)
  this.pickedSkills = { ...loadPresetSkills(this.activePresetIndex) }
  this.fillWithDefaults()
  this.redrawAllSlots()
}
```

Add `redrawAllSlots()` helper that iterates `this.slotContainers` and redraws each one:

```ts
private redrawAllSlots(): void {
  this.slotContainers.forEach((c, i) => {
    c.removeAll(true)
    const unit = this.slots[i]
    if (unit) {
      this.drawSlot(c, unit)
    } else {
      drawEmptyUnitCard(c, ...)
    }
  })
}
```

- [ ] **Step 4: Add `renameCurrentPreset()` method**

```ts
private renameCurrentPreset(): void {
  const currentName = getPresetName(this.activePresetIndex)
  const prevNames = this.presetBarElements.filter(e => e.type === 'Text' && e !== this.pencilText)
  // Find the active preset's text label, replace with DOM input
  const input = document.createElement('input')
  input.type = 'text'
  input.value = currentName
  input.style.cssText = `
    font-family: "Share Tech Mono", "Roboto Mono", monospace;
    font-size: 12px; font-weight: bold; color: #ffffff;
    background: #1877F2; border: none; border-radius: 3px;
    padding: 2px 6px; width: 88px; text-align: center;
    outline: none;
  `

  const domEl = this.add.dom(0, 0, input).setDepth(60)
  // Position over the active preset button
  const btnW = 100; const gap = 8; const startX = 32; const barY = 720 - 90; const barH = 36
  const x = startX + this.activePresetIndex * (btnW + gap) + btnW / 2
  domEl.setPosition(x, barY + barH / 2)

  const finish = () => {
    const val = input.value.trim()
    if (val) setPresetName(this.activePresetIndex, val)
    domEl.destroy()
    this.rebuildPresetBar()
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { input.blur() } })
  input.addEventListener('blur', finish)
  setTimeout(() => input.focus(), 50)
  input.select()
}
```

- [ ] **Step 5: Call `buildPresetBar()` in `create()`**

Add `this.buildPresetBar()` after the grid and navigation buttons are created.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/SquadScene.ts
git commit -m "feat(squad): add preset bar UI with switch and rename"
```

---

### Task 4: Remove old per-stage squad code (cleanup)

**Files:**
- Modify: `src/shared/SaveData.ts`
- Modify: `src/scenes/SquadScene.ts`

- [ ] **Step 1: Remove old squad functions from SaveData**

Remove `saveSquad`, `loadSquad`, `savePickedSkills`, `loadPickedSkills` function bodies (keep stubs or delete). Remove references to `squads` and `squadSkills` from the migration.

- [ ] **Step 2: Remove any remaining per-stage squad references in SquadScene**

Remove the subtitle logic that mentions `menu_squad` vs per-stage. Remove any leftover conditional squad loading by `levelId`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/SaveData.ts src/scenes/SquadScene.ts
git commit -m "chore: remove unused per-stage squad code"
```

---

### Task 5: Verification

**Files:**
- Run: `npm run build`

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit any fixes**

If build or typecheck fails, fix issues and commit.
