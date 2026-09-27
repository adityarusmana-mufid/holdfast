---
name: arknights-level-reference
description: Use whenever designing, auditing, rebalancing, or sequencing Holdfast levels—especially when the task involves map layout, route topology, terrain, enemy waves, difficulty/intensity, or campaign progression. Use alongside designing-holdfast-levels for JSON edits. Draw structural inspiration from public Arknights stage-data repositories without copying their maps, names, assets, story, or encounter scripts.
---

# Arknights Level Reference

## Purpose

Use public Arknights stage data to study how grid layout, deployability, terrain, routes, and enemy sequencing create decisions. Translate the design principle into Holdfast's own units, fixed routes, force/weight rules, and mechanical-vehicle setting.

This skill is a research lens, not an import pipeline.

## Sources

- `ArknightsAssets/ArknightsGamedata`: region-specific structured game-data snapshots.
- `yuanyan3060/ArknightsGameResource`: stage/map data plus scripts that split individual maps into JSON.
- `MaaAssistantArknights/MaaResource`: automation-oriented map grids, tile positions, and stage indexes.

Read `.opencode/explore/2026-09-27-arknights-stage-data-reference.md` for source links, available fields, and content-use boundaries.

## JSON-to-Design Translation

Do not stop at reading a map JSON. Translate its fields into an explicit design hypothesis before using it as reference.

| Arknights data field or structure | What it reveals | Holdfast design translation |
|---|---|---|
| Stage index: `code`, `stageId`, `levelId`, chapter/zone order | The stage's place in a teaching sequence | Identify the prior mechanic the player should already know and name only one new decision this level adds. |
| `mapData.width`, `mapData.height` | Spatial budget and visual density | Choose a Holdfast grid that gives the intended decision room; do not enlarge a map merely to make it feel advanced. |
| `mapData.map` plus `mapData.tiles` | The complete tile grid | Classify every Holdfast cell as route, ranged post, ground post, hazard, buff, wall, or decoration. Explain what each non-floor region enables or denies. |
| Tile `buildableType` | Ground/ranged deployment permissions | Create scarcity and competition between valuable firing posts, frontline positions, and backup positions; avoid blanket deployable rows unless the stage is deliberately a simple corridor. |
| Tile `heightType` and `tileKey` | Elevation, terrain identity, or special-tile function | Convert only the *function* into a Holdfast-supported terrain decision: exposed lane, armor support, repair support, or a legitimate shift-to-hole opportunity. Do not copy visual theme or tile arrangement. |
| `routes`, start/end positions, checkpoints | Travel order, bends, repeated proximity, and leak path | Draw the full Holdfast waypoint sequence. Mark each segment's travel time, crossover coverage, blocker position, and fallback. A bend matters only if units can exploit or be punished by it. |
| Enemy/wave records, counts, delays, and route assignment | Pressure timing and simultaneous threat relationships | Turn the record into a five-beat curve: setup, first test, new complication, combination, climax. Describe the player priority in each beat. |
| Enemy stat/behavior references | Why a wave is threatening, not just its size | Use Holdfast's actual armor, air, stealth, healing, summoning, attack range, and weight values to decide counters. Never substitute Arknights mechanics by name. |
| Stage modifiers or special mechanics | The constraint that changes normal placement | Use only if Holdfast implements an equivalent. Otherwise record it as inspiration, not a requirement. |

### Example Translation

If reference JSON shows a compact map with a bend, a few deployable high-ground cells around that bend, then a late group pairing durable ground enemies with aerial pressure, the Holdfast conclusion is **not** to reproduce the map. It is:

> Build one exposed turn with two competing ranged posts: one covers the approach and one covers the exit. Let a durable ground column demand thermal damage while aircraft demand anti-air. Make the player choose coverage allocation before the final combined wave.

The resulting Holdfast coordinates, route, units, wave counts, and terrain must be new.

## Workflow

1. Read the target Holdfast level and its immediate predecessor/successor. Inspect actual unit ranges, enemy behavior, deployment restrictions, weight, forced movement, and economy before drawing conclusions.
2. State the stage's one intended decision in plain language: for example, "hold an exposed turn against artillery" or "spend anti-air coverage without abandoning the blocker."
3. Read the relevant reference JSON fields through the table above. Write down the inferred design hypothesis, rather than retaining raw field names as the analysis.
4. Build a new Holdfast answer. Verify `covers`, `supports`, `exposedTo`, `backsUp`, and, where relevant, `shiftsInto` relationships across the whole map.
5. Describe intensity as a curve, not a raw enemy count: opening setup time, first test, new complication, combined pressure, and climax.
6. Validate level JSON and play-test the intended interaction. Record what is implementation-verified, inferred, or play-tested.

## Intensity Heuristics

- Introduce one primary relationship before combining it with another.
- Let route geometry create the question; do not rely solely on lower starting DP or larger enemy counts.
- A late wave may combine earlier threats, but should still have a readable priority order.
- Reserve major mechanic dumps and maximum mixed compositions for a finale that prior levels prepared.
- A hole, buff tile, or other terrain element is valid only when it supports a real strategy or is clearly decorative; never imply a tactic that the map cannot execute.

## Output for an Audit or Proposal

Provide:

1. Intended decision and intensity role in the campaign.
2. Whole-map topology reading: key coverage cells, exposure, support, fallback, and terrain intent.
3. Wave reading: what each wave teaches/tests and why its sequence escalates.
4. At least one credible alternative strategy and its cost or failure point.
5. Specific changes, validation, and play-test criteria.

## Boundaries

- Do not download, commit, redistribute, or convert Arknights data into Holdfast assets or levels.
- Do not reproduce stage maps, names, narrative text, or encounter scripts closely.
- Do not assume Arknights mechanics exist in Holdfast; verify the local implementation first.
