# Holdfast — Agent Documentation

## Development Commands
- Dev server: `npm run dev`
- Typecheck: `npx tsc --noEmit`
- Test: `npm test`
- Build: `npm run build`
- Lint: not configured

## Tech Stack
- Frontend: TypeScript
- Framework: Phaser 3
- Build: Vite
- Testing: Vitest (planned)
- Deployment: Static web/itch.io

## Design Philosophy

Holdfast is a **premium, mission-based tactical tower defense** inspired by Arknights' combat — not a live-service game with gacha progression. All units are available from the start; no rarity, no pulls, no banners, no grinding. Satisfaction comes from mastering mechanics, not accumulating numeric upgrades. Full spec: `docs/superpowers/specs/2026-06-30-design-philosophy.md`

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
- `main` is the stable, release-ready branch. Do not develop or commit on it.
- `dev` is the only active development branch. Start and continue all work there.
- Commit each coherent change immediately after its focused check; do not combine unrelated fixes.
- Before promoting `dev` to `main`, run typecheck, tests, and build, then review the diff.
- Promote only verified, intentional milestones from `dev` to `main`; keep both branches long-lived.

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

## Skills (project-specific)
- `designing-holdfast-levels` — Use when creating or editing level JSONs. Covers Arknights-inspired structure, tile placement, enemy escalation, wave pacing, validation. Saved in `.opencode/skills/designing-holdfast-levels/`.
- `phaser-patterns` — Use when creating, editing, or reviewing ANY Phaser scene or component. Its primary function is structured scene layout: detecting overlapping/squished elements, verifying visual hierarchy, enforcing minimum gaps and touch targets. Always invoke before writing new scene code or reviewing existing scenes.

## Reference Sources
Arknights game mechanic references documented in `.opencode/explore/2026-06-12-design-decisions.md`:
- Primary: `https://arknights.wiki.gg/` (official fansite wiki)
- Secondary: Gamepress guides, Naavik analysis, Pro Game Guides

## Coverage Threshold
- Minimum 80% line coverage enforced in CI

## Vision / Screenshot Analysis

| Approach | Model | Cost | Use Case |
|----------|-------|------|----------|
| `@vision` subagent | combo-ngirit (budget) | 9router tokens (1×) | One-off pixel analysis |
| `@vision` override | combo-qwen | 9router tokens (2-3×) | Needs more detail |
| `vision_describe` MCP | Gemini API | **Free** (1500/day) | Frequent analysis |

**Screenshot capture:** `scripts/screenshot.mjs` (Playwright, captures game at localhost:3000)

Full guide: `.opencode/vision-setup.md`

### Token Economy
- The subagent auto-reports estimated output tokens: `~{N} output tokens used`
- Default to **MCP** (free) over `@vision` when possible
- Override model with: `@vision (use combo-qwen) Read ...`

### Quick Workflow
```bash
node scripts/screenshot.mjs                    # capture
@vision Read /tmp/opencode/game-screenshot.png # analyze (budget)
vision_describe("/tmp/opencode/game-screenshot.png")  # analyze (free)
```
