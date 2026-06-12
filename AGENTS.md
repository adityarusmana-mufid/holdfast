# Arknights Fan Game — Agent Documentation

## Development Commands
- Lint: TBA
- Typecheck: TBA
- Test: TBA
- Build: TBA

## Tech Stack
- Frontend: TypeScript
- Framework: Phaser 3
- Build: Vite
- Testing: Vitest (planned)
- Deployment: Static web/itch.io

## Key Design Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grid size | Variable (editor-driven) | No hardcoded limits |
| DP system | Auto-gen 1/sec + starting DP per level | Creates pacing tension |
| DP costs | Per-unit DP cost | Trade-off decisions between units |
| Retreat refund | Half DP cost | Strategic cost for misplacement |
| Deployment limit | Cap on active units | Prevents flooding; 6-8 default |
| Block count | Ground units block 1-3 enemies | Makes melee units matter |
| Range patterns | Multiple (cross, square, diamond) | Core to Arknights identity |
| Enemy waves | Wave-based | Meaningful game loop |
| Routing | Fixed waypoints (no pathfinding) | Simplified by grid route tiles |
| Level creation | Visual editor first | Faster iteration |
| Deployment zones | Ground = route, Ranged = off-route | Mirrors Arknights core |
| Visual style (v1) | Colored geometric shapes | Pixel art deferred to v2 |

## Version Control Standards

Branch naming, commit conventions, and workflow defined in `.opencode/sops/branch-naming-standard.md`.
**One concern per commit. Max 3 files across 2 concerns per commit.**

### Commit Convention
```
type(scope): description
```
Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
Keep descriptions under 72 chars, imperative mood.

### Workflow
- Topic branches from `main`, merge via PR
- Always work on topic branch, never `main`
- After every phase: run verification gate (lint → typecheck → test → build)
- Delete branches after merge

## Documentation
Design specs in `docs/superpowers/specs/`.
Exploration logs in `.opencode/explore/`.

## Project Structure
```
src/
├── game/          # Core game logic (scenes, entities, systems)
├── editor/        # Level editor (UI, tile painting, serialization)
├── shared/        # Types, grid math, utilities
└── assets/        # Sprites, tiles
levels/            # JSON level files
```

## Known Quirks
- Grid-based tower defense logic (no floating-point distances)
- Predefined enemy routing via waypoints
- Visual editor exports JSON consumed by game engine
- Ground units deploy on route tiles, ranged units deploy off-route

## Deferred (v2+)
- Unit selection (choose which units to bring)
- Simple gacha for unit acquisition
- Unit talents, level-upgrade, stats, promotion
- Progression unlocks (levels grant new units)
- Pixel art visuals
- Sound effects and music
- Multiple spawn points / enemy type config
- Advanced enemy AI (splitting, flying)
- Unit blocking mechanics

## Reference Sources
Arknights game mechanic references documented in `.opencode/explore/2026-06-12-design-decisions.md`:
- Primary: `https://arknights.wiki.gg/` (official fansite wiki)
- Secondary: Gamepress guides, Naavik analysis, Pro Game Guides

## Coverage Threshold
- Minimum 80% line coverage enforced in CI
