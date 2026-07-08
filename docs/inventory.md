# Holdfast — Codebase Inventory

## Scenes (Phaser entry points)

| Scene Key | Class | Short Name | Purpose |
|-----------|-------|------------|---------|
| `BootScene` | `BootScene` | **Boot** | Preloads assets (firefly, particle, smoke textures), then starts HomeBridge |
| `HomeBridgeScene` | `HomeBridgeScene` | **Home / Title** | Main menu — icosahedron, fireflies, smoke, parallax; buttons: TERMINAL, SQUAD PRESET, LEVEL EDITOR, RANGE EDITOR (dev) |
| `ChapterSelectScene` | `ChapterSelectScene` | **Chapter Select** | Picks a chapter from CHAPTERS config; cards with chapter title and level count |
| `LevelSelectScene` | `LevelSelectScene` | **Level Select** | Scrollable level nodes along a track for a chapter; info panel on tap; ENTER/INTEL buttons |
| `LevelPreviewScene` | `LevelPreviewScene` | **Level Preview (Intel)** | Overlay scene with MAP tab (grid render) and ENEMY INTEL tab (enemy cards) |
| `SquadScene` | `SquadScene` | **Squad / Team Builder** | 12-slot grid to pick units and skills; Auto Fill; Start Mission button |
| `PickerScene` | `PickerScene` | **Unit Picker** | Overlay launched from SquadScene; filterable unit cards, stat/skill/trait info, skill selector |
| `GameScene` | `GameScene` | **Game / Battle** | Core TD gameplay — grid, deploy, combat, HUD, speed/pause, inspect, results |
| `ResultScene` | `ResultScene` | **Result** | Victory/defeat screen with stars, stats, tap to return |
| `EditorScene` | `EditorScene` | **Level Editor** | Full level editor — tile palette, routes, wave config, export/import JSON, play test |
| `RangeEditorScene` | `RangeEditorScene` | **Range Editor** | Mini-grid for designing range patterns; left-click paint, right-click move unit; copy JSON |

## Effects (visual polish)

| File | Class | Short Name | Purpose |
|------|-------|------------|---------|
| `Icosahedron.ts` | `Icosahedron` | **Icosahedron** | 3D wireframe icosahedron (12 verts, 30 edges), perspective projection, 4°/s Y rotation |
| `FireflyEffect.ts` | `FireflyEffect` | **Fireflies** | 18 warm-orange floating dots with sinusoidal drift and lifecycle |
| `SmokeAmbient.ts` | `SmokeAmbient` | **Smoke** | 6 cool-white cloud blobs with ADD blend, slow drift + rotation |
| `MouseParallax.ts` | `MouseParallax` | **Parallax** | Lerp-based container offset (15px intensity, 0.05 speed) |
| `CombatEffects.ts` | _(functions)_ | **Combat VFX** | Projectiles, swing, wind-up, chain bolt, splash ring, burst particles, expand ring, flash damage, buff particles, spark hit, heal cross |

## UI Components (reusable)

| File | Key Exports | Short Name | Purpose |
|------|-------------|------------|---------|
| `Components.ts` | `fillBeveledRect`, `drawCornerBrackets`, `drawGridBg`, `makeNodeButton`, `makeLabel`, `drawUnitCard`, `drawEmptyUnitCard`, `drawRangeMiniGrid` | **Components** | All reusable UI building blocks |
| `Constants.ts` | `COLORS`, `FONTS`, `FONT_SIZE`, `SPACING`, `TOP_BAR`, `SIDEBAR_W`, etc. | **Constants** | Colors, typography, layout constants |

## Entities (game objects)

| File | Class | Short Name | Purpose |
|------|-------|------------|---------|
| `Grid.ts` | `Grid` | **Grid** | Perspective tile grid (trapezoid tiles), tile rendering, pixel/tile conversion, level data I/O |
| `Unit.ts` | `UnitSprite` | **Unit Sprite** | Deployed friendly unit visual — body (square/triangle), HP/SP bars, facing indicator, block markers |
| `Enemy.ts` | `EnemySprite` | **Enemy Sprite** | Enemy visual — circle body, HP bar, direction indicator, status effects, movement, blocking, rerouting |

