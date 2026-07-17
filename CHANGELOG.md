## [2026-06-30] Phase — HomeBridge Visual Theming
- **New effects system** (`src/effects/`): Icosahedron (3D wireframe with perspective projection + rotation), FireflyEffect (floating glowing dots with firefly.png), SmokeAmbient (slow cloud layer with smoke-texture.png), MouseParallax (lerp-based container offset on pointer move)
- **HomeBridgeScene restructured**: Off-white gradient bg (`#F5F5F5`), tech orange (`#FF6A00`) icosahedron centerpiece, warm orange fireflies, cool ambient smoke, dark grey title, tech orange accent line. TERMINAL button in orange (primary), SQUAD/EDITOR in Meta blue (`#1877F2`, secondary)
- **Palette expansion** (`src/ui/Constants.ts`): Added `COLOR_SHADE.techOrange` and `COLOR_SHADE.techBlue`. Updated neutral 700 to `#1A1A1A` dark grey
- **Asset pipeline** (`BootScene.ts`): Added preload for 3 PNG textures (firefly, particle, smoke-texture) from arknights-particle
- **Design reference** (`docs/superpowers/specs/2026-06-30-homebridge-visual-theme.md`): Portal 2 "Clean" aesthetic documented as styling reference
- **Build verified**: `tsc && vite build` passes

## [2026-06-25] Phase — Three New Mechanics: Barriers, Stun Generator, Displacement
- **Barriers** (`src/config/units.ts`): Deployable unit with blockCount=3, 0 ATK, very high HP. Cheap DP cost (5). Blocks enemies in place without attacking — roadblock mechanic for TR-8.
- **Stun Generator** (`src/config/units.ts`, `src/config/skills.ts`): Ranged deployable with EMP Burst skill (manual activation, 15 SP). Applies 5-second stun to all enemies within 2 tiles. Stun prevents all movement. New status effect type `'stun'` in `types/index.ts`.
- **Displacement Drone** (`src/config/units.ts`, `src/config/skills.ts`): Ranged deployable with Shockwave skill (manual activation, 12 SP). Blasts enemies backward 2 tiles along their path. New `displace` skill effect type and `EnemySprite.displace()` method.
- **Enemy.ts**: Added `isStunned()` check (prevents movement), `displace(tiles)` method (rewinds waypoint index and repositions), updated `move()` to respect stun.
- **GameScene**: Handles `aoe_stun` special effect (iterate enemies in radius, apply stun status) and `displace` effect (iterate enemies, call displace backward).
- **Level rewrites**: TR-8 now teaches Barriers (roadblocks), TR-9 teaches Stun Generator, TR-14 teaches Displacement Drone.
- Files: `src/types/index.ts`, `src/config/units.ts`, `src/config/skills.ts`, `src/entities/Enemy.ts`, `src/scenes/GameScene.ts`, `src/shared/utils/levelHelpers.ts`, `levels/TR-8.json`, `levels/TR-9.json`, `levels/TR-14.json`

## [2026-06-25] Phase — TR Pacing Restructure (Arknights Chapter Alignment)
- **Research skill**: `.opencode/skills/game-pacing-research/SKILL.md` — codified wiki.gg-based TR stage research methodology with canonical query format, verified chapter mapping, and mechanic-to-Holdfast equivalence table
- **Chapter restructure**: All TR-1–TR-7 moved to Chapter 0 (Prologue), TR-8/TR-9 to Chapter 1 (Ep 01), TR-11–TR-14 to Chapter 2 (Ep 02), TR-15 to Chapter 3 (Ep 03). Uses dynamic `makePositions()` to generate correct node count per chapter.
- **New tutorial levels**: TR-10 (Decel Binder slow), TR-11 (Supporter + Caster armor breach), TR-12 (spread vs enemy AoE), TR-13 (Guard intercept), TR-14 (RepairNode/ArmorGrid terrain), TR-15 (retreat DP refund) — all with targeted enemy comps and 1–2 page guide text
- **TR-8/TR-9 guide refresh**: Updated guide text for clarity without changing tile layouts
- **levelHelpers.ts**: Added squad definitions for TR-10 through TR-15
- Files: `src/config/chapters.ts`, `src/shared/utils/levelHelpers.ts`, `levels/TR-8.json`, `levels/TR-9.json`, `levels/TR-10.json`, `levels/TR-11.json`, `levels/TR-12.json`, `levels/TR-13.json`, `levels/TR-14.json`, `levels/TR-15.json`, `.opencode/skills/game-pacing-research/SKILL.md`

