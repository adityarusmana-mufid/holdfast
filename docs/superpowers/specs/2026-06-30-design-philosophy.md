# Holdfast Design Philosophy

> Holdfast is a premium, mission-based tactical tower defense inspired by Arknights — not a live-service game with gacha progression.

## Core Identity

Holdfast draws inspiration from Arknights' combat depth, deployment system, skill mechanics, and class identity — but **not** from its live-service economy (gacha, banners, pity, currencies, base building, long-term material grinding).

The game belongs to a lineage of premium puzzle-like strategy games:

- Into the Breach
- Mini Motorways
- Classic puzzle campaigns
- Infinitode 2

The satisfaction comes from **mastering mechanics, not grinding numbers.**

## What Holdfast Is

- A complete, shippable campaign of ~46 levels across 5 chapters
- Each level is a tactical puzzle: "Can you solve this with the tools you have?"
- Squad presets let you choose your loadout; upgrades are tactical (skill choice, composition), not numeric (ATK+10%, HP+20%)
- All units available from the start — no unlocking, no rarity, no pulls
- Replayability comes from optional challenge objectives, difficulty modifiers, and alternative strategies — not from grinding stronger units

## What Holdfast Is Not

- Not a gacha game. No random pulls, no duplicate units, no pity systems, no banners, no premium currency.
- Not a live-service game. No daily missions, no stamina, no seasonal events, no battle pass.
- Not an RPG. No unit levels, no promotions, no permanent stat upgrades.
- Not an account-based game. No sign-in, no cloud save, no backend. Progress is localStorage or session-only.
- Not Arknights. The combat is inspired by Arknights, but every surrounding system exists to serve a **complete single-player campaign**, not multi-year engagement.

## Why This Matters

This distinction is essential because it affects every design decision:

| Concern | Arknights (Live Service) | Holdfast (Premium Campaign) |
|---|---|---|
| Progression | Grind materials → promote units → unlock skills | Unlock next level → try new squad composition |
| Unit access | Gacha pulls, banners, shop rotations | All units available from start |
| Replayability | Daily/weekly content, events | Challenge objectives, difficulty modes, level modifiers |
| Balance | Must account for different player power levels | Every player faces the same puzzle |
| Development cost | Months of economy/banner/progression systems | Ship the campaign, iterate on levels |
| Financial model | Whale-driven F2P monetization | Premium sale (fixed price) |

## What Makes Levels Interesting (Not Grinding)

Replayability and depth come from strategic variety, not numeric power:

- Optional challenge objectives (e.g., "no retreats," "deploy ≤6 units")
- Harder difficulty modes (less starting DP, faster enemies, more waves)
- Limited squad slots (forced trade-offs)
- Alternative routes or enemy compositions
- Achievements
- Different starting DP / DP regen modifiers

These deepen the strategy without introducing an economy that every mission must account for.

## Relationship to Arknights

Arknights' combat systems worth adopting:

- Real-time deployment with DP economy
- Block count and overflow
- Ground/off-route deployment zones
- Class archetypes with distinct roles
- Skill system (SP recovery, activation types, charges)
- Range patterns and facing
- Wave-based enemy routing

Arknights' surrounding systems to **explicitly not adopt**:

- Gacha and rarity tiers
- Base building
- Material grinding and promotions
- Trust and potential systems
- Annihilation/rotating content
- Stamina and daily missions
- Live-service event calendar

## Resource Reality

Development time is limited. Every month spent building a gacha economy is a month not spent shipping. A finished, released Holdfast builds the portfolio, generates player feedback, and can earn income. An ever-expanding scope prevents all three.

## Visual Identity

- Colored geometric shapes (final v1 style, not placeholder)
- Mechanical/military vehicles only — no living creatures
- Light theme with tech blue accents
- Flat perspective grid

## Holdfast 1 vs Holdfast 2

| | Holdfast 1 | Holdfast 2 |
|---|---|---|
| Engine | Phaser 3 (2D) | Low poly 3D (separate project) |
| Scope | 3 chapters, simple TD | Full-featured game |
| Persistence | None (save file only) | TBD |
| Economy | None | TBD |
| Art | Colored shapes → pixel art | Low poly vehicles |

Holdfast 1 is the shippable campaign. Holdfast 2 is a separate future project with its own design decisions. Nothing in Holdfast 1 should assume Holdfast 2 exists.