## Systems (game logic)

| File | Class | Short Name | Purpose |
|------|-------|------------|---------|
| `DeploymentSystem.ts` | `DeploymentSystem` | **Deployment** | DP management, unit placement/retreat, cooldowns, cost multipliers |
| `EnemyManager.ts` | `EnemyManager` | **Enemy Manager** | Wave sequencing, enemy spawning, movement, blocking, objective check, cleanup |
| `CombatSystem.ts` | `CombatSystem` | **Combat** | Unit attack logic, targeting, damage calculation, AoE, splash, chain, wind-up, pending attacks |
| `HealingSystem.ts` | `HealingSystem` | **Healing** | Single/multi/AoE healing ticks, repair node passive heal |
| `SkillSystem.ts` | `SkillSystem` | **Skills** | SP gain, auto/manual/toggle activation, charges, skill state management |
| `TraitSystem.ts` | `TraitSystem` | **Traits** | Trait checks, splash config, adjacent-ally helpers |
| `PathSystem.ts` | `PathSystem` | **Pathfinding** | BFS flow field for dynamic rerouting; blocked tile management |

## Config (data definitions)

| File | Key Export | Short Name | Purpose |
|------|-----------|------------|---------|
| `units.ts` | `UNIT_CONFIGS` | **Unit Configs** | 25+ unit definitions (Pioneer, Fighter, Arts Fighter, Centurion, Protector, etc.) |
| `enemies.ts` | `ENEMY_CONFIGS` | **Enemy Configs** | 5 enemy types: Scout Car, APC, Tank, Drone, Artillery Caster |
| `skills.ts` | `SKILLS` | **Skill Configs** | All skill definitions keyed by unit id (3 skills each for ~25 units) |
| `chapters.ts` | `CHAPTERS`, `getLevelData`, etc. | **Chapters** | 5 chapters (0-4), 46 level imports, chapter metadata, level lookup functions |

## Shared (utilities, types, serialization)

| File | Key Exports | Short Name | Purpose |
|------|-------------|------------|---------|
| `types/index.ts` | All interfaces/enums | **Types** | Tile, TileType, Position, Route, Wave, LevelData, Direction, DamageType, Unit/Enemy/Skill configs, DeployedUnit, SkillState, etc. |
| `GridMath.ts` | `RANGE_PATTERNS`, `positionsInRange`, `rotatePattern`, `computeFlowFieldToRoute`, etc. | **Grid Math** | Range patterns (15 named), tile queries, distance, neighbor, flow field BFS |
| `LevelValidation.ts` | `validateLevelData` | **Level Validation** | Validates name, tiles, routes, waves for a LevelData object |
| `levelHelpers.ts` | `tutorialSquad` | **Level Helpers** | Tutorial-specific squad presets for TR levels |
| `SaveData.ts` | `saveCompletion`, `isLevelUnlocked`, `saveSquad`, etc. | **Save Data** | localStorage persistence for completions, squads, skill picks |
| `Layout.ts` | `TW`, `HAIRLINE`, `DESIGN` | **Layout** | Legacy layout constants |
| `pixelart.ts` | `generateTexture`, `SPRITE_DEFS` | **Pixel Art** | Procedural pixel sprite generation for units/enemies |

## Editor / Serialization

| File | Key Exports | Short Name | Purpose |
|------|-------------|------------|---------|
| `LevelSerializer.ts` | `serializeLevel`, `deserializeLevel`, `exportLevelToFile`, `importLevelFromFile` | **Level Serializer** | JSON export/import for level files via download/upload |

## Entry Point

| File | Role |
|------|------|
| `main.ts` | Phaser game config, scene registration, fullscreen toggle |
