# Squad Presets — Design Spec

## Problem

Current squad persistence saves per-stage squads (keyed by `levelId`) and a global `menu_squad` fallback. There is no way to maintain multiple squad compositions and quickly switch between them for different stage types. Per-stage saving is unused since Holdfast 1 has no auto-clear system.

## Solution

Replace per-stage squad saving with 4 fixed preset slots. A bottom bar in SquadScene lets the user switch between presets, rename them, and auto-saves changes.

## Data Model

### SaveData (in `src/shared/SaveData.ts`)

Replace existing `squads` and `squadSkills` maps with preset-specific keys:

```ts
interface SaveData {
  levelCompletions: Record<string, LevelCompletion>
  presets: Record<string, (string | null)[]>   // keys: 'preset_0'..'preset_3'
  presetSkills: Record<string, Record<number, string>>
  presetNames: Record<number, string>           // defaults: 'Preset 1'..'Preset 4'
  activePreset: number                          // 0-3, last-used; defaults to 0
}
```

### Migration

On first load after update: if `squads['menu_squad']` exists, copy into `preset['preset_0']`. The old `squads` and `squadSkills` maps remain in localStorage but are no longer read.

### SaveData API Changes

| Old | New |
|---|---|
| `saveSquad(levelId, slotIds)` | `savePreset(index, slotIds)` |
| `loadSquad(levelId)` | `loadPreset(index)` |
| `savePickedSkills(levelId, skills)` | removed (merged into `savePreset`) |
| `loadPickedSkills(levelId)` | removed (merged into `loadPreset`) |
| — | `setActivePreset(index)` |
| — | `getActivePreset(): number` |
| — | `setPresetName(index, name)` |
| — | `getPresetName(index): string` |

## SquadScene UI

### Preset Bar (bottom of scene)

A horizontal bar drawn near the bottom of the scene (between the unit grid and the "Start Mission" button):

```
┌──────────────────────────────────────────────────────────────┐
│ [ Preset 1 ]  [ Preset 2 ]  [ Preset 3 ]  [ Preset 4 ]  ✎ │
└──────────────────────────────────────────────────────────────┘
```

- **Background**: full-width rounded rectangle, opaque with subtle border
- **Preset buttons**: 4 clickable labels, ~100px each. Active preset gets a filled highlight (tech blue background, white text). Inactive presets show an outline (subtle border, default text color).
- **Pencil icon** (✎): small text label at the far right end of the bar. On tap, the active preset's name label is replaced by a styled DOM `<input>` (using Phaser's `this.add.dom()` since `dom: { createContainer: true }` is enabled in the game config). Pressing Enter or blurring the input saves the new name.

### Interactions

| Action | Behavior |
|---|---|
| Tap inactive preset button | Immediately loads that preset's units into all 12 slots. Redraws all slot cards. No confirmation — unsaved state of previous preset is irrelevant because changes auto-save. |
| Tap active preset button | No-op (already active) |
| Tap ✎ | Rename mode: current preset name replaced by DOM input with same styling. Enter/blur saves and returns to label mode. |
| Add/remove unit (via slot click → PickerScene) | Auto-saves to active preset via `SaveData.savePreset()` |
| Auto Fill | Fills current active preset's slots, auto-saves |
| Start Mission | Passes currently loaded units (from active preset) to GameScene — no change to this code path |

### SquadScene init flow (in `create()`)

1. Call `SaveData.getActivePreset()` to get last-used preset index
2. Call `SaveData.loadPreset(index)` to get the units and skills
3. Populate `this.slots` and `this.pickedSkills` with loaded data
4. Draw all slot cards
5. Build preset bar UI, highlight active preset

### SquadScene: Level mode vs Menu mode

Both modes use the same preset system. The `levelId` distinction is no longer relevant for squad loading. The SquadScene always loads the active preset regardless of entry point. The subtitle and navigation buttons still differ based on whether a level was passed in.

## Files Changed

| File | Changes |
|---|---|
| `src/shared/SaveData.ts` | Replace per-stage squad functions with preset functions. Add migration. Add `activePreset`, `presetNames` fields. |
| `src/scenes/SquadScene.ts` | Add preset bar UI at bottom. Switch to preset-based loading/saving. Remove per-stage squad loading. Add rename interaction. |
| `src/scenes/HomeBridgeScene.ts` | No change (continues to open SquadScene without a level, which now loads active preset). |
| `src/scenes/LevelSelectScene.ts` | No change (continues to open SquadScene with level data, which now loads active preset instead of per-stage squad). |
| `src/scenes/LevelPreviewScene.ts` | No change. |

## Edge Cases

- **Empty preset**: All 12 slots are `null`. Shows empty slot cards with "+" placeholder, same as current empty slot behavior.
- **First launch after update**: Existing `menu_squad` data is migrated to `preset_0`.
- **Renaming to empty string**: Reject — revert to previous name.
- **All 4 presets empty**: Works fine — all slots show empty placeholders.