## [2026-06-25] Phase — Home Bridge Scene (Startup Hub)
- **HomeBridgeScene**: New startup scene replacing ChapterSelectScene as first screen. Gradient background, "HOLDFAST" title with left-fade animation, 3 trapezoid buttons (TERMINAL, SQUAD PRESET, LEVEL EDITOR) with staggered right-fade entry. Buttons use same gradient/shadow/press aesthetic as `makeNodeButton` (primary role, dark grey, white text). Perspective hover effect compresses edge 5px on cursor side. Camera fadeIn(300ms) starts the chain.
- **SquadScene menu mode**: `levelId === 'menu'` disables Start Mission, shows BACK to HomeBridgeScene, saves/loads to `menu_squad` key. Enables Squad Preset flow from home.
- **BootScene**: now starts HomeBridgeScene instead of ChapterSelectScene.
- Files: `src/scenes/HomeBridgeScene.ts`, `src/scenes/BootScene.ts`, `src/scenes/SquadScene.ts`, `src/main.ts`
- Spec: `docs/superpowers/specs/2026-06-25-home-bridge-scene-design.md`

## [2026-06-25] Phase — Skills System (78 skills, 26 subclasses, SP mechanics)
- **Design spec**: `docs/superpowers/specs/2026-06-25-skills-system-design.md` — full spec with per-subclass skill tables, SP mechanics (recovery × activation axes), duration axis (instant/time/toggle/ammunition/unlimited), review pass of all 78 skills
- **Types**: Added `SpRecoveryType`, `SkillActivationType`, `SkillDurationType`, `SkillEffect` (discriminated union), `SkillConfig`, `SkillState`; updated `UnitConfig` (skills field), `DeployedUnit` (skillState field)
- **Skill config**: `src/config/skills.ts` — 78 skills across 26 subclasses, keyed by unit ID
- **Guardian subclass**: Added to `src/config/units.ts` (healing Defender, 3 skills)
- **SkillSystem**: `src/systems/SkillSystem.ts` — SP charging (auto/offensive/defensive), auto/manual/toggle activation, duration tracking, skill state management
- **CombatSystem**: `effectiveUnitAttack` callback for enhanceAttack effects (atk multiplier, hit count, true damage)
- **PickerScene**: Skill selection column in sidebar — 3 skill rows per unit, clickable with highlight, confirm button shows "Deploy with [skill name]"
- **GameScene**: SP display on card bar + inspect panel, skill activation button (manual/toggle), offensive/defensive SP gain wiring, skill system integration in update loop
- **SquadScene**: `pickedSkills` tracking per slot, passed to GameScene
- Files: `src/types/index.ts`, `src/config/skills.ts`, `src/config/units.ts`, `src/systems/SkillSystem.ts`, `src/systems/CombatSystem.ts`, `src/scenes/PickerScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/SquadScene.ts`, `docs/superpowers/specs/2026-06-25-skills-system-design.md`

## [2026-06-24] Phase — Multi-Dialog Guide System + Text Rewrite
- **Multi-dialog**: `guideText` changed from single string to `string[]`. Guide dialog supports multiple pages (click to advance, last page shows `[ tap to dismiss ]`). Visual-novel style sequential reveal.
- **Text rewrite**: All 15 level guide texts rewritten as direct second-person instructions. TR tutorials get 2 pages each (teach mechanic step-by-step), story levels get 1 page (concise tactical tip).
- Files: `src/types/index.ts`, `src/config/chapters.ts`, `src/scenes/GameScene.ts`, `levels/*.json` (15 files)

