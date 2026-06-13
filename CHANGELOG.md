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
