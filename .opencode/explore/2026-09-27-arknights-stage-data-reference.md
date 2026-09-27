# Arknights Stage Data as a Level-Design Reference

## Finding

Public, machine-readable Arknights stage data exists. It is suitable for analysing map topology and encounter structure; it is not a source to copy directly into Holdfast.

## Useful Sources

- [ArknightsAssets/ArknightsGamedata](https://github.com/ArknightsAssets/ArknightsGamedata): automated regional game-data snapshots.
- [yuanyan3060/ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource): game-resource collection with `levels.json`, `map.json`, and `levels_split_gen.py`. The generator exports per-stage JSON containing stage code/name, grid dimensions, tile properties, start/end positions, and map view data.
- [MaaAssistantArknights/MaaResource](https://github.com/MaaAssistantArknights/MaaResource): automation-oriented map data with an overview index and per-stage tile grids. It demonstrates a practical stage-data schema for deployment positions and special tiles.

## Fields Worth Studying

- Grid width/height; tile types; deployability; terrain and hazards.
- Enemy route start/end positions and route geometry.
- Stage identifiers and ordering, paired with stage/enemy configuration data.
- Encounter composition and timing where the corresponding level files expose it.

Raw data explains **what** a stage contains, not **why** its design works. The existing `designing-holdfast-levels` strategic-topology audit remains the required interpretation layer: identify coverage, support, exposure, fallback, terrain intent, and credible strategies.

## Holdfast Use Rule

Use sources to study patterns at an abstract level: route length, bend density, shared coverage cells, hazard setup, enemy sequencing, and chapter-level mechanic introduction. Then design a new Holdfast map around its own units, enemy weights, fixed-route implementation, and no-living-creatures constraint.

Do not import, redistribute, or closely reproduce Arknights map files, art, story text, stage names, or encounter scripts. Game data is community-extracted and game content remains owned by Hypergryph/Yostar; treat it as research reference only.
