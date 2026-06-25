# Game Pacing Research (Arknights TR Reference)

Use when determining Arknights TR stage placement, mechanics, and pacing for
Holdfast's tutorial progression. Belongs before any chapter restructuring or
tutorial level creation.

## Source of Truth

**wiki.gg navigation sidebar** is the authoritative source for chapter/episode
placement. Not wiki.gg article body text, not Gamepress, not memory — the
sidebar that lists "Prologue", "Episode 01", etc. with stage ranges.

## Canonical Query Template

Use this exact phrasing for each mechanic inquiry:

> on which chapter and TR stage did the concept and mechanics of
> <TOPIC/MECHANIC> did arknights introduced?

Search query: append `site:arknights.wiki.gg` to target the official wiki.

## Verification Procedure

1. **Fetch the stage page** from `https://arknights.wiki.gg/wiki/<STAGE_ID>`
   (e.g., `https://arknights.wiki.gg/wiki/TR-3`).
2. Confirm the chapter name in the page content (e.g., "Prologue") matches
   expectation.
3. Read the stage description and guide text for the exact mechanic taught.
4. Cross-reference against the **navigation sidebar** on any wiki.gg page to
   verify stage ranges per chapter.

## Chapter ↔ TR Mapping (Verified)

| Chapter | Episode | TR Stages | Total |
|---------|---------|-----------|-------|
| 0 | Prologue | TR-1 through TR-7 | 7 |
| 1 | Episode 01 | TR-8, TR-9, TR-10 | 3 |
| 2 | Episode 02 | TR-11, TR-12, TR-13, TR-14 | 4 |
| 3 | Episode 03 | TR-15 | 1 |

## Mechanic Mapping (Arknights → Holdfast)

| # | Arknights Name | Arknights Mechanic | Holdfast Mechanic |
|---|---------------|-------------------|-------------------|
| TR-1 | Combat Medicine | Medic healing | Defender + Medic (heal) |
| TR-2 | Directed Aim | Attack range & direction | Facing direction |
| TR-3 | Precise Strike | Aerial units need ranged | Ranged vs aerial (drones) |
| TR-4 | Vanguard | Vanguard blocks + DP gen | Vanguard DP generation |
| TR-5 | Originium Arts | Caster vs high DEF | Caster thermal vs armor |
| TR-6 | AoE Attacks | Defender + AoE Caster | AoE attacks (splash/line/chain) |
| TR-7 | Combat Skills | Skill activation + Defender tanking | Full formation (all roles) |
| TR-8 | Obstructions | Deployable roadblocks | AoE variants (no roadblocks in Holdfast) |
| TR-9 | Indirect Protection | Battlefield objects (Stun Generator) | Multi Medic multi-target healing (no objects) |
| TR-10 | Squad Defense | Deployment order / aggro | Supporter slow debuff (no aggro system) |
| TR-11 | Tactical Blockage | Supporter slow + Caster vs high-DEF | Supporter + Caster combo vs armor |
| TR-12 | Casters | Spread formation vs enemy AoE | Spread formation vs enemy AoE casters |
| TR-13 | Protective Deployment | Intercept elites with Guard | Guard intercepts elite units |
| TR-14 | Terrain Attack | Push/pull specialists into holes | Terrain advantage (RepairNode/ArmorGrid tiles) |
| TR-15 | Strategic Redeployment | Retreat for DP refund | Retreat for half DP refund |

## When a Mechanic Doesn't Exist in Holdfast

1. Map to the **closest Holdfast equivalent** if one exists (e.g.,
   Supporter slow → closest to battlefield utility).
2. If no equivalent exists, teach a **related but feasible mechanic** in that
   chapter slot (e.g., TR-8 teaches AoE variants instead of roadblocks).
3. Document the discrepancy in a `ponytail:` comment or the mechanic mapping
   table above.

## Chapter Restructuring Rules

- All TR-1 through TR-7 belong in **Chapter 0 (Prologue)**.
- TR-8 through TR-10 belong in **Chapter 1 (Episode 01)**.
- TR-11 through TR-14 belong in **Chapter 2 (Episode 02)**.
- TR-15 belongs in **Chapter 3 (Episode 03)**.
- Interleave TR stages with standard levels for pacing variety, not
  clustered at the start or end of a chapter.
- Each TR stage should come after or alongside the standard level that
  exercises its mechanic.
- Maintaining `nodePositions.length === levels.length` in chapter defs
  is required (hard crash otherwise). Generate positions dynamically:
  start at `{x: 40, y: 0}`, increment `x` by 160, alternate `y` between 0 and -30.
