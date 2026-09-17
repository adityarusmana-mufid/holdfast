# Campaign Balance & Release — Implementation Plan

**Goal:** Turn Holdfast's existing combat, unit, and enemy systems into a coherent, testable five-chapter campaign that is ready for an itch.io demo release. This plan deliberately avoids an engine migration and full UI rewrite.

**Current baseline:** 46 registered stages, 42 units, 26 enemy configs, and 78 skills. The campaign uses only `soldier`, `trooper`, `heavy`, `drone`, and `caster`; three level files (`3-8`, `4-8`, `4-9`) are not registered. All units are available from the start and the player brings up to 12 units.

## Release Definition

The release candidate must provide 30–45 minutes of readable, stable tactical play: each enemy behavior is introduced before it is combined with others; every selectable skill has its advertised gameplay effect; every registered level is reachable and beatable with several reasonable squads; and the itch.io HTML build works in a clean browser profile.

## Phase 0 — Establish a Trustworthy Baseline

- [ ] Add a data test that loads every level registered by `CHAPTERS`, runs `validateLevelData`, verifies every `enemyType` exists in `ENEMY_CONFIGS`, and reports total enemies/types per level.
- [ ] Add a data test that fails if a JSON level is present in `levels/` but is neither registered nor explicitly listed as a draft.
- [ ] Decide the status of `3-8`, `4-8`, and `4-9`: register them only after review, otherwise move their intent to a `drafts` convention documented in the repository.
- [ ] Update `docs/inventory.md`, the roster spec, and roadmap counts to the actual 42-unit / 26-enemy baseline.

**Verification:** `npm test` passes; the generated audit lists 46 intended playable levels and no accidental orphans.

## Phase 1 — Make the Roster Honest

- [ ] Create a skill-effect audit: enumerate every `SkillEffect.type` used by `src/config/skills.ts` and map it to executable behavior in `GameScene`, `CombatSystem`, `HealingSystem`, or `SkillSystem`.
- [ ] For each missing or partial effect, choose one outcome: implement it with a test, simplify its copy/config to existing behavior, or hide the skill from the picker. Do not display non-functional choices.
- [ ] Add targeted tests for damage types, attack/DEF/ASPD buffs, block bonuses, healing target/range, displacement, status effects, shields, and skill durations/charges.
- [ ] Produce a one-line role statement for every unit: primary job, best matchup, and meaningful drawback. Tune DP, range, target rule, or cooldown to resolve duplicates before changing raw ATK/HP.
- [ ] Establish tank-counter expectations: thermal, true damage, DEF-ignore, and control must each have a practical answer to 400+ armor before tanks become standard enemies.

**Verification:** every picker-visible skill has an automated behavior test and a working in-game result; a 12-slot squad can answer aerial, armored, swarm, and sustained-damage encounters without requiring one exact loadout.

## Phase 2 — Rebuild Campaign Progression Around Lessons

Use the existing chapter order and preserve sequential unlocks. A stage should teach one thing, practice it once, then test it in a mixed composition.

| Chapter | Tactical lesson | Required content |
| --- | --- | --- |
| 0 | Deploy, block, face, and cover lanes | Scout Cars; a single gentle APC preview only after the basics |
| 1 | DP pacing and aerial priority | Rusher, Drone, Marksman; explicit anti-air lesson |
| 2 | Armor, thermal damage, healing, and terrain | Tank, Caster, Shielded Transport, Repair Vehicle |
| 3 | Threat priority and tactical utility | Breacher, Phantom, Gunship, mixed lanes and tight DP |
| 4 | Combined-arms execution | Carrier, elites, layered waves, limited deployment windows |

- [ ] Reauthor low-pressure late stages, beginning with `3-2` and `3-3`, which currently have only four and five total enemies.
- [ ] Add one clear introduction stage per behavior before it appears in a mixed encounter. Add guide text and enemy-intel copy explaining the counterplay.
- [ ] Use behavior pressure before count pressure. A repair vehicle paired with tanks is more interesting than simply adding tanks.
- [ ] Retain the existing map archetypes—corridor, L-route, zigzag, serpentine, intersection—but ensure terrain and route geometry reinforce the stage lesson.
- [ ] Keep DP, lives, and deployment limit purposeful. Use a standard baseline unless a change tests a stated decision.
- [ ] Create a per-stage balance sheet: starting DP, cap, deployment limit, lives, enemies by type/wave, intended squad responses, and known failure modes.

**Verification:** each chapter introduces, practices, and combines its mechanics; every configured enemy family is used by at least one registered stage; no late operation is easier merely because it is an old template.

## Phase 3 — Improve Battle Readability, Not the Whole UI

- [ ] Add unmistakable visual/state feedback for shields, repair pulses, buffs, stealth detection, carrier spawns, and breacher explosion radius/delay.
- [ ] Test the five highest-frequency interactions at 1280×720 and 1920×1080: selecting a card, valid/invalid placement, facing confirmation, skill activation, pause/speed, and enemy intel.
- [ ] Tighten text contrast, unit-card state, and placement feedback where player decisions occur. Keep combat and deployment in Phaser.
- [ ] Consider HTML/CSS overlays only for text-heavy settings, accessibility, or long reference content after the battle experience is stable.

**Verification:** a new player can identify what killed a unit, why an enemy survived, and what an active enemy behavior is doing without external documentation.

## Phase 4 — Balance Testing and Instrumentation

- [ ] Add a developer-only post-battle report: selected squad/skills, deployment order, DP at deploy, unit deaths, leaks, kills by enemy type, and completion time.
- [ ] Define target outcomes for each stage: clear rate for an informed first attempt, intended number of leaks, and expected key decision.
- [ ] Play every stage with at least three materially different squad archetypes; record hard locks, dominant units, dead units, and unclear failures.
- [ ] Fix the highest-leverage issue per pass: unwinnable state, unclear counterplay, mandatory single unit, then numerical tuning.

**Verification:** campaign playthrough sheets exist for all registered levels; no stage requires undocumented knowledge or a single mandatory unit/skill.

## Phase 5 — Demo Release

- [ ] Freeze scope: no new scenes, new unit subclasses, engine migration, full UI framework rewrite, progression grind, or account system.
- [ ] Produce a clean production build with `npm run build`; test it from the generated files in a fresh browser profile.
- [ ] Package the contents of the build output as an itch.io HTML ZIP with `index.html` at the archive root and only relative asset paths.
- [ ] Prepare a truthful itch.io page: concise pitch, controls, browser/fullscreen guidance, AI-code disclosure/tagging, 3–5 screenshots, and a short gameplay GIF/video.
- [ ] Run a small external playtest, triage only reproducible/high-impact feedback, then publish the demo as a clearly labelled version.

**Verification:** `npm test` and `npm run build` pass; the uploaded itch.io preview launches, plays, restarts, and returns to menus successfully.

## Delivery Order and Commit Boundaries

1. Phase 0 audit and documentation corrections.
2. Phase 1 skill correctness and unit-role audit.
3. One enemy behavior introduction and its test/level slice at a time.
4. Phase 2 chapter progression pass after the behavior slices are proven.
5. Phase 3–5 only after content is mechanically trustworthy.

Keep one concern per commit and no more than three files across two concerns. For level JSON changes, use the `designing-holdfast-levels` skill and validate all edited levels before committing.
