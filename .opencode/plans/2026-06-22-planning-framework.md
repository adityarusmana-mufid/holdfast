# Holdfast — Planning Framework (Revised 2026-06-22)

## The Old Model (discarded)

Previous planning assumed:
- v1 = colored shapes, v2 = pixel art → 3D (two separate games "Holdfast 1" / "Holdfast 2")
- Features gated by "can we render this with shapes?" or "wait for pixel art"
- Release was a milestone event with batched features

## The New Model

**One project, one aesthetic, continuous iteration.**

| Old | New |
|-----|-----|
| Shapes → pixel → 3D pipeline | Geometric shapes, permanent |
| Holdfast 1 / Holdfast 2 as separate games | One game, one project |
| Art-driven feature gating | Design-driven: "does this create interesting tactical decisions?" |
| Batched releases | Each feature ships when ready |
| Manual upload to itch.io | CI/CD via butler + GitHub Actions |
| No persistence / no accounts (cut) | localStorage saves + exportable file (cheating is fine) |
| Gacha / collection (cut entirely) | Unit acquisition tied to level completion (TBD) |

## Why This Changed

1. **itch.io CI/CD is trivial.** `remarkablegames/setup-butler` + `butler push ./dist user/game:html` in a GitHub Action. Push to `main` → build → deploy. Release friction is zero. Players always see the latest.

2. **Shapes are the aesthetic.** The constraint is "no living creatures." Geometric military vehicles read clearly and distinguish factions by color/shape. Details can be added later (treads, turrets, barrel), but shapes aren't a placeholder — they're the look.

3. **The tactical design space is what matters.** Every feature is evaluated on one axis: "does this create an interesting decision for the player?" Not "can we render it."

4. **Persistence is required, not optional.** Players need progress saved: which levels are unlocked, what units are available. localStorage handles this. Cheating (editing saves) is fine — single-player game, no leaderboards, no competition. Just don't let it break the game for others (it can't — it's single-player).

## Feature Priority = TR-number Order

Arknights' TR tutorials are ordered by fundamental importance. Each is a prerequisite for the next. **Our implementation priority follows this exact order:**

| Priority | TR | Concept | Core Mechanic |
|----------|----|---------|---------------|
| 1 | TR-1 | Sustain | Healing system — Medics restore HP |
| 2 | TR-2 | Core deploy | Direction sets attack range, locked on deploy |
| 3 | TR-3 | Enemy variety | Aerial enemies immune to melee, need anti-air |
| 4 | TR-4 | Resource economy | Block count + DP generation (Vanguard role) |
| 5 | TR-5 | Damage types | Physical vs Thermal vs True, DEF/RES matching |
| 6 | TR-6 | Class synergies | Defender clusters + AoE clears |
| 7 | TR-7 | Player timing | Manual skill activation, SP charge, cooldown |
| 8 | TR-8 | Player obstacles | Deployable roadblocks redirect pathing |
| 9 | TR-9 | Map devices | Static battlefield tools (stun, etc.) |
| 10 | TR-10 | Target priority | Last-deployed aggro manipulation |
| 11 | TR-11 | Elite kill combo | Slow + single-target damage synergy |
| 12 | TR-12 | Formation | Spacing against AoE enemies |
| 13 | TR-13 | Intercept | Guard duels key enemy before it reaches main line |
| 14 | TR-14 | Terrain kills | Push/pull into pits (negative height tiles) |
| 15 | TR-15 | Retreat economy | DP refund on undeploy, resource cycling |
| 16 | TR-16 | Status effects | Cold → Frozen chain, counter-play |
| 17 | TR-17 | Buff auras | Enemy force multipliers, target prioritization |
| 18 | TR-18 | Secondary objectives | Escort, protect NPCs, objective variety |
| 19 | TR-19 | Destructible environment | Collapsible map elements, area denial |
| 20 | TR-20 | System intersection | Friendly fire, block count × enemy mechanic |
| 21 | TR-21 | Strategic trade-offs | Negative consequences for actions, timing choice |

Each feature is independent — build, ship, repeat. No batching. The TR order is a suggestion, not a gate.

## Height System

The codebase already has elevation concepts:
- `TileType.Ranged` and `TileType.Wall` are "elevated" — visually raised with shadow strips
- 3D wireframe cubes (18px height) on spawn/goal tiles
- Trapezoid perspective creates depth

### Aerial enemies (TR-3)
No new height code needed. Aerial enemy body renders above its ground position; a ground shadow (ellipse) on the route tile below communicates altitude visually. Player sees "shadow on route = something above it." Same elevation visual language the grid already uses.

### Pit tiles for terrain kills (TR-14)
New tile type: `pit`. Negative height — visually rendered as a dark trapezoid receding downward (inverted elevation). Shadow rim around the edge. Perspective math is identical to elevated tiles, just negative direction. Enemies pushed/knocked into a pit are destroyed instantly.

### Future: detailed icons
Ground shadow + elevated body is the v1 aerial system. Later, distinct vehicle icons for all units and enemies (still geometric, just more detailed). The shadow stays as the altitude indicator.

## Storage & Progress Model

- **Save location:** `localStorage` (key: `holdfast_save`)
- **Save contents:**
  - Unlocked levels list
  - Unlocked units roster
  - Per-level best performance (optional)
- **Export/import:** Save file is JSON — player can copy to clipboard, save as `.json` file, share, edit
- **Cheating:** Not prevented. Editing a save to unlock everything is fine. This is a single-player tactical game. No leaderboards, no competition, no anti-tamper.
- **Unit acquisition:** Simple model — clear a level, earn its reward unit. Or: starting roster covers all basic classes, special units unlocked via level completion.
- **No accounts, no cloud saves.** Everything is local. If the player clears their browser data, they lose progress — that's acceptable.

## Deployment Pipeline

```yaml
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: remarkablegames/setup-butler@v3
      - run: butler push ./dist adityatheDev/holdfast:html
        env:
          BUTLER_API_KEY: ${{ secrets.BUTLER_API_KEY }}
```

Every push to `main` deploys. No version tags required. The itch.io page always has the latest build.

## What to Cut (from the old plan)

- Holdfast 2 (separate 3D project) — cancelled, not deferred
- Base building (Arknights-style base management)
- Pixel art pipeline — shapes permanently
- Accounts / cloud sync
- Anti-cheat / tamper prevention
- Multiplayer / leaderboards

## Continuous Iteration Contract

- `main` is always playable. Half-built features are behind flags.
- Every push deploys. Players always see latest.
- Features ship independently — no releases, no versions.
- If a feature isn't fun, revert it. Cost to try is near zero.
- Itch.io description: "Ever-evolving tactical tower defense experiment."

## Open Questions

- Dev channel vs stable channel? Two butler channels (`html` and `html-dev`) or just one?
- Minimum viable first public: tutorial only? Chapter 1? All of Prologue?
- In-game changelog or just itch.io description?
- Unit acquisition model: fixed roster per level (current) or unlocked progression?