## [2026-06-24] Phase — Navigation Standardization
- **Back buttons**: Moved from bottom-left to top-left (x=16, y=16) across LevelSelectScene, SquadScene, LevelPreviewScene, PickerScene — consistent with Arknights top-left back pattern
- **Home buttons**: Added next to Back in all navigation scenes (→ ChapterSelectScene as stand-in for future home scene)
- **ResultScene**: Removed all buttons (Retry, Next Level, Back to Levels). Click anywhere on screen returns to LevelSelectScene. Cleaned up unused imports and data fields.
- Files: `src/scenes/LevelSelectScene.ts`, `src/scenes/SquadScene.ts`, `src/scenes/LevelPreviewScene.ts`, `src/scenes/PickerScene.ts`, `src/scenes/ResultScene.ts`, `src/scenes/GameScene.ts`

## [2026-06-24] Phase — Card Layout + Result Screen
- **SquadScene**: SLOT_H 162→200 — taller cards fill vertical space
- **PickerScene**: CARD_H 190→220, larger icons (72→80), repositioned text — better use of vertical space
- **ResultScene**: Retry button removed on victory (stage clear) — only shown on defeat
- Files: `src/scenes/SquadScene.ts`, `src/scenes/PickerScene.ts`, `src/scenes/ResultScene.ts`

## [2026-06-24] Phase — Unit Death Animation
- **Particle burst on unit death**: Units now emit 6 particles tinted to their config color on death, matching the existing enemy death effect. Uses existing `'particle'` texture. Shrink+fade tween preserved.
- Files: `src/entities/Unit.ts`, `docs/superpowers/specs/2026-06-24-unit-death-animation.md`

## [2026-06-24] Phase — Info Panel Text Overlap Fix
- **Text overlap**: Fixed `py +=` increments to use `text.height` instead of hardcoded values. Wrapping titles (e.g., "1-3 Breach Point" at 20px bold) no longer overlap with description below.
- Files: `src/scenes/LevelSelectScene.ts`

