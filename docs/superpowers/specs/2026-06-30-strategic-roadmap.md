# Strategic Roadmap — Holdfast

> We are in the **game design phase**, not the engine programming phase.
> The foundation is built. Next gains come from designing enemies, maps,
> and skills that make players think differently, not from writing new systems.

## What's Already Built (The Hard Parts)

These are **done** — do not reopen unless a bug is found:

- Deployment system (DP costs, regen, cooldowns, per-instance tracking)
- Blocking and overflow
- Combat system (damage types, targeting, traits, AoE, splash, chain)
- Skill system (SP gain, auto/manual/toggle, charges, duration tracking)
- Healing system (single, multi, AoE, repair node passive)
- Trait system (all 19 traits)
- Pathfinding (dynamic rerouting, blocked tile management)
- Enemy types (5: Scout Car, APC, Tank, Drone, Artillery Caster)
- Wave system (prelude, spawning, intervals)
- Wave preview (caterpillar path preview on prelude)
- Pause-deploy flow
- Enemy introduction toasts
- Perspective grid rendering (trapezoid tiles, click detection)
- Light theme across all scenes
- Squad presets (4 slots, rename, auto-save)
- Level editor (tile painting, routes, waves, JSON export)
- Range editor (design range patterns visually)
- 46 levels across 5 chapters
- 26 subclasses, 78 skills
- Unit death animation
- Combat effects (projectiles, swings, splash rings, burst particles)
- GameScene HUD (DP, lives, wave counter, speed, pause, inspect panel)
- Result screen (stars, tap to return)

## Priority Fence

These tiers define what we spend time on. Anything not listed here is
**out of scope until explicitly prioritized**.

### Tier 1 — Highest Impact on Strategic Depth

**New enemy behaviors.** This is the single highest-leverage investment.
Strategy emerges when enemies force different responses. 5 enemy types with
different stats is not enough.

All must be mechanical/vehicle themed. Keep them behavior-only — no new
combat subsystems needed:

- Fast scout drone that ignores blocking
- Heavy breacher that occupies 2 block
- Shield carrier with frontal armor (damage reduction from one direction)
- Jammer vehicle reducing attack speed of nearby units
- EMP vehicle that disables skills in radius
- Self-destruct drone that rushes in and explodes
- Transport APC that releases smaller enemies on death
- Long-range artillery that targets deployed units
- Repair vehicle that heals nearby enemies
- Stealth recon vehicle (invisible until it attacks or is spotted)

### Tier 1b — Skill Rework

Many skills are numeric variants (+40% ATK vs +50% ATK) that don't create
meaningful choices. Rework weak skills so each choice changes how a unit
plays, not just its numbers.

Examples of good skill distinctions:
- Burst DPS (short duration, high impact) vs extended range (lower damage,
  better coverage) — neither is objectively stronger, they suit different maps
- One skill changes the unit's role (e.g., defender becomes artillery)
- Trade-off: more power vs more utility

### Tier 2 — High Impact, Smaller Scope

**Tile mechanics.** A few well-designed tile types multiply strategic depth
without adding more units:

- High ground (ranged units get bonus, ground units blocked)
- Slow terrain (reduces enemy movement speed)
- Conveyor belt (pushes enemies in a direction, can redirect)
- Destructible obstacle (blocks path until destroyed)
- Hazard tiles (damage enemies standing on them)
- One-way deployment zones (ground only / ranged only)
- Elevation restrictions (certain units on high ground only)

### Tier 3 — Polish, Not New Content

**Range accuracy fixes** — only where behavior feels genuinely wrong.
Most players won't notice sub-1-tile differences. Fix patterns that cause
frustration, not those that deviate from Arknights canon.

### Out of Scope (The Fence)

These are **explicitly not happening** in Holdfast 1. If someone proposes
them, the answer is no without further discussion:

- No new subclasses (26 is enough; depth over breadth)
- No gacha, rarity, pulls, banners, pity systems, premium currencies
- No unit levels, promotions, permanent stat upgrades, trust systems
- No base building
- No stamina, daily missions, battle pass, live-service calendar
- No accounts, cloud save, multiplayer, leaderboards
- No pixel art upgrade (v1 geometric shapes are the final style)
- No 2.5D or 3D perspective change
- No story/writing expansion beyond existing chapter framework
- No new scenes, no UI framework rewrites, no engine migrations

## Decision Framework

When evaluating any proposed feature or change, ask:

1. **Does this create a new strategic decision for the player?**
   If yes, it fits. If it just adds more of the same (more stats, more
   subclasses, more levels without new mechanics), skip it.

2. **Does this require a new system?**
   If yes, it's expensive. Prefer changes that use existing systems (new
   enemy behavior, new tile type with existing effects, skill number tuning).

3. **Does this make existing content more interesting?**
   A new enemy that interacts with an existing tile type makes both more
   interesting. A new subclass that just fills a gap adds surface area
   without depth.

4. **Would players notice this is missing?**
   If they wouldn't, don't build it.

## Resource Awareness

Development time is limited. Every month spent on out-of-scope work is a
month not spent shipping. A finished, released Holdfast builds the portfolio,
generates player feedback, and can earn income. An ever-expanding scope
prevents all three.

## What Success Looks Like

Holdfast 1 ships with:

- A polished campaign of ~46 levels across 5 chapters
- 10+ enemy types with distinct behaviors (not just stats)
- 26 subclasses where all 3 skills create meaningful choices
- 6-8 tile types that interact with units and enemies
- Optional challenge objectives, difficulty modes
- Zero gacha, zero grind, zero accounts

The question after every level is not "what do I grind to beat this?"
but "what strategy should I try next?"
