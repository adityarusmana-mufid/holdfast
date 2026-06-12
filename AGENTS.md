# Holdfast — Agent Documentation

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
| No living creatures | All entities = mechanical/vehicles only | Religious constraint (Islamic aniconism) — non-negotiable |
| itch.io AI policy | Must tag "Code" as AI-generated | Disclosure required; no ban, just transparency |

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

## Release Plan — Two Separate Games

| | Holdfast 1 | Holdfast 2 |
|---|---|---|
| **Engine** | Phaser 3 (2D) | Low poly 3D (separate project) |
| **Scope** | 3 chapters, simple TD | Full-featured game |
| **Persistence** | None | TBD |
| **Collection** | None | Could add systems |
| **Base** | None | TBD |
| **Art** | Colored shapes → pixel art | Low poly vehicles |

Holdfast 1 is self-contained — no accounts, no collection, no base. Just 3 chapters of levels with sequential unlock. Holdfast 2 is a future separate project.

## Critical Constraints
- **No living creatures** — never depict humans, animals, or living entities. All entities are mechanical/military vehicles (tanks, APCs, drones, artillery).
- **itch.io AI disclosure** — code is AI-written, must tag "Code" on publish. Art is procedural, not AI-generated.
- **No persistent/account storage** in Holdfast 1 — all progress is session-only or save-file.

## Reference Sources
Arknights game mechanic references documented in `.opencode/explore/2026-06-12-design-decisions.md`:
- Primary: `https://arknights.wiki.gg/` (official fansite wiki)
- Secondary: Gamepress guides, Naavik analysis, Pro Game Guides

## Coverage Threshold
- Minimum 80% line coverage enforced in CI
