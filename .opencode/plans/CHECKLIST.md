# Tanknights Checklist

**Total items:** 20 across 5 phases
**Last updated:** 2026-06-12

> ⚠️ **After every phase, run verification gate:**
> ```
# npm run lint, typecheck, test, build (once commands exist)
> ```

---

## Phase 0 — Documentation & Design ✅

- [x] 0.1 Create project documentation structure
- [x] 0.2 Brainstorm game mechanics and requirements
- [x] 0.3 Propose technology stack options
- [x] 0.4 Present design for user approval
- [x] 0.5 Write design specification document
- [x] 0.6 Create implementation plan

---

## Phase 1 — Grid & Editor

- [ ] 1.1 Scaffold Phaser 3 + Vite + TypeScript project
- [ ] 1.2 Implement grid rendering (tiles, borders, colors)
- [ ] 1.3 Build level editor scene with tile palette
- [ ] 1.4 Implement tile painting (click to set tile type)
- [ ] 1.5 Add spawn/objective marker placement
- [ ] 1.6 Route auto-generation from painted route tiles
- [ ] 1.7 JSON export/import for levels
- [ ] 1.8 Add level config fields to editor (startingDP, dpRegenRate, dpCap, deploymentLimit)

---

## Phase 2 — Unit Deployment

- [ ] 2.1 Unit config data structure (dpCost, blockCount, hp, attack, rangePattern)
- [ ] 2.2 Unit placement system (click valid tile → deploy)
- [ ] 2.3 Deployment validation (tile type, one-unit-per-tile)
- [ ] 2.4 DP system — auto-generation at 1/sec, starting DP per level, cap
- [ ] 2.5 Unit DP costs — deducted on deploy, checked before allow
- [ ] 2.6 Deployment limit enforcement (max active units)
- [ ] 2.7 Unit retreat — remove unit, refund half DP cost, start redeploy timer
- [ ] 2.8 Unit rendering (colored shapes for v1)

---

## Phase 3 — Enemy Movement

- [ ] 3.1 Enemy spawning system
- [ ] 3.2 Enemy config data structure (hp, attack, speed)
- [ ] 3.3 Waypoint following along route tiles
- [ ] 3.4 Block count collision — enemies stopped by blocking units, fight until death
- [ ] 3.5 Walk-past — enemies bypass unit if block limit exceeded
- [ ] 3.6 Objective collision detection (enemy reaches goal)
- [ ] 3.7 Enemy rendering (colored shapes for v1)

---

## Phase 4 — Combat

- [ ] 4.1 Unit auto-attack logic (attack interval, target blocked enemies first)
- [ ] 4.2 Range calculation (cross/square/diamond/melee patterns)
- [ ] 4.3 Block interaction — ground units fight blocked enemies; ranged units attack in range
- [ ] 4.4 Damage and HP system (physical damage, DEF reduction)
- [ ] 4.5 Enemy death handling (remove from grid, free block slot)

---

## Phase 5 — Game Loop

- [ ] 5.1 Wave spawning system (configurable waves per level)
- [ ] 5.2 Win/lose conditions
- [ ] 5.3 Game state management (prep → battle → result)
- [ ] 5.4 Basic UI (Life Points, DP counter, deployment limit, wave info)
- [ ] 5.5 End screen (victory/defeat)
- [ ] 5.6 Level loading from JSON
- [ ] 5.7 Verify: playable end-to-end with one level