## [2026-06-24] Phase — Fullscreen Toggle + Contrast Fixes
- **Fullscreen toggle**: HTML button overlay in bottom-right corner calls `game.scale.toggleFullscreen()`. Hidden on unsupported platforms (`fullscreenEnabled` check + `FULLSCREEN_UNSUPPORTED` event). Uses Phaser's built-in fullscreen API with wrapper around parent element.
- **WCAG contrast fixes**: 15 color pairs failed audit. Fixed danger button (12.63:1), dim text (#5d6d7d, 5.32:1), locked nodes, subtitles, stars, squad placeholders, result screen stars, game scene override text.
- **Crash fix**: `loadSave()` in SaveData.ts used unchecked `as SaveData` cast — legacy saves without `squads` field crashed. Added `?? {}` runtime fallback.
- **`makeMetalButton`** → **`makeNodeButton`**: Replaced deprecated button factory across 8 scene files (1 import + 1 call each). Added `role`-based dynamic text color. Removed 3 constants (metal gradient/mask params) from Constants.ts.
- Files: `index.html`, `src/main.ts`, `src/scenes/*.ts` (8 files), `src/ui/Components.ts`, `src/ui/Constants.ts`, `src/shared/SaveData.ts`
- Branch: `dev`

## [2026-06-22] Phase — Visual Polish + Guide Text + SquadScene Polish
- **Visual polish** merged from `feat/visual-polish`: death animation (pop-in/out), deploy click UX fix, manual glow, screen shake, hit flash, deploy pop-in, three-phase enemy attack (wind-up→launch→wind-down), player attack projectiles/swing, decision mode scaling, camera bloom/vignette removed
- **Guide text overlay**: `guideText` field in `LevelData` type, parsed from JSON, displayed as centered white panel on dark overlay in GameScene — click to dismiss. Battle auto-start deferred until guide dismissed for tutorial levels.
- **15 level JSONs** with guide texts (all story + TR stages)
- **SquadScene**: first 7 slots pre-filled with balanced default squad, deployment limit shown in label, instructional subtitle
- `feat/visual-polish` merged to main and deleted
- Files: `src/types/index.ts`, `src/config/chapters.ts`, `src/scenes/GameScene.ts`, `src/scenes/LevelSelectScene.ts`, `src/scenes/SquadScene.ts`, `levels/*`, `docs/superpowers/specs/2026-06-22-guide-system.md`

## [2026-06-22] Phase — Prologue Restructure (Story + TR Interlacing)
- **Prologue restructured** to match Arknights Episode 00 interlacing: story stages (0-1 through 0-8) alternate with TR tutorial stages (TR-1 through TR-7) in sequence → `0-1 → TR-1 → 0-2 → TR-2 → ... → 0-7 → TR-7 → 0-8`
- **8 story stages** created (`levels/0-1.json` through `0-8.json`) with escalating enemy compositions (soldiers → troopers → drones → casters → heavies), simple 10×3 straight-route layouts, no tutorial flag — go through SquadScene flow
- **7 TR stages** renamed to `levels/TR-1.json` through `TR-7.json` with `tutorial: true` flag — skip SquadScene, fixed squad
- **`tutorial` field** added to `LevelData` type, parsed in `jsonToLevelData()`
- **Scrolling** added to `LevelSelectScene` (Phaser geometry mask + mouse wheel), visual distinction between TR (amber background) and story (white) level cards, level ID shown in card title
- Files: `levels/0-1.json` through `0-8.json`, `levels/TR-1.json` through `TR-7.json`, `src/types/index.ts`, `src/config/chapters.ts`, `src/scenes/LevelSelectScene.ts`

## [2026-06-22] Branch Fix + Visual Philosophy Doc
- **Branch fix**: Fast-forward merged `feat/kenney-assets` (11 commits) into `main`. The bottom-card-bar, per-instance deployment tracking, PickerScene, and test suite were all on `feat/kenney-assets` — none existed on `main`. Fast-forward merge moved everything to `main` with zero conflicts. Deleted stale `feat/kenney-assets` branch.
- **Visual philosophy document**: `docs/superpowers/specs/2026-06-22-visual-philosophy.md` — documents the decision to use colored geometric shapes as final v1 visual style (not placeholder). Cites HEX Defense, Infinitode 2, and GeoDefense as proof that minimalist geometric TDs succeed commercially on design depth alone. Covers religious constraint, computational aesthetics, shape→meaning mapping, and v1→v2 upgrade path.
- **CombatSystem tests (37)**: damage formula (kinetic/thermal/true + 5% floor), effective defense (ArmorGrid +100), trait checks, target selection (closest-to-goal, lowest-DEF, blocker priority), slow application, ranged-vs-melee attack params (RangedWhenNotBlocking, RangedAttack80, RangedAoE), heal-on-attack targeting, DoubleHit loop, enemy aerial targeting (findNearestRangedUnit). Excluded test files from tsc to avoid private-method mock issues.
- Files: `docs/superpowers/specs/2026-06-22-visual-philosophy.md`, `.opencode/plans/CHECKLIST.md`, `src/systems/CombatSystem.test.ts`, `tsconfig.json`

## [2026-06-22] Phase 14 — Vitest Test Suite (62 tests, GridMath + DeploymentSystem)

## [2026-06-22] Phase 14 — Vitest Test Suite (62 tests, GridMath + DeploymentSystem)
- Installed vitest (v4) + happy-dom, configured via `vitest.config.ts`
- Added `npm run test` and `npm run test:watch` scripts to package.json
- **GridMath tests (36)**: `rotatePattern` (rotation matrix correctness across all 4 facings), `positionsInRange` (with/without facing, bounds clamping), `computeFacingTowardGoal` (goal proximity selection, tie-breaking, empty fallback), `manhattanDistance`, `chebyshevDistance`, `positionsEqual`, `isDeployable`, `isWalkable`, `validateRoutePath`, `getNeighbors` (orthogonal, diagonal, edge clamping)
- **DeploymentSystem tests (26)**: `getCurrentCost` (base, multiplier, cap, per-instance independence), cooldown lifecycle (start, tick, expiry, per-instance), DP regen/accumulation, `deployUnit` (success, occupied, insufficient DP, deployment limit), `retreatUnit` (half refund, FullRefundRetreat trait, no-unit case), `removeUnit` (cost multiplier progression), `updateTimers` (decay, expiry), `reset` (full state clear)
- Fixed `rotatePattern` to normalize `-0` to `0` via `+ 0` mapping
- Files: `vitest.config.ts`, `package.json`, `src/shared/utils/GridMath.test.ts`, `src/systems/DeploymentSystem.test.ts`, `src/shared/utils/GridMath.ts`

## [2026-06-19] Phase 13 — Bottom Card Bar + Auto-Start + Full-Width Grid
- **Bottom card bar**: Replaced left-side vertical palette with Arknights-style bottom bar (96×128 cards, 48×48 icons, horizontal drag scroll for mobile)
- **Auto-start battle**: SquadScene passes `autoStart: true` → GameScene loads with 2s grace period, then battle begins automatically. Removed `[ START SIMULATION ]` button entirely.
- **Cancel via tap**: Tapping the already-selected card cancels deployment (replaces floating CANCEL text button)
- **Pause overlay menu**: Added `[ Restart Level ]` + `[ Back to Squad ]` buttons when paused
- **Full-width grid**: `computeGridOffsetX` no longer reserves 160px left area — grid uses entire width
- **HUD status**: Shows READY / [ RUNNING ] / DESYNC / SYNC COMPLETE based on state
- Files: `src/scenes/GameScene.ts`, `src/scenes/SquadScene.ts`

## [2026-06-18] Phase 12f — 3 Arknights-Inspired UX Features
- **Pause + Deploy Flow**: `[ II ]` button pauses all game time (DP, movement, combat, healing). Dark overlay + "PAUSED" text. Select a unit while paused, unpause to enter decision mode (50% speed) and deploy immediately. Mirrors Arknights pause-deploy meta.
- **Wave Path Preview**: Animated dotted caterpillar line along route waypoints (red/orange dots) shown during wave `preludeDuration` countdown. Previously unused `preludeDuration` field now drives the preview window. Line auto-clears when wave starts spawning.
- **Enemy Introduction Toasts**: Top-left stacked cards with enemy color icon + name + description. Fires on first encounter per enemy type per session. 5-second auto-dismiss with fade, stacking for simultaneous reveals.
- Data: Added `description?: string` to `EnemyConfig` type; 5 descriptions written for all enemy types.
- Files: `src/types/index.ts`, `src/config/enemies.ts`, `src/systems/EnemyManager.ts`, `src/scenes/GameScene.ts`

## [2026-06-18] Phase 12e — Chapter 1 Level Expansion (5 Levels)
- Expanded Chapter 1 from 3 to 5 levels
- Added 1-4 "Junction" (10×6): zigzag route, elevated mid-point, repair_node, 28 enemies in 5 waves
- Added 1-5 "Stronghold" (10×8): full serpentine, elevated section, repair_node + armor_grid, tight DP (18), 34 enemies in 6 waves, 2-Tank + 2-Caster finale
- Created `designing-holdfast-levels` project skill (`.opencode/skills/`) with Arknights-inspired level design guidelines, grid/tile/wave references
- Skill registered in `opencode.jsonc` and referenced in `AGENTS.md`
- Files: `levels/level-04.json`, `levels/level-05.json`, `.opencode/skills/designing-holdfast-levels/SKILL.md`, `opencode.jsonc`, `src/config/chapters.ts`, `AGENTS.md`

## [2026-06-18] Phase 12d — `routeIndex` Bug (No Enemies Spawning)
- Root cause: all level JSONs were missing `routeIndex` in wave objects. `startNextWave()` called `routes[undefined]`, got `undefined`, errored, skipped through all waves without spawning any enemies. Old completion code (`enemies.length === 0`) returned `true` immediately since array was empty — level appeared to "auto-complete."
- Fix: added `"routeIndex": 0` to all wave objects in `level-01.json`, `level-02.json`, `level-03.json`
- Safety net: `jsonToLevelData()` now maps waves with `w.routeIndex ?? 0` fallback
- Level validation updated to check for missing/invalid `routeIndex`
- Files: `levels/level-01.json`, `levels/level-02.json`, `levels/level-03.json`, `src/config/chapters.ts`, `src/shared/utils/LevelValidation.ts`

## [2026-06-18] Phase 12c — Completion Model Fix + Level Validation
- Fixed `isAllWavesComplete()` bug: was counting down (`enemies.length === 0`) which triggered victory when escaped enemies (reached goal) were cleaned from the array. Now pre-counts total enemies across all waves and tracks a dealt-with counter (incremented on kill OR escape). Victory requires all enemies dealt with AND lives > 0.
- HUD now shows counter format: `Hostiles: 12/35` (dealtWith/total)
- Added `LevelValidation.ts` with `validateLevelData()` — checks tile grid, waypoint connectivity, wave configs, enemy types. Called in `jsonToLevelData()` at module load time.
- Validated + fixed all 3 levels: diagonal waypoint jumps in level-03 (Breach Point) fixed (3 broken connections), `spawnInterval: 0` → `1` across all levels
- Files: `src/systems/EnemyManager.ts`, `src/scenes/GameScene.ts`, `src/shared/utils/LevelValidation.ts`, `src/config/chapters.ts`, `levels/level-01.json`, `levels/level-02.json`, `levels/level-03.json`

## [2026-06-18] Phase 12b — Chapter 1 Level Expansion
- Created level-02.json "Crossroads": L-shaped route (6×8), elevates one tile at the corner, introduces drones + casters, 5 waves, repair_node at corner
- Created level-03.json "Breach Point": Winding serpentine route (8×8), elevated section with armor_grid, full enemy mix, 5 waves with 2 heavy tanks finale
- Updated chapters.ts: 1-1 → level-01, 1-2 → level-02, 1-3 → level-03
- Files: `levels/level-02.json`, `levels/level-03.json`, `src/config/chapters.ts`

## [2026-06-18] Phase 12 — Enemy Stat Rebalance (Arknights Reference)
- Rebalanced all 4 enemies using Arknights Reunion early-game stats as reference
- Scout Car: 800→2200 HP, 100→280 ATK, 2.0s interval (threatens squishies, can't dent tanks)
- APC: 2000→3000 HP, 200→350 ATK, 2.5s interval (moderate threat)
- Tank: 5000→8000 HP, 400→600 ATK, DEF 300→400 (elite threat, needs casters)
- Drone: 500→1500 HP, 150→200 ATK, 1.5s interval (aerial, targets ranged)
- Added Caster enemy: 2500 HP, 250 thermal ATK, 3.5s interval (bypasses DEF, pressures tanks)
- Updated level-01.json waves with caster in wave 3, increased counts
- Starting DP bumped to 25 for initial deployment flexibility
- Files: `src/config/enemies.ts`, `levels/level-01.json`, `.opencode/plans/CHECKLIST.md`

## [2026-06-18] Phase 11 — Bugfixes (Restart Shift, Perspective Range Preview, etc.)
- Fixed restart grid shift: extracted `computeGridOffsetX()` so `loadLevel()` uses same centering as `create()`
- Fixed elevation color connectivity: elevated tiles adopt fill color of tile below for platform continuity
- Fixed range preview/hover indicator: now draws trapezoid outlines via `Grid.getTileCorners()`
- Fixed spawn/goal: replaced X+triangle with perspective-aware 3D wireframe cubes (top face + vertical edges)
- Files: `src/scenes/GameScene.ts`, `src/entities/Grid.ts`, `.opencode/plans/CHECKLIST.md`

## [2026-06-18] Phase 10 — Gameplay System Documentation
- Wrote 5 missing gameplay system specs: deployment system, unit roster + traits, enemy system, combat mechanics, screen UI layout
- Created bug tracking checklist (`.opencode/plans/CHECKLIST.md`) with 4 new bugs + existing issue
- All 7 gameplay areas now documented (2 existing + 5 new)
- Files: `docs/superpowers/specs/2026-06-18-deployment-system.md`, `docs/superpowers/specs/2026-06-18-unit-roster-and-traits.md`, `docs/superpowers/specs/2026-06-18-enemy-system.md`, `docs/superpowers/specs/2026-06-18-combat-mechanics.md`, `docs/superpowers/specs/2026-06-18-screen-ui-layout.md`, `.opencode/plans/CHECKLIST.md`

## [2026-06-18] Phase 9 — Whole-Grid Perspective Foreshortening
- Grid renders as a single perspective plane (ROW_INSET = 6)
- Horizontal lines stay straight, vertical lines converge toward top
- Each tile is a proper trapezoid, tiles seamlessly with neighbors
- Row-based inset: consistent ~5.4° side angle across all grid sizes (3-row, 8-row, 10-row)
- Grid lines, borders, shadow strips, decorations follow trapezoid grid
- Click detection (pixelToTile) reverse-transforms through perspective
- GameScene grid centered between palette and screen edge (dynamic offset calculation)
- Files: `src/entities/Grid.ts`, `src/scenes/GameScene.ts`

## [2026-06-18] Phase 8 — Flat Elevation Visuals + Scene Flow
- Tile colors standardized (Ranged=#d4d8dc, Ground=#b0b8c4, Floor=#5a5a5a, Wall=#1a1a1a)
- Shadow strip on elevated tiles, hidden on continuous elevated platforms
- Orange border on Ranged tiles (width=2); Spawn/Goal: X corners + triangle
- RepairNode: green cross icon, ArmorGrid: blue shield icon
- Grid supports custom offsetX/offsetY; Editor grid centered between panels
- Ghost grid overlay at depth -5 in GameScene
- Scene flow: Boot → ChapterSelect → LevelSelect → SquadScene → GameScene → ResultScene
- Editor gated behind ?dev=true URL parameter
- Combat depth: kinetic/thermal damage (same both directions), enemy attacks, unit death (no DP refund)
- Repair Node (30 HP/s), Armor Grid (+100 DEF), Editor palette (8 items)
- Stats panel: live HP update, RES%, deploy cooldown .toFixed(2)
- Auto-fill curated 12-unit squad; card simplification (DP + icon + name)
- Defeat detection, star calculation (1-3), result screen transition
- Files: AGENTS.md, CHANGELOG.md, src/entities/Grid.ts, src/shared/utils/GridMath.ts, src/scenes/*, src/config/*, src/systems/*, src/types/index.ts, src/ui/Constants.ts
- New scenes: ChapterSelectScene.ts, LevelSelectScene.ts, ResultScene.ts
- Branch: feat/flat-elevation-visual (merged to main)

## [2026-06-17] Phase 7 — Combat Depth (Enemy Attacks + Terrain Effects)
- Enemy attack system: blocked ground enemies attack blockers every `attackInterval` seconds
- Aerial enemy (drone) attacks: targets nearest ranged unit within 3 tiles
- Damage formula fix: thermal damage uses percentage RES (`ATK × (1 − RES/100)`) instead of flat subtraction
- Renamed `insulation` → `res` across all configs and systems
- Added `attackInterval` and `damageType` to `EnemyConfig`
- Added `TileType.RepairNode` and `TileType.ArmorGrid`
- Repair Node: 30 HP/s heal for ground units standing on the tile
- Armor Grid: +100 flat DEF for ground units standing on the tile
- Unit death: HP=0 from enemy attacks triggers auto-retreat (refund + redeploy cooldown)
- Editor palette: Repair Node and Armor Grid tile types with keyboard shortcuts (1-8)
- Level update: Repair Node and Armor Grid placed in level-01.json (tutorial)
- Stats panel: shows RES% for units
- New methods: `onUnitDamageDealt`, `onUnitDeath` events, `showUnitDamageNumber` visual feedback
- Files: `src/types/index.ts`, `src/config/units.ts`, `src/config/enemies.ts`, `src/systems/CombatSystem.ts`, `src/systems/HealingSystem.ts`, `src/systems/DeploymentSystem.ts`, `src/entities/Grid.ts`, `src/shared/utils/GridMath.ts`, `src/scenes/GameScene.ts`, `src/scenes/EditorScene.ts`, `src/scenes/SquadScene.ts`, `levels/level-01.json`
- Branch: `feat/combat-depth`

## [2026-06-12] Gameplay Clarification
- Deployment is real-time (Arknights-style), not pre-wave build phase
- Units deploy during combat with DP regen ticking continuously
- Updated all deployment docs and logic to reflect real-time deployment model

## [2026-06-12] Phase 1 — Grid & Editor
- Grid rendering: tile colors, borders, labels, spawn/goal markers, route path overlay
- Level editor: tile palette, click/drag painting, grid resize, clear
- Spawn/objective marker placement as tile types
- BFS-based route waypoint generation from route tiles
- JSON export (file download) and import (file picker) with validation
- Level config fields: name, startingDP, dpRegenRate, dpCap, deploymentLimit
- Sample level: `levels/level-01.json` (12×3 tutorial)
- Files: `src/entities/Grid.ts`, `src/shared/utils/GridMath.ts`, `src/systems/RouteGenerator.ts`, `src/editor/LevelSerializer.ts`, `src/scenes/EditorScene.ts`, `src/scenes/GameScene.ts`

## [2026-06-12] Phase 2 — Unit Deployment
- Unit config definitions: Vanguard, Guard, Defender, Sniper, Caster, Medic
- Real-time deployment system: click tile → deploy unit (DP deducted immediately)
- Deployment validation: tile type matching (ground→route, ranged→off-route), tile occupied check, limit check, DP check
- DP auto-generation: 1/sec baseline, configurable per level, capped at 99
- Unit DP costs: deducted on deploy, refund half on retreat
- Deployment limit: configurable cap on active units (default 8)
- Unit retreat: right-click to remove, refund half DP cost, free slot
- Unit rendering: colored shapes (rounded rects for ground, triangles for ranged), HP bars, block count indicators
- In-game HUD: DP counter, unit count/limit, selection palette
- Files: `src/config/units.ts`, `src/systems/DeploymentSystem.ts`, `src/entities/Unit.ts`, `src/scenes/GameScene.ts`

## [2026-06-13] Phase 3.5 — Gameplay Bugfixes & Multi-Route Planning
- Fixed gameplay hang: `allWavesComplete` no longer gates movement/blocking/cleanup in EnemyManager
- Fixed blocking: `Enemy.getCurrentTile()` uses pixel position, not waypoint index — blocking works between waypoints
- Spawn/goal markers now survive `clearWaypoints()` and tile painting
- Editor: painting tiles no longer clears waypoints; waypoint mode protects spawn/goal
- Restart button added to GameScene
- Medic renamed to Mechanic (atk=200, thermal damage)
- Written multi-route plan: first-class Route objects, pseudo-3D oblique tilt perspective, air units via elevation, route differentiation strategies
- Files: `src/entities/Enemy.ts`, `src/systems/EnemyManager.ts`, `src/systems/CombatSystem.ts`, `src/scenes/EditorScene.ts`, `src/scenes/GameScene.ts`, `src/config/units.ts`, `.opencode/plans/multi-route-plan.md`
- Branch: `feat/waypoint-painting`

## [2026-06-12] Phase 3 — Enemy Movement
- Enemy configs: Scout Car, APC, Tank, Drone (different speeds, HP, colors)
- Enemy entity: colored circles, smooth pixel movement along waypoints
- Wave-based spawning system: configurable entries per wave with spawn intervals
- Block count collision: ground units stop enemies; blocked enemies queue on unit
- Walk-past: enemies bypass when unit's block limit is full
- Objective collision: enemy reaching goal costs 1 life
- Battle flow: START BATTLE button → waves spawn → enemies move along route
- HUD: lives counter, wave/enemy count, battle status
- Level config: lives field added to LevelData
- Sample level updated with 2 waves (soldiers → troopers → heavy)
- Files: `src/config/enemies.ts`, `src/entities/Enemy.ts`, `src/systems/EnemyManager.ts`
- Unit config definitions: Vanguard, Guard, Defender, Sniper, Caster, Medic
- Real-time deployment system: click tile → deploy unit (DP deducted immediately)
- Deployment validation: tile type matching (ground→route, ranged→off-route), tile occupied check, limit check, DP check
- DP auto-generation: 1/sec baseline, configurable per level, capped at 99
- Unit DP costs: deducted on deploy, refund half on retreat
- Deployment limit: configurable cap on active units (default 8)
- Unit retreat: right-click to remove, refund half DP cost, free slot
- Unit rendering: colored shapes (rounded rects for ground, triangles for ranged), HP bars, block count indicators
- In-game HUD: DP counter, unit count/limit, selection palette
- Files: `src/config/units.ts`, `src/systems/DeploymentSystem.ts`, `src/entities/Unit.ts`, `src/scenes/GameScene.ts`
