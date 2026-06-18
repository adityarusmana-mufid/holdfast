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
