# Holdfast — Team Selection & Unit Subtypes Design

**Date:** 2026-06-15
**Status:** Draft (pending user review)
**Scope:** v1 team selection screen and 12-subtype roster

---

## 1. Motivation

Arknights' strategic depth comes from **team composition** — picking the right 12 units from a large roster, then deploying a subset within DP limits. Holdfast v1 needs this pre-level selection layer to create meaningful strategic choices without persistence/collection.

---

## 2. Constraints

| Constraint | Detail |
|---|---|
| No persistence | All progress is session-only or save-file |
| No skills/traits/talents | Deferred to future; subtype identity comes from stats/range/block/innate mechanics |
| No duplicate subtypes | Team can't have 2 of the same subtype |
| Deployment limit | Cap on active units during battle (6-8 default, configurable per level) |
| Retreat | Half DP refund, frees a deploy slot |
| One unit per tile | Deployment collision enforcement |
| No living creatures | All entities are mechanical/military vehicles |

---

## 3. Team Selection Screen

### Layout (Arknights-inspired)

```
┌──────────────────────────────────────────────┐
│  CHAPTER 1 · LEVEL 3                         │
│  DEPLOYMENT LIMIT: 8     STARTING DP: 20     │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐│
│  │  [1]  │  [2]  │  [3]  │  [4]  │  [5]  │  [6]  ││
│  ├──────┼──────┼──────┼──────┼──────┼──────┤│
│  │  [7]  │  [8]  │  [9]  │ [10] │ [11] │ [12] ││
│  └──────┴──────┴──────┴──────┴──────┴──────┘│
│                                              │
│  Squad: 5/12 selected                        │
│                                              │
│                          ┌──────────────────┐│
│                          │  START OPERATION ││
│                          └──────────────────┘│
└──────────────────────────────────────────────┘
```

### Flow

1. Player sees 6×2 grid of empty slots
2. **Click a slot** → opens a **horizontal scrollable row** at bottom of screen showing all 12 available unit cards
3. **Click a unit card** → fills the slot; card shows: name, subtype label, archetype icon, DP cost, HP/ATK/DEF summary
4. **Click a filled slot** → optionally shows unit info; click again to remove from squad
5. **Slot restriction**: once a subtype is assigned to any slot, it's grayed out in the selection panel
6. **Minimum 1, maximum 12** units in squad
7. **START OPERATION** button (right side) → enabled when squad ≥ 1
8. **Squad counter** below grid: "Squad: 5/12 selected"

### Empty slot appearance
- Dashed border, muted color
- Shows archetype icon hint (ground vs ranged filter hint)

---

## 4. The 12 Subtypes (v1 Roster)

Each subtype is **one unique unit** in the roster. No duplicates. All 12 belong to the 4 archetypes (Vanguard/Guard/Defender = ground, Sniper/Caster/Supporter/Medic = ranged).

### Ground Units (route-deployable)

| # | Subtype | Reference | HP | ATK | DEF | RES | DP | Block | Range | Attack Interval | Innate Mechanic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Pioneer** Vanguard | Siege | 1200 | 300 | 230 | 0 | 12 | 2 | meleeFront (→ self) | 1.05s | Passive: +1 DP/sec while deployed |
| 2 | **Charger** Vanguard | Bagpipe | 900 | 400 | 180 | 0 | 10 | 1 | meleeFront (→ self) | 1.0s | Kills refund 3 DP, retreat refunds full DP cost |
| 3 | **Fighter** Guard | Mountain | 1800 | 360 | 220 | 0 | 9 | 1 | meleeFront (→ self) | 0.78s | Heals 2% max HP on each attack |
| 4 | **Lord** Guard | SilverAsh | 1600 | 330 | 200 | 0 | 14 | 2 | ranged (2-tile frontal) | 1.2s | Ranged when not blocking, 0.8× ATK at range |
| 5 | **Arts Fighter** Guard | Surtr | 1400 | 280 | 180 | 15 | 12 | 1 | meleeFront (→ self) | 1.25s | Deals thermal (arts) damage |
| 6 | **Protector** Defender | Hoshiguma | 2200 | 280 | 380 | 0 | 19 | 3 | meleeFront (→ self) | 1.2s | Blocks 3 enemies |
| 7 | **Guardian** Defender | Saria | 2000 | 200 | 300 | 0 | 17 | 2 | meleeFront (→ self) | 1.5s | Heals adjacent ally for 50 ATK per attack |

### Ranged Units (off-route deployable)

| # | Subtype | Reference | HP | ATK | DEF | RES | DP | Block | Range | Attack Interval | Innate Mechanic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 8 | **Marksman** Sniper | Exusiai | 1000 | 310 | 100 | 0 | 12 | 1 | ranged4x3 | 1.0s | Targets aerial enemies first |
| 9 | **Artilleryman** Sniper | Meteorite | 1100 | 280 | 120 | 0 | 16 | 1 | ranged4x3 | 2.0s | AoE splash (1-tile radius) |
| 10 | **Core** Caster | Eyjafjalla | 1050 | 410 | 80 | 15 | 19 | 1 | ranged4x3 | 1.6s | Thermal damage (ignores DEF, checks RES) |
| 11 | **Splash** Caster | Mostima | 900 | 360 | 70 | 15 | 17 | 1 | ranged4x3 | 2.2s | AoE thermal splash (1-tile radius) |
| 12 | **Decel Binder** Supporter | Angelina | 800 | 200 | 60 | 10 | 12 | 1 | ranged4x3 | 1.5s | Attacks slow enemy movement 50% for 1s |

