# Holdfast — Implementation Checklist

Last updated: 2026-06-25

## Phase Status

| Phase | Status | Branch | Merged |
|-------|--------|--------|--------|
| Scene flow + Combat depth | ✅ Done | `main` | ✅ |
| Flat elevation visuals | ✅ Done | `feat/flat-elevation-visual` | ✅ |
| Perspective grid rendering | ✅ Done | `feat/perspective-tiles` | ✅ |
| Gameplay systems doc'd | ✅ Done | `main` | ✅ |
| Bottom card bar + auto-start | ✅ Done | `main` | ✅ |
| Vitest test suite (62 tests) | ✅ Done | `main` | ✅ |
| CombatSystem tests (37 tests) | ✅ Done | `main` | ✅ |
| Skills system (78 skills, 3 per subclass) | ✅ Done | `main` | ✅ |
| GameScene inspect panel redesign | ✅ Done | `main` | ✅ |

## Next Steps
- [ ] **effectiveUnitDef callback** — CombatSystem applies DEF buffs from statBuff skills (Shell Defense, DEF Up, etc.)
- [ ] **effectiveUnitBlock callback** — CombatSystem applies block bonus from skills (Shell Defense, Juggernaut Mode)
- [ ] **Toggle deactivation on retreat** — deactivate toggle skill when unit retreats
- [ ] **Skill effect handlers** — wire heal/generateDP/buffAlly/debuffEnemy effects in GameScene
- [ ] **Save pickedSkills** — persist skill selection to localStorage alongside squad
- [ ] **Death animation for units** — explosion/dissolve effect instead of instant vanish
- [ ] **Chapter 2 level content** — new levels, new enemies (Ursus faction)

## Known Bugs

### Deploy click dist < 12
- **File:** `src/scenes/GameScene.ts` (~line 287)
- **What:** During facing confirmation, clicking near the tile center (< 12px) cancels instead of confirming.
- **Status:** PENDING user decision

## Post-Launch
- 2.5D axonometric scene (coordinate mapping, depth sorting, tile sprites)
- Pixel art (v2 visual style)
