# Holdfast v1 — Scene Flow Design

**Date:** 2026-06-17
**Status:** Design
**Scope:** Complete screen flow from boot to finish for itch.io release

---

## 1. Motivation

Currently the game starts directly into SquadScene. There's no progression, no level unlocking, no proper result screen. For an itch.io release, players need a clear flow: pick a level, pick their squad, play, see results, move on.

---

## 2. Arknights Reference Flow

```
Login → Home → Terminal/Chapter Select → Level Select
  → [Enemy Preview | Terrain Preview | Squad Selection]
  → Gameplay → Result (loot, EXP, stars, statuses)
```

---

## 3. Holdfast v1 Flow

```
Boot → ChapterSelect → LevelSelect → SquadScene → GameScene → Result
                                          ↑                        │
                                          └────── (back) ←─────────┘
```

### Boot to ChapterSelect
BootScene currently passes through to SquadScene. Change it to go to ChapterSelect instead.

### ChapterSelect (new scene)
- Shows a list of chapters (e.g., "Chapter 1: First Contact", "Chapter 2: ..." etc.)
- Locked chapters are greyed out
- For v1 (no persistence), all chapters are unlocked within a session
- One button per chapter
- Bottom-right: `[Editor]` button — **hidden from players** (see section 7)
- Click a chapter → transitions to LevelSelect with `{ chapterId }`

### LevelSelect (new scene)
- Shows levels within the selected chapter as a grid or list
- Each level card: level name, star rating (0/3), lock state
- For v1 (no persistence), all levels are unlocked within a session
- Star rating is session-only (reset on page reload)
- Click a level → transitions to SquadScene with `{ levelId }`

### SquadScene (already exists — make reusable)
- Player picks up to 12 units from the full roster
- No changes to the squad UI itself
- Back button returns to LevelSelect (currently goes to BootScene — update)
- Editor button currently in SquadScene → **remove** (editor gate moves to ChapterSelect)
- "Start Mission" proceeds to GameScene with `{ level, squad }`
- The level loaded is determined by the `levelId` passed in, not hardcoded TEST_LEVEL

### GameScene (already exists — minor changes)
- Level and squad received from SquadScene
- No changes to battle mechanics
- On victory: transitions to Result
- On defeat: transitions to Result (with defeat state)

### Result (new or extended from current)
Shown after battle ends:
- **Victory:** "SYNC COMPLETE" with star rating (1-3 based on lives lost, deployment efficiency, etc.)
- **Defeat:** "SYNC FAILED" with 0 stars
- Buttons:
  - `[Retry]` → restart same level (goes back to GameScene with same squad)
  - `[Next Level]` → go to next level in chapter (only on victory)
  - `[Back to Levels]` → return to LevelSelect
- For v1 (no persistence), stars are displayed but not saved

---

## 4. Screens Summary

| Screen | Status | Purpose |
|--------|--------|---------|
| BootScene | Exists | Change target → ChapterSelect |
| ChapterSelect | New | Pick a chapter |
| LevelSelect | New | Pick a level within chapter |
| SquadScene | Exists | Pick squad (reusable, back goes to LevelSelect) |
| GameScene | Exists | Battle (add defeat detection) |
| Result | New | Stars, Retry, Next Level, Back to Levels |

---

## 5. Data Flow Between Scenes

```
BootScene
  └─→ ChapterSelect
       ├─→ LevelSelect (chapterId)
       │    └─→ SquadScene (levelId: string, levelData: LevelData)
       │         └─→ GameScene (level: LevelData, squad: UnitConfig[])
       │              └─→ Result (levelId, squad, outcome, stars)
       │                   ├─→ GameScene (retry — same level, same squad)
       │                   ├─→ GameScene (next level — next levelId, same squad)
       │                   └─→ LevelSelect (back)
       └─→ (editor, hidden)
```

### Scene data contracts

```typescript
// SquadScene → GameScene (extend current)
{
  level: LevelData
  squad: UnitConfig[]
}

// GameScene → Result (new)
{
  chapterId: string         // needed for "next level" navigation
  levelId: string
  squad: UnitConfig[]
  outcome: 'victory' | 'defeat'
  stars: number           // 0-3
  livesRemaining: number
  enemiesDefeated: number
}

// Result → GameScene (next level)
// Infers next levelId from chapter's level list:
//   LEVELS_BY_CHAPTER[chapterId] → array of levelIds
//   Find current index → increment → get next level's id + data
```

### Level progress (session-only)

```typescript
// In-memory, not persisted
const sessionProgress: Map<string, {
  cleared: boolean
  stars: number
  unlocked: boolean
}> = new Map()
```

All levels start unlocked for v1. Stars accumulate during the session but reset on reload.

---

## 6. Level Data Source

Currently SquadScene uses a hardcoded `TEST_LEVEL`. Change to:

```typescript
// src/levels/index.ts — exports a map of levelId → LevelData
import level01 from '../levels/level-01.json'
import level02 from '../levels/level-02.json'

export const LEVELS: Record<string, LevelData> = {
  '1-1': level01 as LevelData,
  '1-2': level02 as LevelData,
  // ...
}
```

---

## 7. Editor Access (Developer-Only)

The Editor must be accessible during development but invisible to players.

### Approach: URL parameter

The editor button appears **only when** `?dev=true` is in the URL:

```typescript
const isDev = new URLSearchParams(window.location.search).has('dev')
```

- Players visiting `https://.../index.html` → no editor button
- Developer visiting `https://.../index.html?dev=true` → editor button appears in ChapterSelect

### Alternative considered: localStorage flag

Could also use `localStorage.getItem('holdfast_dev')` — persistent once set. But URL param is simpler (no extra step) and works fresh each session.

### Editor access flow

```
ChapterSelect ── (if ?dev=true) ──→ EditorScene ──→ GameScene (test mode, all units)
                                                  ←── [Back to Editor]
                                              EditorScene ←── [Back to ChapterSelect]
```

---

## 8. Implementation Order

| Step | What | Files |
|------|------|-------|
| 1 | Create `src/levels/index.ts` | New |
| 2 | Create ChapterSelect scene | `src/scenes/ChapterSelectScene.ts` (new) |
| 3 | Create LevelSelect scene | `src/scenes/LevelSelectScene.ts` (new) |
| 4 | Create Result scene | `src/scenes/ResultScene.ts` (new) |
| 5 | Update BootScene → ChapterSelect | `BootScene.ts` |
| 6 | Update SquadScene → receives levelId | `SquadScene.ts` |
| 7 | Update GameScene → defeat detection, emit result | `GameScene.ts` |
| 8 | Add editor gate (`?dev=true`) | `ChapterSelectScene.ts` |
| 9 | Register new scenes in `main.ts` | `main.ts` |

---

## 9. Out of Scope (v1)

| Feature | Why |
|---------|-----|
| Persistent progress | Reset on reload — intentional for Holdfast 1 |
| Enemy preview | Nice-to-have, adds art/UI burden |
| Terrain preview | Nice-to-have, adds art/UI burden |
| Animations | Scene transitions are instant `scene.start()` — no slide/fade |
| Music/SFX | No audio engine in v1 |
| Settings screen | No audio, no graphics options to tune |
