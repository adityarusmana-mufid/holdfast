# Holdfast UI Layout Polish

Written against: `e4870cbc193249fffed3c3c484cbf8658b7ed5dd`

## Evidence chain

- Surface: Home, chapter/level selection, squad builder, unit picker, battle HUD, and result screens.
- Problem: The interface has one concrete picker rendering defect, a cramped unit-detail column, and inconsistent visual hierarchy between screens.
- Design evidence: `src/ui/Constants.ts`, `src/ui/Components.ts`, and scene-local layout code.
- Owner: `src/scenes/PickerScene.ts` for picker issues; shared UI primitives and scene compositions for consistency.
- Scope and affected surfaces: Picker, Squad, Home, ChapterSelect, LevelSelect, Game, and Result scenes.
- Uncertainty: Validate final spacing at 1280×720 and a narrow FIT-scaled viewport.

## Design decision

Preserve the existing technical/beveled identity and Phaser architecture. Improve consistency and hierarchy incrementally instead of replacing the Canvas UI.

## Reuse

- `makeNodeButton`, `drawUnitCard`, `drawCornerBrackets` from `src/ui/Components.ts`.
- `FONTS`, `FONT_SIZE`, `SPACING`, `COLORS`, and `BORDER_STYLE` from `src/ui/Constants.ts`.
- Exemplar: `src/scenes/PickerScene.ts` for the panel/card composition.

## Changes

1. `src/scenes/PickerScene.ts`
   - Keep filter graphics in stable local coordinates; redraw at 44×44 with matching hit areas after every filter change.
   - Reserve a footer for confirmation and make the unit-details column vertically scrollable or section-collapsible.
   - Verify filters remain visible/clickable and long trait/skill content never sits behind Confirm.
2. Shared UI composition across menu, selection, battle, and result scenes
   - Normalize header height, panel padding, action-button roles, label sizes, and status-block treatment using existing constants/helpers.
   - Preserve the current palette, terminology, and scene behavior.
   - Verify primary actions are visually dominant and secondary/status text remains readable in every scene.

## Scope

- Inherit: Existing Phaser scenes and shared UI helpers.
- Verify: Tutorial objective banner, battle card bar/DP HUD, level info panel, and result footer.
- Exclude: Engine migration, art replacement, gameplay balance, persistence, and a full UI architecture rewrite.

## Validation

- Product: Select filters, inspect units with multiple traits/skills, choose a skill, and confirm deployment.
- Interface: Check Home → Chapter → Level → Squad → Picker → Game → Result at 1280×720 and a narrow viewport.
- System: Confirm all shared controls use existing helpers/tokens; no parallel button or panel system is introduced.
- Repository: `npm test` → all tests pass; `npx tsc --noEmit` → no errors; `npm run build` → successful build.

## Stop conditions

- Stop if scrolling requires changing game state ownership or if responsive support demands a new scene architecture.

## Design documentation

- After acceptance: record the finalized UI token/component decisions in the relevant design spec; otherwise none.