### Stats Philosophy
- Base stats match Arknights 6-star E0 max (no module, no pot) — see `src/config/units.ts` after update
- DP costs are the primary balance lever: expensive units (Protector 19, Core Caster 19) force hard choices
- RES values: thermal units have 10-15 RES, physical units 0
- Attack intervals directly from Arknights reference

---

## 5. Deferred Features (Documented for Future)

### Skills

Each operator in Arknights has 1-3 skills. For future v2, these would add tactical depth:

| Subtype | Skill Archetypes |
|---|---|
| Pioneer | DP-generation burst, ATK buff |
| Charger | Attack buff, multi-hit |
| Fighter | Self-buff, AoE cleave |
| Lord | Range extension, ATK conversion |
| Arts Fighter | HP drain, DEF ignore |
| Protector | DEF buff, self-heal |
| Guardian | AoE heal, DEF buff |
| Marksman | Multi-shot, ATK speed up |
| Artilleryman | Bigger splash, ATK up |
| Core Caster | Ignition (ATK multiplier), Volcano (massive AoE) |
| Splash Caster | Wider splash, slow |
| Decel Binder | Wider slow, ATK debuff |

### Traits
- Currently left as "nothing special" for most subtypes
- Future: implement wiki trait descriptions (e.g., Marksman "attacks aerial enemies first", Lord "ranged attack when not blocking")
- Some traits are already embedded as innate mechanics (e.g., Marksman targeting logic)

### Talents
- E1/E2 unlock passives (e.g., Siege's "King of Beasts", Mountain's "Sturdy Constitution")
- Future: implement as permanent passives on the unit

### Operator Modules
- Equipment upgrade paths (3 levels per module)
- Future: choose a module path that modifies trait/talents

### Specialist Class
- Entire class deferred — mechanics like shift (push/pull), summon, trap, fast-redeploy require skills system to be meaningful
- Could add 2-3 Specialist subtypes in v2

---

## 6. Implementation Priority

### P0 — Must have for v1 launch
- [ ] 12-subtype unit configs (update `src/config/units.ts`)
- [ ] Team selection scene (new `src/scenes/TeamSelectScene.ts`)
- [ ] Selection UI: 6×2 grid + horizontal scrollable card panel
- [ ] Squad state passed to GameScene via scene data
- [ ] GameScene reads squad instead of palette from UNIT_CONFIGS
- [ ] Deployment limit applies during battle

### P1 — Should have
- [ ] Unit info tooltip/card on hover in selection panel
- [ ] Level info header (chapter, deployment limit, starting DP)
- [ ] Save/load squad composition

### P2 — Polish
- [ ] Animations for placing/removing squad members
- [ ] Archetype filter tabs in selection panel
- [ ] "Random fill" button

---

## 7. Data Flow

```
TeamSelectScene                     GameScene
    │                                   │
    │  User picks 5 units               │
    │  from 12-subtype roster            │
    │                                   │
    │  START OPERATION ─────────────────>│
    │  scene.start('GameScene', {       │
    │    level: levelData,              │
    │    squad: [subtypeIds...]         │
    │  })                               │
    │                                   │
    │                         ┌─────────┴──────────┐
    │                         │  GameScene reads:   │
    │                         │  - this.levelData   │
    │                         │  - this.squad       │
    │                         │  filters palette to │
    │                         │  only squad units   │
    │                         └─────────────────────┘
```

### Squad to palette mapping
- GameScene replaces `UNIT_CONFIGS` (all units) with `this.squad` (selected subset)
- Unit palette renders only squad members
- Each unit shows its subtype name, not just archetype
- DP cost, ranged/ground type shown per card

---

## 8. Impact on Existing Systems

### `src/config/units.ts`
- Expand from 6 to 12 UnitConfig entries
- Each entry gets a `subtype` field and an `archetype` field
- `subtype`: unique identifier (e.g., `'pioneer'`, `'charger'`, `'fighter'`)
- `archetype`: grouping tag (e.g., `'vanguard'`, `'guard'`, `'defender'`)

### `src/scenes/GameScene.ts`
- Build palette from squad data instead of all UNIT_CONFIGS
- Palette shows subtype labels
- Stats panel shows subtype + archetype info

### `src/types/index.ts`
- Add `subtype` and `archetype` fields to `UnitConfig`
- Add `SquadUnit` type for team selection tracking

### New files
- `src/scenes/TeamSelectScene.ts` — team selection screen
- `src/config/units.ts` (rewritten) — 12-subtype configs with reference stats

---

## 9. Deferred Scope (Explicitly Not in v1)

| Feature | Why deferred |
|---|---|
| Specialist class (Push Stroker, Hookmaster, etc.) | Mechanically shallow without skills; complex to implement |
| Skills system | Requires SP, activation, duration UI — massive scope |
| Talent system | Coupled to promotion (E1/E2) — no progression in v1 |
| Module system | Tied to talent upgrades — no persistence in v1 |
| Summoner Supporter | Requires summon entity system — complex |
| Trapmaster | Requires trap placement UI — complex |
| Account/persistence | Out of scope for Holdfast 1 |
