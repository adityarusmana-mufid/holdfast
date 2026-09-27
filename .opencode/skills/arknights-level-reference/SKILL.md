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

## Workflow

1. Read the target Holdfast level and its immediate predecessor/successor. Inspect actual unit ranges, enemy behavior, deployment restrictions, weight, forced movement, and economy before drawing conclusions.
2. State the stage's one intended decision in plain language: for example, "hold an exposed turn against artillery" or "spend anti-air coverage without abandoning the blocker."
3. Use reference data only to compare abstract structure:
   - route length, bends, repeated proximity, and fallback space;
   - deployable-tile scarcity and coverage tradeoffs;
   - terrain purpose versus decoration;
   - wave order, threat introduction, concurrency, and finale composition.
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
